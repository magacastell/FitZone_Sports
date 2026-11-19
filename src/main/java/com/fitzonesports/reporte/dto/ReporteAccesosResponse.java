package com.fitzonesports.reporte.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Accesos históricos (ingresos registrados en la base central) de un período [desde, hasta).
 * No es el aforo actual ni una ocupación en vivo: cuenta ingresos ya registrados.
 */
public record ReporteAccesosResponse(
        OffsetDateTime generadoEn,
        OffsetDateTime desde,
        OffsetDateTime hasta,
        Integer sedeId,
        Resumen resumen,
        List<PorSede> porSede,
        List<PorDia> porDia,
        List<String> advertencias) {

    /** permanenciaMediaMinutos es null si ningún ingreso del período tiene salida registrada. */
    public record Resumen(long totalIngresos, long usuariosUnicos, long ingresosOffline, long ingresosSinSalida,
            BigDecimal permanenciaMediaMinutos) {
    }

    /** picoSimultaneo: máximo de personas dentro a la vez entre los ingresos del período; porcentajePico sobre la capacidad. */
    public record PorSede(Integer sedeId, String sedeNombre, int capacidadMaxima, long totalIngresos,
            long usuariosUnicos, int picoSimultaneo, BigDecimal porcentajePico, BigDecimal permanenciaMediaMinutos) {
    }

    /** Día calendario argentino; los días sin ingresos figuran con cero para que la serie sea continua. */
    public record PorDia(LocalDate fecha, long totalIngresos, long usuariosUnicos) {
    }
}
