package com.fitzonesports.membresia.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record MembresiaResponse(Integer id, Integer usuarioId, Integer sedeId, Integer planId,
        String estado, boolean renovacionAutomatica, Periodo periodoVigente, List<Periodo> periodos) {
    public record Periodo(Integer id, Integer planId, String nombrePlan, Integer duracionMeses,
            BigDecimal precio, OffsetDateTime inicio, OffsetDateTime fin, Integer pagoId, String estado) {}
}
