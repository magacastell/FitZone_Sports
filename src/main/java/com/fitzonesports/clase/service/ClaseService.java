package com.fitzonesports.clase.service;

import com.fitzonesports.clase.dto.ActualizarClaseRequest;
import com.fitzonesports.clase.dto.ClaseRequest;
import com.fitzonesports.clase.dto.ClaseResponse;
import com.fitzonesports.clase.dto.MotivoRequest;
import com.fitzonesports.clase.dto.PaginaResponse;
import com.fitzonesports.clase.model.ClaseGrupal;
import com.fitzonesports.clase.model.EstadoAsistencia;
import com.fitzonesports.clase.model.EstadoClase;
import com.fitzonesports.clase.model.EstadoInscripcion;
import com.fitzonesports.clase.model.EstadoOferta;
import com.fitzonesports.clase.model.EstadoReserva;
import com.fitzonesports.clase.model.InscripcionEspera;
import com.fitzonesports.clase.model.OfertaClase;
import com.fitzonesports.clase.model.ReservaClase;
import com.fitzonesports.clase.observer.EventoClase;
import com.fitzonesports.clase.observer.PublicadorClase;
import com.fitzonesports.clase.repository.ClaseGrupalRepository;
import com.fitzonesports.clase.repository.InscripcionEsperaRepository;
import com.fitzonesports.clase.repository.InstructorRepository;
import com.fitzonesports.clase.repository.OfertaClaseRepository;
import com.fitzonesports.clase.repository.ReservaClaseRepository;
import com.fitzonesports.clase.repository.TipoClaseRepository;
import com.fitzonesports.sede.service.SedeService;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** RF-06: agenda y administracion de clases por sede (crear, modificar, cancelar). */
@Service
@RequiredArgsConstructor
public class ClaseService {

    private static final String ROL_RECEPCIONISTA = "RECEPCIONISTA";
    private static final int TAMANO_MAXIMO = 100;
    private static final LocalDateTime SIN_LIMITE = LocalDateTime.of(2999, 12, 31, 23, 59);

    private final ClaseGrupalRepository clases;
    private final ReservaClaseRepository reservas;
    private final InscripcionEsperaRepository inscripciones;
    private final OfertaClaseRepository ofertas;
    private final TipoClaseRepository tipos;
    private final InstructorRepository instructores;
    private final CuposClase cupos;
    private final ClaseMapper mapper;
    private final UsuarioService usuarios;
    private final SedeService sedes;
    private final PublicadorClase publicador;
    private final Clock clock;

    /** Por defecto lista desde el comienzo del dia de hoy. Recepcion solo ve su sede. */
    @Transactional(readOnly = true)
    public PaginaResponse<ClaseResponse> listar(String email, Integer sedeId, OffsetDateTime desde,
            OffsetDateTime hasta, int page, int size) {
        if (page < 0 || size < 1 || size > TAMANO_MAXIMO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page debe ser 0 o mas y size entre 1 y 100");
        }
        UsuarioResponse usuario = usuarios.consultarPerfil(email);
        Integer sedeFiltro = sedeId;
        if (esRecepcionista(usuario)) {
            validarSedePropia(usuario, sedeId == null ? usuario.sedeId() : sedeId);
            sedeFiltro = usuario.sedeId();
        }
        LocalDateTime desdeLocal = desde != null ? mapper.aLocal(desde) : LocalDate.now(clock).atStartOfDay();
        LocalDateTime hastaLocal = hasta != null ? mapper.aLocal(hasta) : SIN_LIMITE;
        if (!hastaLocal.isAfter(desdeLocal)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "hasta debe ser posterior a desde");
        }

