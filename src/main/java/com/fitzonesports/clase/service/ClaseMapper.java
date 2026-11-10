package com.fitzonesports.clase.service;

import com.fitzonesports.clase.dto.ClaseResponse;
import com.fitzonesports.clase.dto.EntradaListaEsperaResponse;
import com.fitzonesports.clase.dto.OfertaClaseResponse;
import com.fitzonesports.clase.dto.ReservaClaseResponse;
import com.fitzonesports.clase.model.ClaseGrupal;
import com.fitzonesports.clase.model.EstadoClase;
import com.fitzonesports.clase.model.EstadoReserva;
import com.fitzonesports.clase.model.InscripcionEspera;
import com.fitzonesports.clase.model.Instructor;
import com.fitzonesports.clase.model.OfertaClase;
import com.fitzonesports.clase.model.ReservaClase;
import com.fitzonesports.clase.model.TipoClase;
import com.fitzonesports.clase.repository.InstructorRepository;
import com.fitzonesports.clase.repository.TipoClaseRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Arma las respuestas de la API (nunca se exponen las entidades) y convierte entre la zona de la sede y el offset. */
@Component
@RequiredArgsConstructor
public class ClaseMapper {

    private final TipoClaseRepository tipos;
    private final InstructorRepository instructores;
    private final CuposClase cupos;
    private final Clock clock;

    public OffsetDateTime aOffset(LocalDateTime momento) {
        return momento == null ? null : momento.atZone(clock.getZone()).toOffsetDateTime();
    }

    public LocalDateTime aLocal(OffsetDateTime momento) {
        return momento.atZoneSameInstant(clock.getZone()).toLocalDateTime();
    }

    /** Una clase programada cuyo horario ya termino se muestra como FINALIZADA, sin necesidad de un proceso que la cierre. */
    public EstadoClase estadoEfectivo(ClaseGrupal clase, LocalDateTime ahora) {
        if (clase.getEstado() == EstadoClase.PROGRAMADA && !clase.getFin().isAfter(ahora)) {
            return EstadoClase.FINALIZADA;
        }
        return clase.getEstado();
    }

    public ClaseResponse clase(ClaseGrupal clase) {
        return clases(List.of(clase)).get(0);
    }

    public List<ClaseResponse> clases(Collection<ClaseGrupal> lista) {
        if (lista.isEmpty()) {
            return List.of();
        }
        List<Integer> ids = lista.stream().map(ClaseGrupal::getId).toList();
        Map<Integer, String> nombresDeTipo = tipos.findAllById(lista.stream().map(ClaseGrupal::getTipoClaseId).toList())
                .stream().collect(Collectors.toMap(TipoClase::getId, TipoClase::getNombre));
        Map<Integer, Instructor> instructoresPorId = instructores
                .findAllById(lista.stream().map(ClaseGrupal::getInstructorId).toList())
                .stream().collect(Collectors.toMap(Instructor::getId, Function.identity()));
        Map<Integer, Long> ocupados = cupos.ocupadosPorClase(ids);
        LocalDateTime ahora = LocalDateTime.now(clock);

        return lista.stream().map(c -> {
            EstadoClase estado = estadoEfectivo(c, ahora);
            long libres = estado == EstadoClase.PROGRAMADA
                    ? Math.max(0, c.getCapacidadMaxima() - ocupados.getOrDefault(c.getId(), 0L)) : 0;
            Instructor instructor = instructoresPorId.get(c.getInstructorId());
            return new ClaseResponse(c.getId(), nombresDeTipo.getOrDefault(c.getTipoClaseId(), "Clase"),
                    c.getTipoClaseId(), c.getInstructorId(),
                    instructor == null ? null : instructor.getNombre() + " " + instructor.getApellido(),
                    c.getSedeId(), aOffset(c.getInicio()), aOffset(c.getFin()), c.getCapacidadMaxima(), estado,
                    (int) libres);
        }).toList();
    }

    public ReservaClaseResponse reserva(ReservaClase reserva, Integer sedeId, ReservaClaseResponse.Titular titular) {
        String estado = reserva.getEstadoReserva() == EstadoReserva.CONFIRMADA
                ? switch (reserva.getEstadoAsistencia()) {
                    case ASISTIO -> "ASISTIDA";
                    case AUSENTE -> "AUSENTE";
                    default -> "CONFIRMADA";
                }
                : "CANCELADA";
        String tipoCancelacion = switch (reserva.getEstadoReserva()) {
            case CANCELADA -> "A_TIEMPO";
            case CANCELADA_TARDIA -> "TARDIA";
            default -> "NO_APLICA";
        };
        boolean cuentaComoFalta = reserva.getEstadoReserva() == EstadoReserva.CANCELADA_TARDIA
                || reserva.getEstadoAsistencia() == com.fitzonesports.clase.model.EstadoAsistencia.AUSENTE;
        return new ReservaClaseResponse(reserva.getId(), reserva.getClaseId(), reserva.getUsuarioId(), sedeId, estado,
                aOffset(reserva.getCreadaEn()), aOffset(reserva.getCanceladaEn()), tipoCancelacion, cuentaComoFalta,
                titular);
    }

    public EntradaListaEsperaResponse espera(InscripcionEspera inscripcion) {
        return new EntradaListaEsperaResponse(inscripcion.getId(), inscripcion.getClaseId(), inscripcion.getUsuarioId(),
                aOffset(inscripcion.getInscriptaEn()), inscripcion.getPosicion(), inscripcion.getEstado());
    }

    public OfertaClaseResponse oferta(OfertaClase oferta, ReservaClaseResponse reserva) {
        return new OfertaClaseResponse(oferta.getId(), oferta.getClaseId(), oferta.getUsuarioId(),
                aOffset(oferta.getCreadaEn()), aOffset(oferta.getVenceEn()), oferta.getEstado(), reserva);
    }
}
