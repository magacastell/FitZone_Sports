package com.fitzonesports.membresia.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rutas iniciales: contratos, pertenencia, sede y reglas de negocio pendientes. */
@RestController
@RequestMapping("/planes")
public class PlanController {

    @GetMapping
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> listarPlanes() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<Void> crearPlan() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PatchMapping("/{planId}")
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<Void> actualizarPlan() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
