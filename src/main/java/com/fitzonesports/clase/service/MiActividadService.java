package com.fitzonesports.clase.service;

import com.fitzonesports.clase.dto.ClaseResponse;
import com.fitzonesports.clase.dto.MiActividadResponse;
import com.fitzonesports.clase.model.ClaseGrupal;
import com.fitzonesports.clase.model.EstadoClase;
import com.fitzonesports.clase.model.EstadoInscripcion;
import com.fitzonesports.clase.model.EstadoOferta;
import com.fitzonesports.clase.model.EstadoReserva;
import com.fitzonesports.clase.model.InscripcionEspera;
import com.fitzonesports.clase.model.OfertaClase;
import com.fitzonesports.clase.model.ReservaClase;
import com.fitzonesports.clase.repository.ClaseGrupalRepository;
import com.fitzonesports.clase.repository.InscripcionEsperaRepository;
import com.fitzonesports.clase.repository.OfertaClaseRepository;
import com.fitzonesports.clase.repository.ReservaClaseRepository;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Lo que el usuario tiene en curso en clases, para que la pantalla muestre sus botones segun su situacion. */
@Service
@RequiredArgsConstructor
public class MiActividadService {

    private final ClaseGrupalRepository clases;
    private final ReservaClaseRepository reservas;
    private final InscripcionEsperaRepository inscripciones;
    private final OfertaClaseRepository ofertas;
    private final ClaseMapper mapper;
    private final UsuarioService usuarios;
    private final Clock clock;

    @Transactional(readOnly = true)
    public MiActividadResponse consultar(String email) {
        UsuarioResponse usuario = usuarios.consultarPerfil(email);
        LocalDateTime ahora = LocalDateTime.now(clock);

        List<ReservaClase> misReservas = reservas.findByUsuarioIdAndEstadoReservaOrderByIdDesc(usuario.id(), EstadoReserva.CONFIRMADA);
        List<InscripcionEspera> miEspera = inscripciones.findByUsuarioIdAndEstadoInOrderByIdDesc(usuario.id(),
                List.of(EstadoInscripcion.EN_ESPERA, EstadoInscripcion.OFERTADA));
        List<OfertaClase> misOfertas = ofertas.findByUsuarioIdAndEstadoOrderByIdDesc(usuario.id(), EstadoOferta.PENDIENTE)
                .stream().filter(o -> o.getVenceEn().isAfter(ahora)).toList();

        Set<Integer> ids = new HashSet<>();
        misReservas.forEach(r -> ids.add(r.getClaseId()));
        miEspera.forEach(i -> ids.add(i.getClaseId()));
        misOfertas.forEach(o -> ids.add(o.getClaseId()));
        Map<Integer, ClaseGrupal> entidades = clases.findAllById(ids).stream()
                .collect(Collectors.toMap(ClaseGrupal::getId, Function.identity()));
        Map<Integer, ClaseResponse> vistas = mapper.clases(entidades.values()).stream()
                .collect(Collectors.toMap(ClaseResponse::id, Function.identity()));

        List<MiActividadResponse.ReservaConClase> reservasVigentes = misReservas.stream()
                .filter(r -> vigente(entidades.get(r.getClaseId()), ahora))
                .map(r -> new MiActividadResponse.ReservaConClase(
                        mapper.reserva(r, entidades.get(r.getClaseId()).getSedeId(), null), vistas.get(r.getClaseId())))
                .toList();
        List<MiActividadResponse.EsperaConClase> espera = miEspera.stream()
                .filter(i -> vigente(entidades.get(i.getClaseId()), ahora))
                .map(i -> new MiActividadResponse.EsperaConClase(mapper.espera(i), vistas.get(i.getClaseId())))
                .toList();
        List<MiActividadResponse.OfertaConClase> pendientes = misOfertas.stream()
                .filter(o -> vigente(entidades.get(o.getClaseId()), ahora))
                .map(o -> new MiActividadResponse.OfertaConClase(mapper.oferta(o, null), vistas.get(o.getClaseId())))
                .toList();
        return new MiActividadResponse(reservasVigentes, espera, pendientes);
    }

    private boolean vigente(ClaseGrupal clase, LocalDateTime ahora) {
        return clase != null && clase.getEstado() == EstadoClase.PROGRAMADA && clase.getFin().isAfter(ahora);
    }
}
