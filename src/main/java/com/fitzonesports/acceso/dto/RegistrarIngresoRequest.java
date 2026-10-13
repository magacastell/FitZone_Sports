package com.fitzonesports.acceso.dto;

import jakarta.validation.constraints.NotBlank;

/** Recepcion no envia sedeId (se toma de su usuario); el gerente debe indicarlo. */
public record RegistrarIngresoRequest(@NotBlank String qrToken, Integer sedeId) {
}
