package com.fitzonesports.pago;

import com.fitzonesports.pago.pasarela.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PasarelaPagoFakeTest {
    private final PasarelaPago pasarela = new PasarelaPagoFake();

    @Test
    void apruebaCobroYConservaReferenciaEntreInstancias() {
        var solicitud = new SolicitudCobro("membresia-1-periodo-1", new BigDecimal("15000.50"), "ARS");
        var resultado = pasarela.cobrar(solicitud);
        assertEquals(ResultadoCobro.Estado.APROBADO, resultado.estado());
        assertEquals("FAKE", resultado.proveedor());
        assertTrue(resultado.referenciaExterna().startsWith("fake-"));
        assertEquals(resultado, new PasarelaPagoFake().cobrar(solicitud));
        assertNotEquals(resultado.referenciaExterna(), pasarela.cobrar(
                new SolicitudCobro("membresia-1-periodo-2", solicitud.monto(), "ARS")).referenciaExterna());
    }

    @Test
    void rechazaSolicitudesInvalidasAntesDeSimularCobro() {
        for (var monto : new BigDecimal[] {BigDecimal.ZERO, BigDecimal.ONE.negate(), new BigDecimal("1.001")}) {
            assertThrows(IllegalArgumentException.class, () -> new SolicitudCobro("clave", monto, "ARS"));
        }
        assertThrows(IllegalArgumentException.class, () -> new SolicitudCobro(" ", BigDecimal.TEN, "ARS"));
        assertThrows(IllegalArgumentException.class, () -> new SolicitudCobro("clave", BigDecimal.TEN, "USD"));
        assertThrows(IllegalArgumentException.class, () -> new SolicitudCobro("clave", null, "ARS"));
    }
}
