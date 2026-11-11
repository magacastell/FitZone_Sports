package com.fitzonesports.reserva;

import com.fitzonesports.reserva.pricing.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PrecioCanchaTest {
    private final PrecioEstandarStrategy estandar=new PrecioEstandarStrategy();
    @Test void calculaEstandarPicoSocioYCombinacion() {
        var dia=LocalDateTime.of(2026,11,12,18,0);var tarifa=new BigDecimal("10000.00");var recargo=new BigDecimal("20");
        assertEquals(new BigDecimal("10000.00"),estandar.calcular(tarifa,recargo,dia,dia.plusHours(1)).total());
        assertEquals(new BigDecimal("12000.00"),estandar.calcular(tarifa,recargo,dia.plusHours(1),dia.plusHours(2)).total());
        var socio=new PrecioSocioStrategy(estandar);
        assertEquals(new BigDecimal("8500.00"),socio.calcular(tarifa,recargo,dia,dia.plusHours(1)).total());
        assertEquals(new BigDecimal("10200.00"),socio.calcular(tarifa,recargo,dia.plusHours(1),dia.plusHours(2)).total());
    }
    @Test void prorrateaLosMinutosPicoYSuLimiteSuperiorEsExclusivo() {
        var dia=LocalDateTime.of(2026,11,12,18,30);var tarifa=new BigDecimal("10000");var recargo=new BigDecimal("20");
        assertEquals(new BigDecimal("11000.00"),estandar.calcular(tarifa,recargo,dia,dia.plusHours(1)).total());
        dia=dia.withHour(20);
        assertEquals(new BigDecimal("11000.00"),estandar.calcular(tarifa,recargo,dia,dia.plusHours(1)).total());
        dia=dia.withHour(21).withMinute(0);
        assertEquals(new BigDecimal("10000.00"),estandar.calcular(tarifa,recargo,dia,dia.plusHours(1)).total());
    }
}
