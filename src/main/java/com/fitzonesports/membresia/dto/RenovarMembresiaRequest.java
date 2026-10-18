package com.fitzonesports.membresia.dto;
import jakarta.validation.constraints.*;
public record RenovarMembresiaRequest(@Positive Integer planId) {}
