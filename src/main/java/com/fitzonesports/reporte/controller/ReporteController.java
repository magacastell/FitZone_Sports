package com.fitzonesports.reporte.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rutas iniciales: contratos, pertenencia, sede y reglas de negocio pendientes. */
@RestController
@RequestMapping("/reportes")
public class ReporteController {

    @GetMapping("/ocupacion")
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<Void> consultarOcupacion() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping("/ingresos")
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<Void> consultarIngresos() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
