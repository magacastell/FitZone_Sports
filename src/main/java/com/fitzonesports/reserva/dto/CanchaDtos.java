package com.fitzonesports.reserva.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import com.fitzonesports.reserva.pricing.PricingStrategy.Precio;

public final class CanchaDtos {
    private CanchaDtos() {}
    public record TipoRequest(@NotBlank @Size(max=255) String nombre,
            @NotNull @DecimalMin("0.01") @Digits(integer=19,fraction=2) BigDecimal precioHora) {}
    public record TarifaRequest(@NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer=3,fraction=2) BigDecimal recargoPico) {}
    public record CrearCancha(@NotBlank @Size(max=255) String nombre,@NotBlank @Size(max=255) String tipo,
            @Positive Integer sedeId, Boolean activa) {}
    public record ActualizarCancha(@Pattern(regexp=".*\\S.*") @Size(max=255) String nombre,
            @Pattern(regexp=".*\\S.*") @Size(max=255) String tipo,Boolean activa) {}
    public record CrearTurno(@NotNull OffsetDateTime inicio,@NotNull OffsetDateTime fin) {}
    public record Reservar(@NotNull @Positive Integer turnoId) {}
    public record MantenimientoRequest(@NotNull OffsetDateTime inicio,OffsetDateTime fin,@NotBlank @Size(max=255) String motivo) {}
    public record CancelarRequest(@DecimalMin("50") @DecimalMax("100") BigDecimal porcentajeReembolso) {}
    public record TipoResponse(Integer id,String nombre,BigDecimal precioHora) {}
    public record CanchaResponse(Integer id,String nombre,String tipo,Integer sedeId,boolean activa,BigDecimal precioHora,BigDecimal recargoPico) {}
    public record TurnoResponse(Integer id,Integer canchaId,OffsetDateTime inicio,OffsetDateTime fin,boolean disponible,Precio precio) {}
    public record ReservaResponse(Integer id,Integer canchaId,Integer turnoId,Integer usuarioId,Integer sedeId,
            String cancha,String sede,String tipo,OffsetDateTime inicio,OffsetDateTime fin,String estado,
            BigDecimal precioAplicado,OffsetDateTime creadaEn,OffsetDateTime venceEn,Integer pagoId,String estadoPago) {}
    public record MantenimientoResponse(Integer id,Integer canchaId,OffsetDateTime inicio,OffsetDateTime fin,String motivo,boolean activo,Integer creadoPor) {}
}
