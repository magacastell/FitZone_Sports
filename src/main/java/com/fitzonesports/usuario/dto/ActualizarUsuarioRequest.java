package com.fitzonesports.usuario.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** PATCH /usuarios/{id}: los campos en null no se modifican. */
public record ActualizarUsuarioRequest(
        @Pattern(regexp = ".*\\S.*", message = "no puede estar vacio") @Size(max = 255) String nombre,
        @Pattern(regexp = ".*\\S.*", message = "no puede estar vacio") @Size(max = 255) String apellido,
        @jakarta.validation.constraints.Null(message = "La foto se reemplaza mediante la carga de archivo del titular") String foto,
        Boolean activo) {
}
