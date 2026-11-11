package com.fitzonesports.pago.pasarela;

import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Simulador sin red: DNI de pruebas rechazado configurable, resto aprobado. */
@Component
@ConditionalOnProperty(name = "pagos.pasarela", havingValue = "fake", matchIfMissing = true)
public class PasarelaPagoFake implements PasarelaPago {
    @org.springframework.beans.factory.annotation.Value("${pagos.fake.dni-rechazado:99999999}")
    private String dniRechazado="99999999";
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
        return new ResultadoCobro(dniRechazado.equals(solicitud.dni()) ? ResultadoCobro.Estado.RECHAZADO : ResultadoCobro.Estado.APROBADO, referencia, "FAKE");
    }
}
