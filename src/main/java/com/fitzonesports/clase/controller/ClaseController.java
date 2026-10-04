package com.fitzonesports.clase.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rutas iniciales: contratos, pertenencia, sede y reglas de negocio pendientes. */
@RestController
@RequestMapping("/clases")
public class ClaseController {

    @GetMapping
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'GERENTE', 'RECEPCIONISTA')")
    public ResponseEntity<Void> listarClases() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/{claseId}/reservas")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'GERENTE')")
    public ResponseEntity<Void> reservarClase() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @DeleteMapping("/{claseId}/reservas/{reservaId}")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'GERENTE', 'RECEPCIONISTA')")
    public ResponseEntity<Void> cancelarReserva() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> crearClase() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PatchMapping("/{claseId}")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> actualizarClase() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/{claseId}/cancelacion")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> cancelarClase() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping("/{claseId}/reservas")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> listarReservasClase() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PutMapping("/{claseId}/reservas/{reservaId}/asistencia")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> registrarAsistencia() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/{claseId}/lista-espera")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'GERENTE')")
    public ResponseEntity<Void> incorporarListaEspera() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @DeleteMapping("/{claseId}/lista-espera/me")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'GERENTE')")
    public ResponseEntity<Void> salirListaEspera() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/{claseId}/ofertas/{ofertaId}/respuesta")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'GERENTE')")
    public ResponseEntity<Void> responderOferta() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
