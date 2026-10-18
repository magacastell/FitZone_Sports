package com.fitzonesports.pago.pasarela;

public record ResultadoCobro(Estado estado, String referenciaExterna, String proveedor) {
    public enum Estado { APROBADO, RECHAZADO, PENDIENTE }
}
