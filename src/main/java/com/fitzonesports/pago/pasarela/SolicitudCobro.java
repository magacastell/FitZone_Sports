package com.fitzonesports.pago.pasarela;

import java.math.BigDecimal;

/** El importe lo calcula el backend; la clave identifica un intento logico de cobro. */
public record SolicitudCobro(String claveIdempotencia, BigDecimal monto, String moneda) {
    public SolicitudCobro {
        if (claveIdempotencia == null || claveIdempotencia.isBlank()) {
            throw new IllegalArgumentException("La clave de idempotencia es obligatoria");
        }
        if (monto == null || monto.signum() <= 0 || monto.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException("El monto debe ser positivo y tener hasta dos decimales");
        }
        if (!"ARS".equals(moneda)) {
            throw new IllegalArgumentException("La moneda debe ser ARS");
        }
    }
}
