package com.fitzonesports.pago;

import com.fitzonesports.pago.dto.DatosComprobante;
import com.fitzonesports.pago.service.ComprobantePdfRenderer;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ComprobantePdfRendererTest {
    private DatosComprobante datos(String plan) {
        var fecha = LocalDateTime.of(2026, 10, 30, 12, 0);
        return new DatosComprobante("FZ-P-123", 123, fecha, fecha, "María Muñoz", "12345678",
                "maria@test.com", plan, fecha, fecha.plusMonths(1), new BigDecimal("16000.75"));
    }

    @Test void generaPdfLegibleConDatosRealesYFormatoArgentino() throws Exception {
        byte[] pdf = new ComprobantePdfRenderer().generar(datos("Plan mensual revisión manual"));
        try (var documento = Loader.loadPDF(pdf)) {
            String texto = new PDFTextStripper().getText(documento);
            assertEquals(1, documento.getNumberOfPages());
            for (String dato : new String[]{"María Muñoz", "16.000,75", "FZ-P-123", "30/10/2026", "30/11/2026",
                    "Cantidad: 1", "PAGO APROBADO", "Sin validez fiscal", "simulación académica"})
                assertTrue(texto.contains(dato), dato);
            Files.createDirectories(Path.of("target"));
            Files.write(Path.of("target/comprobante-ejemplo.pdf"), pdf);
            javax.imageio.ImageIO.write(new org.apache.pdfbox.rendering.PDFRenderer(documento).renderImageWithDPI(0, 120),
                    "png", Path.of("target/comprobante-ejemplo.png").toFile());
        }
    }

    @Test void paginaTextosLargosYNormalizaSimbolosSinPerderElTotal() throws Exception {
        byte[] pdf = new ComprobantePdfRenderer().generar(datos("Plan anual áéíóú \uD83C\uDFC0\n".repeat(500)));
        try (var documento = Loader.loadPDF(pdf)) {
            assertTrue(documento.getNumberOfPages() > 1);
            String texto = new PDFTextStripper().getText(documento);
            assertTrue(texto.contains("TOTAL ARS $ 16.000,75"));
            assertTrue(texto.contains("Sin validez fiscal"));
        }
    }
}
