package com.fitzonesports.clase.controller;

import com.fitzonesports.clase.dto.InstructorRequest;
import com.fitzonesports.clase.dto.InstructorResponse;
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
@RequestMapping("/instructores")
@RequiredArgsConstructor
public class InstructorController {

    private final CatalogoClaseService catalogo;

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<List<InstructorResponse>> listarInstructores() {
        return ResponseEntity.ok(catalogo.listarInstructores());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<InstructorResponse> crearInstructor(@Valid @RequestBody InstructorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogo.crearInstructor(request));
    }
}
