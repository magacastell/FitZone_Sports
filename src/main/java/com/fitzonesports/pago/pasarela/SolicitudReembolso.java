package com.fitzonesports.pago.pasarela;

import java.math.BigDecimal;

public record SolicitudReembolso(String claveIdempotencia, String referenciaCobro, BigDecimal monto) {
    public SolicitudReembolso {
        new SolicitudCobro(claveIdempotencia,monto,"ARS");
        if (referenciaCobro == null || referenciaCobro.isBlank()) throw new IllegalArgumentException("Falta la referencia del cobro");
    }
}
