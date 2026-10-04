package com.fitzonesports.reserva.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rutas iniciales: contratos, pertenencia, sede y reglas de negocio pendientes. */
@RestController
@RequestMapping("/reservas")
public class ReservaController {

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<Void> listarMisReservas() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> listarReservas() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
