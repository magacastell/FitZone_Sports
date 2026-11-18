package com.fitzonesports.reporte.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Cobros y devoluciones de un período [desde, hasta) en pesos argentinos. Los cobros se ubican por la fecha del pago y
 * las devoluciones por la fecha de la devolución, aunque el pago original sea de otro período; por eso el neto de un
 * período puede ser negativo.
 */
public record ReporteFinancieroResponse(
        OffsetDateTime generadoEn,
        OffsetDateTime desde,
        OffsetDateTime hasta,
        Integer sedeId,
        String moneda,
        Totales totales,
        List<PorSede> porSede,
        List<PorConcepto> porConcepto,
        List<PorDia> porDia,
        List<String> advertencias) {

    /** operacionesRechazadas es informativo: esos pagos no suman a ningún importe. */
    public record Totales(BigDecimal cobrosBrutos, BigDecimal devoluciones, BigDecimal neto, long cantidadCobros,
            long cantidadDevoluciones, long operacionesRechazadas) {
    }

    /** sedeId y sedeNombre son null en la fila "sin sede asignable" (pagos cuya sede no se puede determinar). */
    public record PorSede(Integer sedeId, String sedeNombre, BigDecimal cobrosBrutos, BigDecimal devoluciones,
            BigDecimal neto, long cantidadCobros, long cantidadDevoluciones) {
    }

    /** concepto: MEMBRESIA o RESERVA_CANCHA. */
    public record PorConcepto(String concepto, BigDecimal cobrosBrutos, BigDecimal devoluciones, BigDecimal neto,
            long cantidadCobros, long cantidadDevoluciones) {
    }

    public record PorDia(LocalDate fecha, BigDecimal cobrosBrutos, BigDecimal devoluciones, BigDecimal neto) {
    }
}
