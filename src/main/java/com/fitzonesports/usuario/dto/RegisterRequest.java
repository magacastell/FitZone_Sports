package com.fitzonesports.usuario.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 255) String nombre,
        @NotBlank @Size(max = 255) String apellido,
        @NotBlank @Size(max = 255) String dni,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8) String password) {
}
