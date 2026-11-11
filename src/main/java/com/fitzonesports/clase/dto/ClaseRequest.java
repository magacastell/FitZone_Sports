package com.fitzonesports.clase.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

/** Recepcion no envia sedeId (se toma de su usuario); el gerente debe indicarlo. El nombre sale del tipo de clase. */
public record ClaseRequest(
        @NotNull Integer tipoClaseId,
        @NotNull Integer instructorId,
        Integer sedeId,
        @NotNull OffsetDateTime inicio,
        @NotNull OffsetDateTime fin,
        @NotNull @Min(1) @Max(1000) Integer cupo) {
}
