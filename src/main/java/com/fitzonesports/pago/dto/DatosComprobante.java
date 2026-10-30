package com.fitzonesports.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Datos capturados al emitir; el documento resultante se persiste como snapshot. */
public record DatosComprobante(String numero, Integer pagoId, LocalDateTime emision,
        LocalDateTime fechaPago, String titular, String dni, String email, String plan,
        LocalDateTime inicio, LocalDateTime fin, BigDecimal total) {}
