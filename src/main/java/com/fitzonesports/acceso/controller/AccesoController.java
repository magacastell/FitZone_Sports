package com.fitzonesports.acceso.controller;

import com.fitzonesports.acceso.dto.AccesoResponse;
import com.fitzonesports.acceso.dto.AforoResponse;
import com.fitzonesports.acceso.dto.QrAccesoResponse;
import com.fitzonesports.acceso.dto.RegistrarIngresoRequest;
import com.fitzonesports.acceso.dto.RegistrarSalidaRequest;
import com.fitzonesports.acceso.service.AccesoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** QR, ingreso, salida y aforo estan implementados; listado y correccion siguen en 501. */
@RestController
@RequestMapping("/accesos")
@RequiredArgsConstructor
public class AccesoController {

    private final AccesoService accesoService;

    @GetMapping("/qr")
    @PreAuthorize("hasAnyRole('USUARIO', 'GERENTE')")
    public ResponseEntity<QrAccesoResponse> obtenerQr(Authentication authentication) {
        // El QR es una credencial: no debe quedar en cachés del navegador ni de proxies.
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(accesoService.generarQr(authentication.getName()));
    }

    @PostMapping("/ingresos")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<AccesoResponse> registrarIngreso(Authentication authentication,
            @Valid @RequestBody RegistrarIngresoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accesoService.registrarIngreso(authentication.getName(), request));
    }

    @PostMapping("/salidas")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<AccesoResponse> registrarSalida(Authentication authentication,
            @RequestBody RegistrarSalidaRequest request) {
        return ResponseEntity.ok(accesoService.registrarSalida(authentication.getName(), request));
    }

    @GetMapping("/sedes/{sedeId}/aforo")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<AforoResponse> consultarAforo(Authentication authentication, @PathVariable Integer sedeId) {
        return ResponseEntity.ok(accesoService.consultarAforo(authentication.getName(), sedeId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> listarAccesos() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PatchMapping("/{accesoId}")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> corregirAcceso() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
