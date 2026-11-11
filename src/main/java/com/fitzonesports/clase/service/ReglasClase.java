package com.fitzonesports.clase.service;

import com.fitzonesports.clase.model.ClaseGrupal;
import com.fitzonesports.clase.model.EstadoClase;
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Plazos de M3 definidos por el enunciado y la Definicion de Modulos. */
public final class ReglasClase {

    /** Reservas e inscripcion a la lista de espera cierran 48 h antes del inicio (RF-07). */
    public static final Duration CIERRE_RESERVAS = Duration.ofHours(48);

    /** Cancelando con 2 h o mas de anticipacion no hay penalidad; con menos, la cancelacion es tardia (RF-07). */
    public static final Duration MARGEN_CANCELACION = Duration.ofHours(2);

    /** Tiempo que tiene el primero de la lista para aceptar el lugar que se libero (RF-08). */
    public static final Duration VIGENCIA_OFERTA = Duration.ofHours(8);

    /** Desde 1 h antes del inicio ya no se ofrecen lugares liberados. */
    public static final Duration LIMITE_OFERTAS = Duration.ofHours(1);

    private ReglasClase() {
    }

    public static ResponseStatusException conflicto(String mensaje) {
        return new ResponseStatusException(HttpStatus.CONFLICT, mensaje);
    }

    /** Reservar o anotarse en la lista de espera: la clase no puede estar cancelada ni a menos de 48 h de empezar. */
    public static void exigirInscripcionAbierta(ClaseGrupal clase, LocalDateTime ahora) {
        if (clase.getEstado() == EstadoClase.CANCELADA) {
            throw conflicto("La clase fue cancelada");
        }
        if (!ahora.isBefore(clase.getInicio().minus(CIERRE_RESERVAS))) {
            throw conflicto("Las reservas y la lista de espera cierran 48 horas antes de la clase");
        }
    }
}
