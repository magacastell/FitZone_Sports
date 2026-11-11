package com.fitzonesports.clase.observer;

import java.time.LocalDateTime;
import java.util.Collection;

/** Hechos de una clase que otros componentes pueden querer atender. */
public sealed interface EventoClase {

    /** Se libero un lugar (cancelacion, oferta rechazada o vencida, cupo ampliado). */
    record CupoLiberado(Integer claseId) implements EventoClase {
    }

    /** Se le ofrecio el lugar liberado al primero de la lista de espera. */
    record OfertaGenerada(Integer ofertaId, Integer claseId, Integer usuarioId, LocalDateTime venceEn)
            implements EventoClase {
    }

    record ClaseModificada(Integer claseId, Collection<Integer> usuariosAfectados) implements EventoClase {
    }

    record ClaseCancelada(Integer claseId, String motivo, Collection<Integer> usuariosAfectados)
            implements EventoClase {
    }
}
