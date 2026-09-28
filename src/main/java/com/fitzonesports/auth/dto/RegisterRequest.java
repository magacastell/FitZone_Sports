package com.fitzonesports.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank String nombre,
        @NotBlank String apellido,
        String dni,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password) {
}
