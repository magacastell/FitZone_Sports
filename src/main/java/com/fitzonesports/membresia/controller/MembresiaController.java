package com.fitzonesports.membresia.controller;

import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.service.MembresiaService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/membresias") @RequiredArgsConstructor
public class MembresiaController {
    private final MembresiaService service;

    @PostMapping("/{membresiaId}/periodos/{periodoId}/cancelacion")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO','CLIENTE_EXTERNO','GERENTE')")
    public ResponseEntity<MembresiaResponse> cancelarPeriodo(Authentication auth,@PathVariable Integer membresiaId,@PathVariable Integer periodoId) {
        return ResponseEntity.ok(service.cancelarPeriodo(auth.getName(),membresiaId,periodoId));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO','CLIENTE_EXTERNO','GERENTE')")
    public ResponseEntity<MembresiaResponse> consultarMembresia(Authentication auth) {
        return ResponseEntity.ok(service.consultarPropia(auth.getName()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO','CLIENTE_EXTERNO','GERENTE')")
    public ResponseEntity<MembresiaResponse> crearMembresia(Authentication auth,
            @Valid @RequestBody CrearMembresiaRequest request, @RequestHeader("Idempotency-Key") UUID clave) {
        return ResponseEntity.status(201).body(service.contratar(auth.getName(),request,clave));
    }

    @PostMapping("/{membresiaId}/renovaciones")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO','CLIENTE_EXTERNO','GERENTE')")
    public ResponseEntity<MembresiaResponse> renovarMembresia(Authentication auth, @PathVariable Integer membresiaId,
            @Valid @RequestBody RenovarMembresiaRequest request, @RequestHeader("Idempotency-Key") UUID clave) {
        return ResponseEntity.status(201).body(service.renovar(auth.getName(),membresiaId,request,clave));
    }

    @GetMapping("/{membresiaId}")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA','GERENTE')")
    public ResponseEntity<MembresiaResponse> consultarMembresiaPorId(Authentication auth, @PathVariable Integer membresiaId) {
        return ResponseEntity.ok(service.consultarPorId(auth.getName(),membresiaId));
    }

    @PatchMapping("/{membresiaId}/estado")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA','GERENTE')")
    public ResponseEntity<MembresiaResponse> actualizarEstado(Authentication auth, @PathVariable Integer membresiaId,
            @Valid @RequestBody ActualizarEstadoMembresiaRequest request) {
        return ResponseEntity.ok(service.actualizarEstado(auth.getName(),membresiaId,request));
    }

    @PutMapping("/{membresiaId}/renovacion-automatica")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO','CLIENTE_EXTERNO','GERENTE')")
    public ResponseEntity<MembresiaResponse> configurarRenovacionAutomatica(Authentication auth,
            @PathVariable Integer membresiaId, @Valid @RequestBody RenovacionAutomaticaRequest request) {
        return ResponseEntity.ok(service.configurarAutomatica(auth.getName(),membresiaId,request));
    }
}
