package com.fitzonesports.clase.controller;

import com.fitzonesports.clase.dto.TipoClaseRequest;
import com.fitzonesports.clase.dto.TipoClaseResponse;
import com.fitzonesports.clase.service.CatalogoClaseService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tipos-clase")
@RequiredArgsConstructor
public class TipoClaseController {

    private final CatalogoClaseService catalogo;

    @GetMapping
    @PreAuthorize("hasAnyRole('USUARIO', 'RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<List<TipoClaseResponse>> listarTipos() {
        return ResponseEntity.ok(catalogo.listarTipos());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<TipoClaseResponse> crearTipo(@Valid @RequestBody TipoClaseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogo.crearTipo(request));
    }
}
