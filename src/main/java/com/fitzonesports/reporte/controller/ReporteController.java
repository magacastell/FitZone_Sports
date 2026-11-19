package com.fitzonesports.reporte.controller;

import com.fitzonesports.reporte.dto.ReporteAccesosResponse;
import com.fitzonesports.reporte.dto.ReporteFinancieroResponse;
import com.fitzonesports.reporte.service.ReporteService;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reportes consolidados de solo lectura para el Gerente Central. El período es [desde, hasta) con offset horario;
 * sedeId es opcional (sin él se consolida toda la cadena).
 */
@RestController
@RequestMapping("/reportes")
@RequiredArgsConstructor
public class ReporteController {

    private final ReporteService servicio;

    /** Accesos históricos por período y sede (ingresos, usuarios únicos, pico simultáneo, evolución diaria). */
    @GetMapping("/ocupacion")
    @PreAuthorize("hasRole('GERENTE')")
    public ResponseEntity<ReporteAccesosResponse> consultarOcupacion(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime hasta,
            @RequestParam(required = false) Integer sedeId) {
        return ResponseEntity.ok(servicio.accesos(desde, hasta, sedeId));
    }

    /** Cobros, devoluciones y neto en ARS por período, sede y concepto (membresías y reservas de cancha). */
    @GetMapping("/ingresos")
    @PreAuthorize("hasRole('GERENTE')")
    public ResponseEntity<ReporteFinancieroResponse> consultarIngresos(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime hasta,
            @RequestParam(required = false) Integer sedeId) {
        return ResponseEntity.ok(servicio.financiero(desde, hasta, sedeId));
    }
}
