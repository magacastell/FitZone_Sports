package com.fitzonesports.pago.service;

import com.fitzonesports.pago.pasarela.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Adaptador minimo de M5 para membresias; comparte la transaccion con M1. */
@Service @RequiredArgsConstructor
public class CobroMembresiaService {
    private final PasarelaPago pasarela;
    private final JdbcTemplate jdbc;
    private final java.time.Clock clock;

    @Transactional(propagation=Propagation.MANDATORY)
    public void reembolsar(Integer pagoId) {
        var pago = jdbc.queryForMap("SELECT estado,referencia_externa,monto FROM pago WHERE id=? FOR UPDATE",pagoId);
        if ("REEMBOLSADO".equals(pago.get("estado"))) return;
        if (!"APROBADO".equals(pago.get("estado"))) throw new ResponseStatusException(HttpStatus.CONFLICT,"El pago no esta aprobado");
        var resultado=pasarela.reembolsar(new SolicitudReembolso("arrepentimiento:"+pagoId,
                (String)pago.get("referencia_externa"),(BigDecimal)pago.get("monto")));
        if (resultado.estado()!=ResultadoCobro.Estado.APROBADO)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"No se pudo confirmar el reembolso");
        jdbc.update("INSERT INTO reembolso_pago(pago_id,monto,fecha,referencia_externa,proveedor) VALUES (?,?,?,?,?)",
                pagoId,pago.get("monto"),LocalDateTime.now(clock),resultado.referenciaExterna(),resultado.proveedor());
        jdbc.update("UPDATE pago SET estado='REEMBOLSADO' WHERE id=?",pagoId);
    }

    @Transactional(propagation=Propagation.MANDATORY,readOnly=true)
    public LocalDateTime fechaCobro(Integer pagoId) {
        return jdbc.queryForObject("SELECT fecha_pago FROM pago WHERE id=?",LocalDateTime.class,pagoId);
    }

    @Transactional(propagation=Propagation.MANDATORY)
    public Integer cobrar(Integer usuarioId, Integer membresiaId, BigDecimal importe, String clave, LocalDateTime ahora) {
        var resultado = pasarela.cobrar(new SolicitudCobro(clave, importe, "ARS"));
        if (resultado.estado() != ResultadoCobro.Estado.APROBADO) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "El pago no fue aprobado; no se otorgo vigencia");
        }
        return jdbc.queryForObject("INSERT INTO pago(monto,tipo_referencia,referencia_id,fecha_pago,usuarioid,estado,"
                + "clave_idempotencia,referencia_externa,proveedor) VALUES (?,'MEMBRESIA',?,?,?,'APROBADO',?,?,?) RETURNING id",
                Integer.class, importe, membresiaId, ahora, usuarioId, clave, resultado.referenciaExterna(), resultado.proveedor());
    }
}
