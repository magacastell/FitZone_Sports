package com.fitzonesports.pago.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ReembolsoResponse(Integer pagoId, String estado, BigDecimal monto, String moneda,
        OffsetDateTime fechaReembolso, String referenciaExterna) {}
