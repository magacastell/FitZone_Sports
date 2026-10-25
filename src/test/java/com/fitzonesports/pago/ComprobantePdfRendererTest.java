package com.fitzonesports.pago;

import com.fitzonesports.pago.service.ComprobantePdfRenderer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ComprobantePdfRendererTest {
    @Test void generaPdfLegibleConAcentosTextosLargosYSimbolos() throws Exception {
        var lineas = List.of("FITZONE SPORTS", "COMPROBANTE DE PAGO", "Numero: FZ-P-123",
                "Emitido: 25/10/2026 12:00", "Titular: María Muñoz", "DNI: 12345678",
                "Membresía: " + "Plan anual áéíóú ".repeat(18), "Periodo: 25/10/2026 a 25/10/2027",
                "TOTAL ARS: 15000.50", "Referencia de prueba: \uD83C\uDFC0\n",
                "Comprobante de simulacion academica, sin validez fiscal.");
        byte[] pdf = new ComprobantePdfRenderer().generar(lineas);
        try (var documento = Loader.loadPDF(pdf)) {
            String texto = new PDFTextStripper().getText(documento);
            assertEquals(1, documento.getNumberOfPages());
            assertTrue(texto.contains("María Muñoz"));
            assertTrue(texto.contains("15000.50"));
            Files.createDirectories(Path.of("target"));
            Files.write(Path.of("target/comprobante-ejemplo.pdf"), pdf);
            javax.imageio.ImageIO.write(new org.apache.pdfbox.rendering.PDFRenderer(documento).renderImageWithDPI(0, 100),
                    "png", Path.of("target/comprobante-ejemplo.png").toFile());
        }
    }

    @Test void paginaContenidoExtensoSinSalirDeLaHoja() throws Exception {
        byte[] pdf = new ComprobantePdfRenderer().generar(java.util.Collections.nCopies(100, "Detalle de prueba"));
        try (var documento = Loader.loadPDF(pdf)) {
            assertTrue(documento.getNumberOfPages() > 1);
            assertEquals(100, new PDFTextStripper().getText(documento).lines().filter(l -> l.equals("Detalle de prueba")).count());
        }
    }
}
