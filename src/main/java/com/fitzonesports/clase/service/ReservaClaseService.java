package com.fitzonesports.clase.service;

import com.fitzonesports.clase.dto.PaginaResponse;
import com.fitzonesports.clase.dto.ReservaClaseResponse;
import com.fitzonesports.clase.model.ClaseGrupal;
import com.fitzonesports.clase.model.EstadoAsistencia;
import com.fitzonesports.clase.model.EstadoInscripcion;
import com.fitzonesports.clase.model.EstadoReserva;
import com.fitzonesports.clase.model.ReservaClase;
import com.fitzonesports.clase.observer.EventoClase;
import com.fitzonesports.clase.observer.PublicadorClase;
import com.fitzonesports.clase.repository.ClaseGrupalRepository;
import com.fitzonesports.clase.repository.InscripcionEsperaRepository;
import com.fitzonesports.clase.repository.ReservaClaseRepository;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** RF-07: reservas de clases (hasta 48 h antes) y cancelaciones (sin penalidad hasta 2 h antes). */
@Service
@RequiredArgsConstructor
public class ReservaClaseService {

    private static final int TAMANO_MAXIMO = 100;

    private final ClaseGrupalRepository clases;
    private final ReservaClaseRepository reservas;
    private final InscripcionEsperaRepository inscripciones;
    private final CuposClase cupos;
    private final BloqueoPorUsuario bloqueoPorUsuario;
    private final ClaseMapper mapper;
    private final UsuarioService usuarios;
    private final PublicadorClase publicador;
    private final Clock clock;

    /**
     * Con la clase bloqueada (FOR UPDATE) se cuenta el cupo y se inserta la reserva en la misma transaccion, asi dos
     * personas no se llevan el ultimo lugar. El indice unico parcial cubre el duplicado aunque falle algo mas arriba.
     */
    @Transactional
    public ReservaClaseResponse reservar(String email, Integer claseId) {
        UsuarioResponse usuario = usuarios.consultarPerfil(email);
        ClaseGrupal clase = clases.bloquear(claseId);
        ReglasClase.exigirInscripcionAbierta(clase, LocalDateTime.now(clock));

        bloqueoPorUsuario.bloquear(usuario.id());
        if (reservas.existsByClaseIdAndUsuarioIdAndEstadoReserva(claseId, usuario.id(), EstadoReserva.CONFIRMADA)) {
            throw ReglasClase.conflicto("Ya tenés una reserva en esta clase");
        }
        if (inscripciones.findByClaseIdAndUsuarioIdAndEstadoIn(claseId, usuario.id(),
                List.of(EstadoInscripcion.EN_ESPERA, EstadoInscripcion.OFERTADA)).isPresent()) {
            throw ReglasClase.conflicto("Ya estás en la lista de espera de esta clase");
        }
        if (reservas.haySolapamientoDeUsuario(usuario.id(), claseId, clase.getInicio(), clase.getFin())) {
            throw ReglasClase.conflicto("Ya tenés otra clase reservada en ese horario");
        }
        if (cupos.disponibles(clase) <= 0) {
            throw ReglasClase.conflicto("La clase no tiene lugares disponibles. Podés anotarte en la lista de espera");
        }

        ReservaClase reserva = new ReservaClase();
        reserva.setClaseId(claseId);
        reserva.setUsuarioId(usuario.id());
        reserva.setCreadaEn(LocalDateTime.now(clock));
        try {
            reserva = reservas.saveAndFlush(reserva);
        } catch (DataIntegrityViolationException e) {
            throw ReglasClase.conflicto("Ya tenés una reserva en esta clase");
        }
        return mapper.reserva(reserva, clase.getSedeId(), null);
    }

    /**
     * Titular (aunque su membresia haya vencido), recepcion de la sede o gerente. Con 2 h o mas de anticipacion es una
     * cancelacion a tiempo; con menos, tardia. Repetirla devuelve la reserva tal como quedo.
     */
    @Transactional
    public ReservaClaseResponse cancelar(String email, Integer claseId, Integer reservaId) {
        UsuarioResponse operador = usuarios.consultarPerfil(email);
        ClaseGrupal clase = clases.bloquear(claseId);
        ReservaClase reserva = reservas.findByIdAndClaseId(reservaId, claseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La reserva no existe"));
        autorizarCancelacion(operador, clase, reserva);

        if (reserva.getEstadoReserva() != EstadoReserva.CONFIRMADA) {
            return mapper.reserva(reserva, clase.getSedeId(), null);
        }
        LocalDateTime ahora = LocalDateTime.now(clock);
        if (!ahora.isBefore(clase.getInicio())) {
            throw ReglasClase.conflicto("La clase ya comenzó");
        }
        boolean aTiempo = Duration.between(ahora, clase.getInicio()).compareTo(ReglasClase.MARGEN_CANCELACION) >= 0;
        reserva.setEstadoReserva(aTiempo ? EstadoReserva.CANCELADA : EstadoReserva.CANCELADA_TARDIA);
        reserva.setEstadoAsistencia(EstadoAsistencia.NO_APLICA);
        reserva.setCanceladaEn(ahora);
        reservas.save(reserva);

        publicador.publicar(new EventoClase.CupoLiberado(claseId));
        return mapper.reserva(reserva, clase.getSedeId(), null);
    }

    /** Asistentes de una clase para recepcion (su sede) y gerente. */
    @Transactional(readOnly = true)
    public PaginaResponse<ReservaClaseResponse> listarDeClase(String email, Integer claseId, int page, int size) {
        if (page < 0 || size < 1 || size > TAMANO_MAXIMO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page debe ser 0 o mas y size entre 1 y 100");
        }
        UsuarioResponse operador = usuarios.consultarPerfil(email);
        ClaseGrupal clase = clases.findById(claseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La clase no existe"));
        if ("RECEPCIONISTA".equals(operador.rol()) && !operador.sedeId().equals(clase.getSedeId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Recepción solo opera su propia sede");
        }
        Page<ReservaClase> pagina = reservas.findByClaseId(claseId, PageRequest.of(page, size, Sort.by("id")));
        Map<Integer, UsuarioResponse> personas = usuarios
                .consultarPorIds(pagina.getContent().stream().map(ReservaClase::getUsuarioId).toList());
        List<ReservaClaseResponse> items = pagina.getContent().stream().map(r -> {
            UsuarioResponse u = personas.get(r.getUsuarioId());
            ReservaClaseResponse.Titular titular = u == null ? null
                    : new ReservaClaseResponse.Titular(u.nombre(), u.apellido());
            return mapper.reserva(r, clase.getSedeId(), titular);
        }).toList();
        return PaginaResponse.de(pagina, items);
    }

    private void autorizarCancelacion(UsuarioResponse operador, ClaseGrupal clase, ReservaClase reserva) {
        switch (operador.rol()) {
            case "GERENTE" -> {
            }
            case "RECEPCIONISTA" -> {
                if (!operador.sedeId().equals(clase.getSedeId())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Recepción solo opera su propia sede");
                }
            }
            default -> {
                if (!reserva.getUsuarioId().equals(operador.id())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo podés cancelar tus propias reservas");
                }
            }
        }
    }
}
