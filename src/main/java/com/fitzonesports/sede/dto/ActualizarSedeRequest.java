package com.fitzonesports.sede.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** PATCH /sedes/{id}: los campos en null no se modifican. */
public record ActualizarSedeRequest(
        @Pattern(regexp = ".*\\S.*", message = "no puede estar vacio") @Size(max = 255) String nombre,
        @Size(max = 255) String direccion,
        @Positive Integer capacidadMaxima) {
}
