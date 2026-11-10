package com.fitzonesports.clase.dto;

import com.fitzonesports.clase.model.EstadoClase;
import java.time.OffsetDateTime;

public record ClaseResponse(
        Integer id,
        String nombre,
        Integer tipoClaseId,
        Integer instructorId,
        String instructorNombre,
        Integer sedeId,
        OffsetDateTime inicio,
        OffsetDateTime fin,
        Integer cupo,
        EstadoClase estado,
        int lugaresDisponibles) {
}
