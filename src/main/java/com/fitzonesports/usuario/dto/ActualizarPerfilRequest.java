package com.fitzonesports.usuario.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** PATCH /usuarios/me: los campos en null no se modifican. */
public record ActualizarPerfilRequest(
        @Pattern(regexp = ".*\\S.*", message = "no puede estar vacio") @Size(max = 255) String nombre,
        @Pattern(regexp = ".*\\S.*", message = "no puede estar vacio") @Size(max = 255) String apellido,
        @jakarta.validation.constraints.Null(message = "Para reemplazar la foto usá la carga de archivo") String foto) {
}
