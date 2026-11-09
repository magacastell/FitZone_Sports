package com.fitzonesports.membresia.controller;

import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.service.PlanService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Gestion de planes globales de membresia. */
@RestController
@RequestMapping("/planes")
@RequiredArgsConstructor
public class PlanController {
    private final PlanService planService;

    @GetMapping
    @PreAuthorize("hasAnyRole('USUARIO', 'RECEPCIONISTA', 'GERENTE') and (!#incluirInactivos or hasAnyRole('RECEPCIONISTA', 'GERENTE'))")
    public ResponseEntity<List<PlanResponse>> listarPlanes(@RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return ResponseEntity.ok(planService.listarPlanes(incluirInactivos));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<PlanResponse> crearPlan(@Valid @RequestBody PlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(planService.crearPlan(request));
    }

    @PatchMapping("/{planId}")
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<PlanResponse> actualizarPlan(@PathVariable Integer planId,
            @Valid @RequestBody ActualizarPlanRequest request) {
        return ResponseEntity.ok(planService.actualizarPlan(planId, request));
    }

    @DeleteMapping("/{planId}")
    @PreAuthorize("hasRole('GERENTE')")
    public ResponseEntity<Void> desactivarPlan(@PathVariable Integer planId) {
        planService.desactivarPlan(planId);
        return ResponseEntity.noContent().build();
    }
}
