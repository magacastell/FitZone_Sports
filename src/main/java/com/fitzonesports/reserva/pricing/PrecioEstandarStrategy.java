package com.fitzonesports.reserva.pricing;

import java.math.*;
import java.time.*;
import org.springframework.stereotype.Component;

@Component
public class PrecioEstandarStrategy implements PricingStrategy {
    public Precio calcular(BigDecimal tarifaHora, BigDecimal porcentaje, LocalDateTime inicio, LocalDateTime fin) {
        BigDecimal base=tarifaHora.multiply(BigDecimal.valueOf(Duration.between(inicio,fin).toMinutes())).divide(BigDecimal.valueOf(60),2,RoundingMode.HALF_UP);
        var picoInicio=inicio.toLocalDate().atTime(19,0);
        var picoFin=inicio.toLocalDate().atTime(21,0);
        var desde=inicio.isAfter(picoInicio)?inicio:picoInicio;
        var hasta=fin.isBefore(picoFin)?fin:picoFin;
        long minutos=Math.max(0,Duration.between(desde,hasta).toMinutes());
        BigDecimal recargo=tarifaHora.multiply(BigDecimal.valueOf(minutos)).multiply(porcentaje)
                .divide(BigDecimal.valueOf(6000),2,RoundingMode.HALF_UP);
        return new Precio(base,recargo,BigDecimal.ZERO.setScale(2),base.add(recargo),"ESTANDAR");
    }
}
