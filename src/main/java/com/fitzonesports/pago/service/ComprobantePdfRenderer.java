package com.fitzonesports.pago.service;

import com.fitzonesports.pago.dto.DatosComprobante;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

@Component
public class ComprobantePdfRenderer {
    public byte[] generar(DatosComprobante datos) {
        try (var documento = new PDDocument(); var salida = new ByteArrayOutputStream();
                var lienzo = new Lienzo(documento)) {
            var fecha = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
            var importe = NumberFormat.getNumberInstance(Locale.forLanguageTag("es-AR"));
            importe.setMinimumFractionDigits(2);
            importe.setMaximumFractionDigits(2);
            lienzo.texto("FITZONE SPORTS", 22, true);
            lienzo.texto("COMPROBANTE DE PAGO", 11, true);
            lienzo.texto(datos.numero(), 16, true);
            lienzo.texto("Emitido: " + datos.emision().format(fecha) + " (hora argentina)", 10, false);
            lienzo.separador();
            lienzo.texto("PAGO APROBADO", 12, true);
            lienzo.texto("Fecha de pago: " + datos.fechaPago().format(fecha) + " (hora argentina)", 10, false);
            lienzo.texto("Referencia de pago: " + datos.pagoId(), 10, false);
            lienzo.separador();
            lienzo.texto("TITULAR", 10, true);
            lienzo.texto(datos.titular(), 14, true);
            lienzo.texto("DNI: " + datos.dni(), 11, false);
            lienzo.texto("Email: " + datos.email(), 11, false);
            lienzo.separador();
            lienzo.texto("MEMBRESÍA", 10, true);
            lienzo.texto(datos.plan(), 15, true);
            lienzo.texto("Período contratado (hora argentina)", 10, false);
            lienzo.texto(datos.inicio().format(fecha) + " a " + datos.fin().format(fecha), 12, false);
            lienzo.texto("Cantidad: 1", 11, false);
            lienzo.separador();
            lienzo.textoDerecha("TOTAL ARS $ " + importe.format(datos.total()), 23);
            lienzo.separador();
            lienzo.texto("Pago procesado mediante pasarela simulada.", 10, false);
            lienzo.texto("Comprobante de simulación académica. Sin validez fiscal.", 10, true);
            lienzo.texto("Acredita el cobro original; no certifica la vigencia actual ni el estado de un reembolso.", 9, false);
            lienzo.close();
            documento.getDocumentInformation().setTitle("Comprobante de pago - FitZone Sports");
            documento.save(salida);
            return salida.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo generar el comprobante PDF", ex);
        }
    }

    /** Estado local de dibujo y paginado; no contiene reglas comerciales. */
    private static class Lienzo implements AutoCloseable {
        private final PDDocument documento;
        private final PDType1Font normal = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        private final PDType1Font negrita = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        private PDPageContentStream stream;
        private float y;
        private static final float MARGEN = 48;
        private static final float ANCHO = PDRectangle.A4.getWidth() - 2 * MARGEN;

        Lienzo(PDDocument documento) { this.documento = documento; }

        private void espacio(float alto) throws IOException {
            if (stream != null && y - alto >= MARGEN) return;
            close();
            var pagina = new PDPage(PDRectangle.A4);
            documento.addPage(pagina);
            stream = new PDPageContentStream(documento, pagina);
            y = PDRectangle.A4.getHeight() - MARGEN;
        }

        void texto(String valor, float tamano, boolean destacado) throws IOException {
            var fuente = destacado ? negrita : normal;
            String restante = seguro(valor, fuente);
            do {
                int corte = restante.length();
                while (corte > 1 && fuente.getStringWidth(restante.substring(0, corte)) / 1000 * tamano > ANCHO) corte--;
                if (corte < restante.length() && restante.lastIndexOf(' ', corte) > 0) corte = restante.lastIndexOf(' ', corte);
                espacio(tamano + 9);
                dibujar(restante.substring(0, corte), fuente, tamano, MARGEN);
                y -= tamano + 9;
                restante = restante.substring(corte).stripLeading();
            } while (!restante.isEmpty());
        }

        void textoDerecha(String valor, float tamano) throws IOException {
            String texto = seguro(valor, negrita);
            while (negrita.getStringWidth(texto) / 1000 * tamano > ANCHO && tamano > 10) tamano--;
            espacio(tamano + 12);
            dibujar(texto, negrita, tamano, MARGEN + ANCHO - negrita.getStringWidth(texto) / 1000 * tamano);
            y -= tamano + 12;
        }

        private void dibujar(String texto, PDType1Font fuente, float tamano, float x) throws IOException {
            stream.setNonStrokingColor(0.12f, 0.23f, 0.18f);
            stream.beginText();
            stream.setFont(fuente, tamano);
            stream.newLineAtOffset(x, y);
            stream.showText(texto);
            stream.endText();
        }

        void separador() throws IOException {
            espacio(26);
            y -= 6;
            stream.setStrokingColor(0.82f, 0.87f, 0.83f);
            stream.moveTo(MARGEN, y);
            stream.lineTo(MARGEN + ANCHO, y);
            stream.stroke();
            y -= 20;
        }

        public void close() throws IOException {
            if (stream != null) { stream.close(); stream = null; }
        }
    }

    // Fuentes PDF estándar: español soportado; controles y símbolos no soportados se normalizan.
    private static String seguro(String texto, PDType1Font fuente) throws IOException {
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
