package com.fitzonesports.usuario.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** PATCH /usuarios/{id}: los campos en null no se modifican. */
public record ActualizarUsuarioRequest(
        @Pattern(regexp = ".*\\S.*", message = "no puede estar vacio") @Size(max = 255) String nombre,
        @Pattern(regexp = ".*\\S.*", message = "no puede estar vacio") @Size(max = 255) String apellido,
        @Size(max = 255) String foto,
        Boolean activo) {
}