        Pageable pagina = PageRequest.of(page, size, Sort.by("inicio").ascending().and(Sort.by("id").ascending()));
        Page<ClaseGrupal> resultado = sedeFiltro == null
                ? clases.findByInicioGreaterThanEqualAndInicioLessThan(desdeLocal, hastaLocal, pagina)
                : clases.findBySedeIdAndInicioGreaterThanEqualAndInicioLessThan(sedeFiltro, desdeLocal, hastaLocal, pagina);
        return PaginaResponse.de(resultado, mapper.clases(resultado.getContent()));
    }

    @Transactional
    public ClaseResponse crear(String email, ClaseRequest request) {
        UsuarioResponse operador = usuarios.consultarPerfil(email);
        Integer sedeId = resolverSede(operador, request.sedeId());
        LocalDateTime inicio = mapper.aLocal(request.inicio());
        LocalDateTime fin = mapper.aLocal(request.fin());
        validarHorario(inicio, fin, true);
        tipos.findById(request.tipoClaseId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El tipo de clase no existe"));
        exigirInstructorLibre(request.instructorId(), inicio, fin, 0);

        ClaseGrupal clase = new ClaseGrupal();
        clase.setTipoClaseId(request.tipoClaseId());
        clase.setInstructorId(request.instructorId());
        clase.setSedeId(sedeId);
        clase.setInicio(inicio);
        clase.setFin(fin);
        clase.setCapacidadMaxima(request.cupo());
        return mapper.clase(clases.save(clase));
    }

    /** No se puede bajar el cupo por debajo de los lugares ya ocupados; si el cupo sube se ofrecen los nuevos lugares. */
    @Transactional
    public ClaseResponse actualizar(String email, Integer claseId, ActualizarClaseRequest request) {
        UsuarioResponse operador = usuarios.consultarPerfil(email);
        ClaseGrupal clase = clases.bloquear(claseId);
        validarSedePropia(operador, clase.getSedeId());
        exigirModificable(clase);

        LocalDateTime inicio = request.inicio() != null ? mapper.aLocal(request.inicio()) : clase.getInicio();
        LocalDateTime fin = request.fin() != null ? mapper.aLocal(request.fin()) : clase.getFin();
        boolean cambiaInicio = !inicio.equals(clase.getInicio());
        boolean cambioHorario = cambiaInicio || !fin.equals(clase.getFin());
        if (cambioHorario) {
            validarHorario(inicio, fin, cambiaInicio);
        }
        if (request.tipoClaseId() != null) {
            tipos.findById(request.tipoClaseId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El tipo de clase no existe"));
        }
        Integer instructorId = request.instructorId() != null ? request.instructorId() : clase.getInstructorId();
        if (cambioHorario || request.instructorId() != null) {
            exigirInstructorLibre(instructorId, inicio, fin, claseId);
        }

        boolean subeElCupo = false;
        if (request.cupo() != null) {
            long ocupados = cupos.ocupados(claseId);
            if (request.cupo() < ocupados) {
                throw ReglasClase.conflicto("El cupo no puede ser menor a los lugares ya ocupados (" + ocupados + ")");
            }
            subeElCupo = request.cupo() > clase.getCapacidadMaxima();
            clase.setCapacidadMaxima(request.cupo());
        }
        if (request.tipoClaseId() != null) {
            clase.setTipoClaseId(request.tipoClaseId());
        }
        clase.setInstructorId(instructorId);
        clase.setInicio(inicio);
        clase.setFin(fin);
        clases.save(clase);

        if (subeElCupo) {
            publicador.publicar(new EventoClase.CupoLiberado(claseId));
        }
        if (cambioHorario) {
            Set<Integer> afectados = personasConReservaOEspera(claseId);
            if (!afectados.isEmpty()) {
                publicador.publicar(new EventoClase.ClaseModificada(claseId, afectados));
            }
        }
        return mapper.clase(clase);
    }

    /** Cancelacion administrativa: cancela las reservas, cierra la lista de espera y avisa. No genera faltas. */
    @Transactional
    public ClaseResponse cancelar(String email, Integer claseId, MotivoRequest request) {
        UsuarioResponse operador = usuarios.consultarPerfil(email);
        ClaseGrupal clase = clases.bloquear(claseId);
        validarSedePropia(operador, clase.getSedeId());
        if (clase.getEstado() == EstadoClase.CANCELADA) {
            return mapper.clase(clase);
        }
        LocalDateTime ahora = LocalDateTime.now(clock);
        if (!clase.getFin().isAfter(ahora)) {
            throw ReglasClase.conflicto("La clase ya finalizó");
        }

        clase.setEstado(EstadoClase.CANCELADA);
        clase.setMotivoCancelacion(request.motivo().trim());
        clase.setCanceladaEn(ahora);

        Set<Integer> afectados = new LinkedHashSet<>();
        for (ReservaClase reserva : reservas.findByClaseIdAndEstadoReserva(claseId, EstadoReserva.CONFIRMADA)) {
            reserva.setEstadoReserva(EstadoReserva.CANCELADA_POR_ADMIN);
            reserva.setEstadoAsistencia(EstadoAsistencia.NO_APLICA);
            reserva.setCanceladaEn(ahora);
            afectados.add(reserva.getUsuarioId());
        }
        for (OfertaClase oferta : ofertas.findByClaseIdAndEstado(claseId, EstadoOferta.PENDIENTE)) {
            oferta.setEstado(EstadoOferta.VENCIDA);
            oferta.setRespondidaEn(ahora);
        }
        for (InscripcionEspera inscripcion : inscripciones.findByClaseIdAndEstadoIn(claseId,
                List.of(EstadoInscripcion.EN_ESPERA, EstadoInscripcion.OFERTADA))) {
            inscripcion.setEstado(EstadoInscripcion.RETIRADA);
            afectados.add(inscripcion.getUsuarioId());
        }
        clases.save(clase);
        publicador.publicar(new EventoClase.ClaseCancelada(claseId, clase.getMotivoCancelacion(), afectados));
        return mapper.clase(clase);
    }

    private Set<Integer> personasConReservaOEspera(Integer claseId) {
        Set<Integer> personas = new LinkedHashSet<>();
        reservas.findByClaseIdAndEstadoReserva(claseId, EstadoReserva.CONFIRMADA)
                .forEach(r -> personas.add(r.getUsuarioId()));
        inscripciones.findByClaseIdAndEstadoIn(claseId, List.of(EstadoInscripcion.EN_ESPERA, EstadoInscripcion.OFERTADA))
                .forEach(i -> personas.add(i.getUsuarioId()));
        return personas;
    }

    /** Bloquea al instructor y comprueba que no tenga otra clase que se superponga. */
    private void exigirInstructorLibre(Integer instructorId, LocalDateTime inicio, LocalDateTime fin, Integer claseId) {
        instructores.bloquearPorId(instructorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El instructor no existe"));
        if (clases.haySolapamientoDeInstructor(instructorId, inicio, fin, claseId)) {
            throw ReglasClase.conflicto("El instructor ya tiene una clase en ese horario");
        }
    }

    private void validarHorario(LocalDateTime inicio, LocalDateTime fin, boolean exigirFuturo) {
        if (!fin.isAfter(inicio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El fin debe ser posterior al inicio");
        }
        if (exigirFuturo && !inicio.isAfter(LocalDateTime.now(clock))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La clase debe comenzar en el futuro");
        }
    }

    private void exigirModificable(ClaseGrupal clase) {
        if (clase.getEstado() == EstadoClase.CANCELADA) {
            throw ReglasClase.conflicto("La clase está cancelada");
        }
        if (!clase.getFin().isAfter(LocalDateTime.now(clock))) {
            throw ReglasClase.conflicto("La clase ya finalizó");
        }
    }

    private Integer resolverSede(UsuarioResponse operador, Integer sedeSolicitada) {
        if (esRecepcionista(operador)) {
            if (sedeSolicitada != null) {
                validarSedePropia(operador, sedeSolicitada);
            }
            return operador.sedeId();
        }
        if (sedeSolicitada == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indicá la sede de la clase");
        }
        if (!sedes.existe(sedeSolicitada)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La sede no existe");
        }
        return sedeSolicitada;
    }

    private void validarSedePropia(UsuarioResponse operador, Integer sedeId) {
        if (esRecepcionista(operador) && !operador.sedeId().equals(sedeId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Recepción solo opera su propia sede");
        }
    }

    private boolean esRecepcionista(UsuarioResponse usuario) {
        return ROL_RECEPCIONISTA.equals(usuario.rol());
    }
}
