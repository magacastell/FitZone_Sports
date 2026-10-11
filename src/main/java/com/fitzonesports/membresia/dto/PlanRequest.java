package com.fitzonesports.membresia.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record PlanRequest(
        @NotBlank @Size(max = 255) String nombre,
        @NotNull Integer duracionMeses,
        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 19, fraction = 2) BigDecimal precio) {
}
