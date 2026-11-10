package com.fitzonesports.clase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TipoClaseRequest(@NotBlank @Size(max = 255) String nombre) {
}
