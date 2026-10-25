package com.fitzonesports.pago.service;

import com.fitzonesports.membresia.service.MembresiaService;
import com.fitzonesports.pago.dto.ReembolsoResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import java.math.BigDecimal;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReembolsoService {
    private final JdbcTemplate jdbc;
    private final UsuarioService usuarios;
    private final MembresiaService membresias;
    private final Clock clock;

    @Transactional
    public ReembolsoResponse solicitar(String email, Integer pagoId) {
        var usuario = usuarios.consultarPerfil(email);
        var pagos = jdbc.queryForList("SELECT usuarioid,tipo_referencia FROM pago WHERE id=?", pagoId);
        if (pagos.isEmpty()) throw error(404, "El pago no existe");
        var pago = pagos.getFirst();
        if (!usuario.activo() || (!"GERENTE".equals(usuario.rol()) && !usuario.id().equals(pago.get("usuarioid"))))
            throw error(403, "No tenes permiso para reembolsar este pago");
        if (!"MEMBRESIA".equals(pago.get("tipo_referencia")))
            throw error(409, "El reembolso de reservas requiere la integracion con M4");
        var periodos = jdbc.queryForList("SELECT id,membresia_id FROM periodo_membresia WHERE pago_id=?", pagoId);
        if (periodos.isEmpty()) throw error(409, "El pago no tiene un periodo de membresia asociado");
        var periodo = periodos.getFirst();
        // M1 aplica propiedad, plazo, bloqueo, cancelacion del periodo y actualizacion de vigencia.
        membresias.cancelarPeriodo(email, (Integer) periodo.get("membresia_id"), (Integer) periodo.get("id"));
        var resultado = jdbc.queryForMap("SELECT p.estado,p.monto,r.fecha,r.referencia_externa FROM pago p "
                + "LEFT JOIN reembolso_pago r ON r.pago_id=p.id WHERE p.id=?", pagoId);
        if (!"REEMBOLSADO".equals(resultado.get("estado"))) throw error(409, "No se pudo confirmar el reembolso");
        var fecha = (java.sql.Timestamp) resultado.get("fecha");
        return new ReembolsoResponse(pagoId, "REEMBOLSADO", (BigDecimal)resultado.get("monto"), "ARS",
                fecha == null ? null : fecha.toLocalDateTime().atZone(clock.getZone()).toOffsetDateTime(),
                (String) resultado.get("referencia_externa"));
    }

    private ResponseStatusException error(int status, String mensaje) {
        return new ResponseStatusException(HttpStatus.valueOf(status), mensaje);
    }
}
