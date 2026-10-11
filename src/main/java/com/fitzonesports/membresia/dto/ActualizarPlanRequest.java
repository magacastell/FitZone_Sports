package com.fitzonesports.membresia.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Omitido o null significa no modificar. */
public record ActualizarPlanRequest(
        @Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL) @Size(max = 255) String nombre,
        Integer duracionMeses,
        @DecimalMin(value = "0", inclusive = false) @Digits(integer = 19, fraction = 2) BigDecimal precio,
        Boolean activo) {
}
