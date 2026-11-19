package com.fitzonesports.acceso.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record MovimientoAccesoResponse(Integer accesoId, String tipo, String sede,
        OffsetDateTime instante, String titular) {
    public record Seguimiento(OffsetDateTime inicio, List<MovimientoAccesoResponse> movimientos) {}
}
