package com.fitzonesports.usuario.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank String nombre,
        @NotBlank String apellido,
        @NotBlank String dni,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password,
        @NotNull Integer sedeId) {
}
