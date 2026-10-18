package com.fitzonesports.pago.pasarela;

import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Simulador sin red ni cargos reales: aprueba toda solicitud valida. */
@Component
@ConditionalOnProperty(name = "pagos.pasarela", havingValue = "fake", matchIfMissing = true)
public class PasarelaPagoFake implements PasarelaPago {
    @Override
    public ResultadoCobro reembolsar(SolicitudReembolso solicitud) {
        Objects.requireNonNull(solicitud,"La solicitud es obligatoria");
        return new ResultadoCobro(ResultadoCobro.Estado.APROBADO,"fake-reembolso-" + UUID.nameUUIDFromBytes(
                solicitud.claveIdempotencia().getBytes(StandardCharsets.UTF_8)),"FAKE");
    }

    @Override
    public ResultadoCobro cobrar(SolicitudCobro solicitud) {
        Objects.requireNonNull(solicitud, "La solicitud es obligatoria");
        // Una misma clave conserva su referencia incluso tras reiniciar el backend.
        // M5 debe persistir y validar la idempotencia de la operacion de negocio.
        String referencia = "fake-" + UUID.nameUUIDFromBytes(
                solicitud.claveIdempotencia().getBytes(StandardCharsets.UTF_8));
        return new ResultadoCobro(ResultadoCobro.Estado.APROBADO, referencia, "FAKE");
    }
}
