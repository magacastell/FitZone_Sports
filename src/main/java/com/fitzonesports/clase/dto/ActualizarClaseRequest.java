package com.fitzonesports.clase.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.OffsetDateTime;

/** Campo omitido o null significa no modificar. */
public record ActualizarClaseRequest(
        Integer tipoClaseId,
        Integer instructorId,
        OffsetDateTime inicio,
        OffsetDateTime fin,
        @Min(1) @Max(1000) Integer cupo) {
}
