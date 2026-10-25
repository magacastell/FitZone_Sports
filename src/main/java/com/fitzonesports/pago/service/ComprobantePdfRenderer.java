package com.fitzonesports.pago.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

@Component
public class ComprobantePdfRenderer {
    public byte[] generar(List<String> lineas) {
        try (var documento = new PDDocument(); var salida = new ByteArrayOutputStream()) {
            var fuente = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDPageContentStream stream = null;
            float y = 0;
            try {
                for (String linea : lineas) {
                    String texto = seguro(linea, fuente);
                    do {
                        if (stream == null || y < 60) {
                            if (stream != null) { stream.endText(); stream.close(); }
                            var pagina = new PDPage(PDRectangle.A4);
                            documento.addPage(pagina);
                            stream = new PDPageContentStream(documento, pagina);
                            stream.beginText();
                            stream.setFont(fuente, 11);
                            y = pagina.getMediaBox().getHeight() - 55;
                            stream.newLineAtOffset(50, y);
                        }
                        int corte = texto.length();
                        while (corte > 1 && fuente.getStringWidth(texto.substring(0, corte)) / 1000 * 11 > 490) corte--;
                        stream.showText(texto.substring(0, corte));
                        stream.newLineAtOffset(0, -18);
                        y -= 18;
                        texto = texto.substring(corte);
                    } while (!texto.isEmpty());
                }
            } finally {
                if (stream != null) { stream.endText(); stream.close(); }
            }
            documento.getDocumentInformation().setTitle("Comprobante de pago - FitZone Sports");
            documento.save(salida);
            return salida.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo generar el comprobante PDF", ex);
        }
    }

    // Las fuentes PDF estandar cubren español. Se reemplazan controles y simbolos no soportados.
    private String seguro(String texto, PDType1Font fuente) throws IOException {
        var resultado = new StringBuilder();
        for (int cp : texto.codePoints().toArray()) {
            String caracter = Character.isISOControl(cp) ? " " : new String(Character.toChars(cp));
            try { fuente.getStringWidth(caracter); }
            catch (IllegalArgumentException ex) { caracter = "?"; }
            resultado.append(caracter);
        }
        return resultado.toString();
    }
}
