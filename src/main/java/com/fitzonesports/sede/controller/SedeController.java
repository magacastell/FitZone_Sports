package com.fitzonesports.sede.controller;

import com.fitzonesports.sede.dto.ActualizarSedeRequest;
import com.fitzonesports.sede.dto.SedeRequest;
import com.fitzonesports.sede.dto.SedeResponse;
import com.fitzonesports.sede.service.SedeService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/sedes")
@RequiredArgsConstructor
public class SedeController {

    private final SedeService sedeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<List<SedeResponse>> listarSedes() {
        return ResponseEntity.ok(sedeService.listarSedes());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<SedeResponse> crearSede(@Valid @RequestBody SedeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sedeService.crearSede(request));
    }

    @PatchMapping("/{sedeId}")
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<SedeResponse> actualizarSede(@PathVariable Integer sedeId,
            @Valid @RequestBody ActualizarSedeRequest request) {
        return ResponseEntity.ok(sedeService.actualizarSede(sedeId, request));
    }
}
