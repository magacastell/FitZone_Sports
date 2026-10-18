package com.fitzonesports.pago.pasarela;

/** Puerto de M5: la pasarela procesa el cobro, pero no activa membresias. */
public interface PasarelaPago {
    ResultadoCobro cobrar(SolicitudCobro solicitud);
    ResultadoCobro reembolsar(SolicitudReembolso solicitud);
}
