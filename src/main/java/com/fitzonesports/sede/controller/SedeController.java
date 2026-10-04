package com.fitzonesports.sede.controller;

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
@RequestMapping("/sedes")
public class SedeController {

    @GetMapping
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> listarSedes() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<Void> crearSede() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PatchMapping("/{sedeId}")
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<Void> actualizarSede() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
