package com.fitzonesports.membresia.dto;
import jakarta.validation.constraints.*;
public record ActualizarEstadoMembresiaRequest(@NotNull Accion accion, @NotBlank @Size(max=500) String motivo) {
    public enum Accion { SUSPENDER, REACTIVAR }
}
