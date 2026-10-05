package com.fitzonesports.sede.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** POST /sedes. */
public record SedeRequest(
        @NotBlank @Size(max = 255) String nombre,
        @Size(max = 255) String direccion,
        @NotNull @Positive Integer capacidadMaxima) {
}
