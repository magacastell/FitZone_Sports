package com.fitzonesports.reserva.controller;

import com.fitzonesports.reserva.dto.CanchaDtos.*;
import com.fitzonesports.reserva.service.*;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/canchas") @RequiredArgsConstructor
public class CanchaController {
    private final CanchaService canchas;
    private final ReservaCanchaService reservas;

    @GetMapping @PreAuthorize("hasAnyRole('USUARIO','RECEPCIONISTA','GERENTE')")
    public List<CanchaResponse> listarCanchas(Authentication auth,@RequestParam(required=false) Integer sedeId) {
        return canchas.listar(auth.getName(),sedeId);
    }
    @GetMapping("/{canchaId}") @PreAuthorize("hasAnyRole('USUARIO','RECEPCIONISTA','GERENTE')")
    public CanchaResponse consultarCancha(Authentication auth,@PathVariable Integer canchaId) {
        return canchas.consultar(auth.getName(),canchaId);
    }
    @GetMapping("/{canchaId}/turnos") @PreAuthorize("hasAnyRole('USUARIO','RECEPCIONISTA','GERENTE')")
    public List<TurnoResponse> listarTurnos(Authentication auth,@PathVariable Integer canchaId,
            @RequestParam LocalDate desde,@RequestParam LocalDate hasta) {
        return canchas.turnos(auth.getName(),canchaId,desde,hasta);
    }
    @PostMapping("/{canchaId}/reservas") @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public ResponseEntity<ReservaResponse> reservarTurno(Authentication auth,@PathVariable Integer canchaId,
            @Valid @RequestBody Reservar request,@RequestHeader("Idempotency-Key") UUID clave) {
        var r=reservas.reservar(auth.getName(),canchaId,request,clave);
        return ResponseEntity.created(java.net.URI.create("/api/v1/reservas/"+r.id())).body(r);
    }
    @DeleteMapping("/{canchaId}/reservas/{reservaId}") @PreAuthorize("hasAnyRole('USUARIO','RECEPCIONISTA','GERENTE')")
    public ReservaResponse cancelarReserva(Authentication auth,@PathVariable Integer canchaId,@PathVariable Integer reservaId,
            @Valid @RequestBody(required=false) CancelarRequest request) {
        return reservas.cancelar(auth.getName(),canchaId,reservaId,request);
    }
    @PostMapping @PreAuthorize("hasAnyRole('RECEPCIONISTA','GERENTE')")
    public ResponseEntity<CanchaResponse> crearCancha(Authentication auth,@Valid @RequestBody CrearCancha request) {
        var c=canchas.crear(auth.getName(),request);
        return ResponseEntity.created(java.net.URI.create("/api/v1/canchas/"+c.id())).body(c);
    }
    @PatchMapping("/{canchaId}") @PreAuthorize("hasAnyRole('RECEPCIONISTA','GERENTE')")
    public CanchaResponse actualizarCancha(Authentication auth,@PathVariable Integer canchaId,@Valid @RequestBody ActualizarCancha request) {
        return canchas.actualizar(auth.getName(),canchaId,request);
    }
    @PostMapping("/{canchaId}/turnos") @PreAuthorize("hasAnyRole('RECEPCIONISTA','GERENTE')")
    public ResponseEntity<TurnoResponse> crearTurno(Authentication auth,@PathVariable Integer canchaId,@Valid @RequestBody CrearTurno request) {
        return ResponseEntity.status(201).body(canchas.crearTurno(auth.getName(),canchaId,request));
    }
    @GetMapping("/{canchaId}/mantenimientos") @PreAuthorize("hasAnyRole('RECEPCIONISTA','GERENTE')")
    public List<MantenimientoResponse> listarMantenimientos(Authentication auth,@PathVariable Integer canchaId) {
        return canchas.mantenimientos(auth.getName(),canchaId);
    }
    @PostMapping("/{canchaId}/mantenimientos") @PreAuthorize("hasAnyRole('RECEPCIONISTA','GERENTE')")
    public ResponseEntity<MantenimientoResponse> crearMantenimiento(Authentication auth,@PathVariable Integer canchaId,@Valid @RequestBody MantenimientoRequest request) {
        return ResponseEntity.status(201).body(canchas.mantenimiento(auth.getName(),canchaId,request));
    }
    @DeleteMapping("/{canchaId}/mantenimientos/{mantenimientoId}") @PreAuthorize("hasAnyRole('RECEPCIONISTA','GERENTE')")
    public ResponseEntity<Void> eliminarMantenimiento(Authentication auth,@PathVariable Integer canchaId,@PathVariable Integer mantenimientoId) {
        canchas.eliminarMantenimiento(auth.getName(),canchaId,mantenimientoId); return ResponseEntity.noContent().build();
    }
}
