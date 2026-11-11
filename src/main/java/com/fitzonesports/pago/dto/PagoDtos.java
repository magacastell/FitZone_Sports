package com.fitzonesports.pago.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public final class PagoDtos {
    private PagoDtos() {}
    public record CrearPagoRequest(@NotBlank @Pattern(regexp="RESERVA_CANCHA") String concepto,@NotNull @Positive Integer recursoId) {}
    public record PagoResponse(Integer id,Integer usuarioId,String concepto,Integer recursoId,BigDecimal monto,
            String moneda,String estado,OffsetDateTime fecha,String referenciaExterna,BigDecimal montoReembolsado) {}
}
