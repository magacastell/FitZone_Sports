package com.fitzonesports.reserva.pricing;

import java.math.*;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Variante intercambiable: acumula el pico y aplica 15% sobre el resultado. */
@Component
@RequiredArgsConstructor
public class PrecioSocioStrategy implements PricingStrategy {
    private final PrecioEstandarStrategy estandar;
    public Precio calcular(BigDecimal tarifaHora, BigDecimal porcentaje, LocalDateTime inicio, LocalDateTime fin) {
        Precio precio=estandar.calcular(tarifaHora,porcentaje,inicio,fin);
        BigDecimal descuento=precio.total().multiply(new BigDecimal("0.15")).setScale(2,RoundingMode.HALF_UP);
        return new Precio(precio.base(),precio.recargo(),descuento,precio.total().subtract(descuento),"SOCIO");
    }
}
