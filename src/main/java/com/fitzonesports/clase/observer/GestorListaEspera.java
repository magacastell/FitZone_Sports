package com.fitzonesports.clase.observer;

import com.fitzonesports.clase.model.ClaseGrupal;
import com.fitzonesports.clase.model.EstadoClase;
import com.fitzonesports.clase.model.EstadoInscripcion;
import com.fitzonesports.clase.model.InscripcionEspera;
import com.fitzonesports.clase.model.OfertaClase;
import com.fitzonesports.clase.repository.ClaseGrupalRepository;
import com.fitzonesports.clase.repository.InscripcionEsperaRepository;
import com.fitzonesports.clase.repository.OfertaClaseRepository;
import com.fitzonesports.clase.service.CuposClase;
import com.fitzonesports.clase.service.ReglasClase;
import jakarta.annotation.PostConstruct;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Observador de CupoLiberado: ofrece cada lugar libre al primero de la lista de espera (RF-08). Corre dentro de
 * la transaccion que libero el lugar, con la clase bloqueada, y avisa de cada oferta publicando OfertaGenerada.
 */
@Component
@RequiredArgsConstructor
public class GestorListaEspera implements ObservadorClase {

    private final ClaseGrupalRepository clases;
    private final InscripcionEsperaRepository inscripciones;
    private final OfertaClaseRepository ofertas;
    private final CuposClase cupos;
    private final PublicadorClase publicador;
    private final Clock clock;

    @PostConstruct
    void suscribirse() {
        publicador.suscribir(this);
    }

    @Override
    public void actualizar(EventoClase evento) {
        if (evento instanceof EventoClase.CupoLiberado liberado) {
            ofrecerLugares(liberado.claseId());
        }
    }

    private void ofrecerLugares(Integer claseId) {
        ClaseGrupal clase = clases.findById(claseId).orElse(null);
        if (clase == null || clase.getEstado() != EstadoClase.PROGRAMADA) {
            return;
        }
        LocalDateTime ahora = LocalDateTime.now(clock);
        LocalDateTime limite = clase.getInicio().minus(ReglasClase.LIMITE_OFERTAS);
        if (!ahora.isBefore(limite)) {
            return;
        }
        LocalDateTime vence = ahora.plus(ReglasClase.VIGENCIA_OFERTA);
        if (vence.isAfter(limite)) {
            vence = limite;
        }

        long libres = cupos.disponibles(clase);
        while (libres > 0) {
            Optional<InscripcionEspera> siguiente = inscripciones
                    .findFirstByClaseIdAndEstadoOrderByPosicionAsc(claseId, EstadoInscripcion.EN_ESPERA);
            if (siguiente.isEmpty()) {
                return;
            }
            InscripcionEspera inscripcion = siguiente.get();
            OfertaClase oferta = new OfertaClase();
            oferta.setClaseId(claseId);
            oferta.setUsuarioId(inscripcion.getUsuarioId());
            oferta.setInscripcionId(inscripcion.getId());
            oferta.setCreadaEn(ahora);
            oferta.setVenceEn(vence);
            oferta = ofertas.save(oferta);

            inscripcion.setEstado(EstadoInscripcion.OFERTADA);
            inscripcion.setNotificado((short) 1);
            inscripciones.save(inscripcion);

            publicador.publicar(new EventoClase.OfertaGenerada(oferta.getId(), claseId, inscripcion.getUsuarioId(), vence));
            libres--;
        }
    }
}
