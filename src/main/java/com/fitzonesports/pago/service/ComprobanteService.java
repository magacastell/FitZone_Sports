package com.fitzonesports.pago.service;

import com.fitzonesports.pago.dto.ComprobantePdf;
import com.fitzonesports.pago.dto.DatosComprobante;
import com.fitzonesports.usuario.service.UsuarioService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ComprobanteService {
    private final JdbcTemplate jdbc;
    private final UsuarioService usuarios;
    private final ComprobantePdfRenderer renderer;
    private final Clock clock;

    @Transactional
    public ComprobantePdf descargar(String email, Integer pagoId) {
        var usuario = usuarios.consultarPerfil(email);
        var titulares = jdbc.queryForList("SELECT usuarioid FROM pago WHERE id=?", Integer.class, pagoId);
        if (titulares.isEmpty()) throw error(404, "El pago no existe");
        if (!usuario.activo() || (!"GERENTE".equals(usuario.rol()) && !usuario.id().equals(titulares.getFirst())))
            throw error(403, "No tenes permiso para consultar este pago");
        return emitir(pagoId);
    }

    /** Emision automatica dentro de M1, o recuperacion de un pago anterior sin PDF. */
    @Transactional
    public ComprobantePdf emitir(Integer pagoId) {
        var pagos = jdbc.queryForList("SELECT * FROM pago WHERE id=? FOR UPDATE", pagoId);
        if (pagos.isEmpty()) throw error(404, "El pago no existe");
        var pago = pagos.getFirst();
        if (!List.of("APROBADO", "REEMBOLSADO").contains(pago.get("estado")))
            throw error(409, "Solo los pagos aprobados pueden tener comprobante");
        var existentes = jdbc.queryForList("SELECT numero_comprobante,contenido_pdf FROM comprobante WHERE pagoid=?", pagoId);
        if (!existentes.isEmpty() && existentes.getFirst().get("contenido_pdf") instanceof byte[] contenido)
            return new ComprobantePdf((String) existentes.getFirst().get("numero_comprobante"), contenido);
        if (!"MEMBRESIA".equals(pago.get("tipo_referencia")))
            throw error(409, "La emision para reservas de cancha requiere la integracion con M4");
        var periodos = jdbc.queryForList("SELECT nombre_plan,inicio,fin,precio FROM periodo_membresia WHERE pago_id=?", pagoId);
        if (periodos.isEmpty()) throw error(409, "El pago no tiene un periodo de membresia asociado");
        var periodo = periodos.getFirst();
        var titular = usuarios.consultarParaAcceso((Integer) pago.get("usuarioid"));
        String numero = existentes.isEmpty() ? "FZ-P-" + pagoId : (String) existentes.getFirst().get("numero_comprobante");
        var fecha = LocalDateTime.now(clock);
        BigDecimal monto = (BigDecimal) pago.get("monto");
        String concepto = "Membresia: " + periodo.get("nombre_plan");
        byte[] pdf = renderer.generar(new DatosComprobante(numero, pagoId, fecha,
                ((java.sql.Timestamp)pago.get("fecha_pago")).toLocalDateTime(),
                titular.nombre() + " " + titular.apellido(), titular.dni(), titular.email(),
                (String) periodo.get("nombre_plan"),
                ((java.sql.Timestamp)periodo.get("inicio")).toLocalDateTime(),
                ((java.sql.Timestamp)periodo.get("fin")).toLocalDateTime(), monto));
        Integer id;
        if (existentes.isEmpty()) {
            id = jdbc.queryForObject("INSERT INTO comprobante(numero_comprobante,fecha_emision,pagoid,contenido_pdf) VALUES (?,?,?,?) RETURNING id",
                    Integer.class, numero, fecha, pagoId, pdf);
        } else {
            id = jdbc.queryForObject("UPDATE comprobante SET contenido_pdf=?,fecha_emision=? WHERE pagoid=? RETURNING id",
                    Integer.class, pdf, fecha, pagoId);
        }
        if (jdbc.queryForObject("SELECT count(*) FROM detalle_facturacion WHERE comprobanteid=?", Integer.class, id) == 0)
            jdbc.update("INSERT INTO detalle_facturacion(concepto,cantidad,subtotal,comprobanteid) VALUES (?,1,?,?)", concepto, monto, id);
        return new ComprobantePdf(numero, pdf);
    }

    private ResponseStatusException error(int status, String mensaje) {
        return new ResponseStatusException(HttpStatus.valueOf(status), mensaje);
    }
}
