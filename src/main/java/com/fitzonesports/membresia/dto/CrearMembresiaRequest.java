package com.fitzonesports.membresia.dto;
import jakarta.validation.constraints.*;
public record CrearMembresiaRequest(@NotNull @Positive Integer planId, @Positive Integer sedeId) {}
