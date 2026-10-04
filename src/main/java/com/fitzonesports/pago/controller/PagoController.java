package com.fitzonesports.pago.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rutas iniciales: contratos, pertenencia, sede y reglas de negocio pendientes. */
@RestController
@RequestMapping("/pagos")
public class PagoController {

    @PostMapping
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<Void> crearPago() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<Void> listarMisPagos() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping("/{pagoId}/comprobante")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<Void> consultarComprobante() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping("/{pagoId}")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<Void> consultarPago() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<Void> listarPagos() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/{pagoId}/reembolsos")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<Void> solicitarReembolso() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
