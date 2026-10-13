package com.fitzonesports.acceso.dto;

import java.time.OffsetDateTime;

/** Informativo (RF-05): superar la capacidad no bloquea ingresos. */
public record AforoResponse(Integer sedeId, int ocupacionActual, Integer capacidadMaxima, OffsetDateTime calculadoEn) {
}
