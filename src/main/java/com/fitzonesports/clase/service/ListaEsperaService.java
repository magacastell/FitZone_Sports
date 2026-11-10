package com.fitzonesports.clase.service;

import com.fitzonesports.clase.dto.EntradaListaEsperaResponse;
import com.fitzonesports.clase.dto.OfertaClaseResponse;
import com.fitzonesports.clase.dto.ResponderOfertaRequest;
import com.fitzonesports.clase.model.ClaseGrupal;
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
import com.fitzonesports.clase.repository.OfertaClaseRepository;
import com.fitzonesports.clase.repository.ReservaClaseRepository;
import com.fitzonesports.membresia.service.MembresiaService;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * RF-08: lista de espera de una clase llena. Cuando se libera un lugar, el GestorListaEspera (observador) se lo ofrece
 * al primero; esta clase atiende las acciones de la persona (anotarse, salir, aceptar o rechazar) y el vencimiento.
 */
@Service
@RequiredArgsConstructor
public class ListaEsperaService {

    private static final List<EstadoInscripcion> ACTIVAS = List.of(EstadoInscripcion.EN_ESPERA, EstadoInscripcion.OFERTADA);

    private final ClaseGrupalRepository clases;
    private final ReservaClaseRepository reservas;
    private final InscripcionEsperaRepository inscripciones;
    private final OfertaClaseRepository ofertas;
    private final CuposClase cupos;
    private final BloqueoPorUsuario bloqueoPorUsuario;
    private final ClaseMapper mapper;
    private final UsuarioService usuarios;
    private final MembresiaService membresias;
    private final PublicadorClase publicador;
    private final Clock clock;

    /** Solo si la clase esta llena. El orden de llegada se asigna con la clase bloqueada, asi nunca se repite. */
    @Transactional
    public EntradaListaEsperaResponse incorporar(String email, Integer claseId) {
        UsuarioResponse usuario = usuarios.consultarPerfil(email);
        ClaseGrupal clase = clases.bloquear(claseId);
        LocalDateTime ahora = LocalDateTime.now(clock);
        ReglasClase.exigirInscripcionAbierta(clase, ahora);

        bloqueoPorUsuario.bloquear(usuario.id());
        if (reservas.existsByClaseIdAndUsuarioIdAndEstadoReserva(claseId, usuario.id(), EstadoReserva.CONFIRMADA)) {
            throw ReglasClase.conflicto("Ya tenés una reserva en esta clase");
        }
        if (inscripciones.findByClaseIdAndUsuarioIdAndEstadoIn(claseId, usuario.id(), ACTIVAS).isPresent()) {
            throw ReglasClase.conflicto("Ya estás en la lista de espera de esta clase");
        }
        if (cupos.disponibles(clase) > 0) {
            throw ReglasClase.conflicto("La clase todavía tiene lugares: reservá directamente");
        }

        InscripcionEspera inscripcion = new InscripcionEspera();
        inscripcion.setClaseId(claseId);
        inscripcion.setUsuarioId(usuario.id());
        inscripcion.setPosicion(inscripciones.ultimaPosicion(claseId) + 1);
        inscripcion.setInscriptaEn(ahora);
        try {
            inscripcion = inscripciones.saveAndFlush(inscripcion);
        } catch (DataIntegrityViolationException e) {
            throw ReglasClase.conflicto("Ya estás en la lista de espera de esta clase");
        }
        return mapper.espera(inscripcion);
    }

    /** Retira la entrada propia (y rechaza su oferta pendiente, si la tenia). Repetirlo no da error. */
    @Transactional
    public void salir(String email, Integer claseId) {
        UsuarioResponse usuario = usuarios.consultarPerfil(email);
        clases.bloquear(claseId);
        Optional<InscripcionEspera> activa = inscripciones.findByClaseIdAndUsuarioIdAndEstadoIn(claseId, usuario.id(), ACTIVAS);
        if (activa.isEmpty()) {
            return;
        }
        InscripcionEspera inscripcion = activa.get();
        boolean teniaOferta = inscripcion.getEstado() == EstadoInscripcion.OFERTADA;
        if (teniaOferta) {
            ofertas.findByInscripcionIdAndEstado(inscripcion.getId(), EstadoOferta.PENDIENTE).ifPresent(oferta -> {
                oferta.setEstado(EstadoOferta.RECHAZADA);
                oferta.setRespondidaEn(LocalDateTime.now(clock));
            });
        }
        inscripcion.setEstado(EstadoInscripcion.RETIRADA);
        inscripciones.save(inscripcion);
        if (teniaOferta) {
            publicador.publicar(new EventoClase.CupoLiberado(claseId));
        }
    }

