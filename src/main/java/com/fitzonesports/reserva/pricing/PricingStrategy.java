package com.fitzonesports.reserva.pricing;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** El contexto se deriva del dominio; nunca de un precio o condicion de socio enviados por el cliente. */
public interface PricingStrategy {
    Precio calcular(BigDecimal tarifaHora, BigDecimal recargoPorcentaje, LocalDateTime inicio, LocalDateTime fin);
    record Precio(BigDecimal base, BigDecimal recargo, BigDecimal descuento, BigDecimal total, String estrategia) {}
}
