package com.fitzonesports.usuario.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rutas iniciales: contratos, pertenencia, sede y reglas de negocio pendientes. */
@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> consultarPerfil() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PatchMapping("/me")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> actualizarPerfil() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> listarUsuarios() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping("/{usuarioId}")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> consultarUsuario() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PatchMapping("/{usuarioId}")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> actualizarUsuario() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