    /** Aceptar convierte el lugar reservado por la oferta en una reserva confirmada; rechazar lo pasa al siguiente. */
    @Transactional
    public OfertaClaseResponse responder(String email, Integer claseId, Integer ofertaId,
            ResponderOfertaRequest.Respuesta respuesta) {
        UsuarioResponse operador = usuarios.consultarPerfil(email);
        ClaseGrupal clase = clases.bloquear(claseId);
        OfertaClase oferta = ofertas.findByIdAndClaseId(ofertaId, claseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La oferta no existe"));
        if (!"GERENTE".equals(operador.rol()) && !oferta.getUsuarioId().equals(operador.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La oferta corresponde a otra persona");
        }

        if (oferta.getEstado() != EstadoOferta.PENDIENTE) {
            boolean repetida = (respuesta == ResponderOfertaRequest.Respuesta.ACEPTAR && oferta.getEstado() == EstadoOferta.ACEPTADA)
                    || (respuesta == ResponderOfertaRequest.Respuesta.RECHAZAR && oferta.getEstado() == EstadoOferta.RECHAZADA);
            if (repetida) {
                return mapper.oferta(oferta, reservaDe(oferta, clase));
            }
            throw ReglasClase.conflicto("La oferta ya no está pendiente (" + oferta.getEstado() + ")");
        }
        LocalDateTime ahora = LocalDateTime.now(clock);
        if (!ahora.isBefore(oferta.getVenceEn())) {
            throw ReglasClase.conflicto("La oferta venció");
        }
        InscripcionEspera inscripcion = inscripciones.findById(oferta.getInscripcionId()).orElseThrow();

        if (respuesta == ResponderOfertaRequest.Respuesta.RECHAZAR) {
            oferta.setEstado(EstadoOferta.RECHAZADA);
            oferta.setRespondidaEn(ahora);
            inscripcion.setEstado(EstadoInscripcion.RETIRADA);
            publicador.publicar(new EventoClase.CupoLiberado(claseId));
            return mapper.oferta(oferta, null);
        }

        UsuarioResponse titular = usuarios.consultarParaAcceso(oferta.getUsuarioId());
        if (!titular.activo() || (!"GERENTE".equals(titular.rol()) && !membresias.tieneMembresiaVigente(titular.id()))) {
            throw ReglasClase.conflicto("El titular no tiene una membresía vigente");
        }
        if (clase.getEstado() == EstadoClase.CANCELADA || !ahora.isBefore(clase.getInicio())) {
            throw ReglasClase.conflicto("La clase ya no admite reservas");
        }
        bloqueoPorUsuario.bloquear(titular.id());
        if (reservas.haySolapamientoDeUsuario(titular.id(), claseId, clase.getInicio(), clase.getFin())) {
            throw ReglasClase.conflicto("Ya tenés otra clase reservada en ese horario");
        }

        ReservaClase reserva = new ReservaClase();
        reserva.setClaseId(claseId);
        reserva.setUsuarioId(titular.id());
        reserva.setCreadaEn(ahora);
        try {
            reserva = reservas.saveAndFlush(reserva);
        } catch (DataIntegrityViolationException e) {
            throw ReglasClase.conflicto("Ya tenés una reserva en esta clase");
        }
        oferta.setEstado(EstadoOferta.ACEPTADA);
        oferta.setRespondidaEn(ahora);
        oferta.setReservaId(reserva.getId());
        inscripcion.setEstado(EstadoInscripcion.ACEPTADA);
        return mapper.oferta(oferta, mapper.reserva(reserva, clase.getSedeId(), null));
    }

    @Transactional(readOnly = true)
    public List<Integer> ofertasVencidas() {
        return ofertas.idsVencidas(LocalDateTime.now(clock));
    }

    /**
     * Vence una oferta sin respuesta y pasa el lugar al siguiente. Se vuelve a leer la oferta con la clase bloqueada,
     * por si la persona la respondio justo antes.
     */
    @Transactional
    public void vencerOferta(Integer ofertaId) {
        Integer claseId = ofertas.claseIdDe(ofertaId).orElse(null);
        if (claseId == null) {
            return;
        }
        clases.bloquear(claseId);
        OfertaClase oferta = ofertas.findById(ofertaId).orElse(null);
        LocalDateTime ahora = LocalDateTime.now(clock);
        if (oferta == null || oferta.getEstado() != EstadoOferta.PENDIENTE || ahora.isBefore(oferta.getVenceEn())) {
            return;
        }
        oferta.setEstado(EstadoOferta.VENCIDA);
        oferta.setRespondidaEn(ahora);
        inscripciones.findById(oferta.getInscripcionId()).ifPresent(i -> i.setEstado(EstadoInscripcion.VENCIDA));
        publicador.publicar(new EventoClase.CupoLiberado(claseId));
    }

    private com.fitzonesports.clase.dto.ReservaClaseResponse reservaDe(OfertaClase oferta, ClaseGrupal clase) {
        if (oferta.getReservaId() == null) {
            return null;
        }
        return reservas.findById(oferta.getReservaId()).map(r -> mapper.reserva(r, clase.getSedeId(), null)).orElse(null);
    }
}
