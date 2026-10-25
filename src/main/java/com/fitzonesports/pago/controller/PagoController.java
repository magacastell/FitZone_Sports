package com.fitzonesports.pago.controller;

import com.fitzonesports.pago.dto.ReembolsoResponse;
import com.fitzonesports.pago.service.ComprobanteService;
import com.fitzonesports.pago.service.ReembolsoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** PDF y reembolso de membresias implementados; las demas rutas siguen pendientes. */
@RestController
@RequestMapping("/pagos")
@RequiredArgsConstructor
public class PagoController {
    private final ComprobanteService comprobantes;
    private final ReembolsoService reembolsos;

    @PostMapping
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<Void> crearPago() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<Void> listarMisPagos() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping("/{pagoId}/comprobante")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<byte[]> consultarComprobante(Authentication auth, @PathVariable Integer pagoId) {
        var pdf = comprobantes.descargar(auth.getName(), pagoId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("comprobante-" + pagoId + ".pdf").build().toString())
                .body(pdf.contenido());
    }

    @GetMapping("/{pagoId}")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<Void> consultarPago() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('GERENTE')")
    public ResponseEntity<Void> listarPagos() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/{pagoId}/reembolsos")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'GERENTE')")
    public ResponseEntity<ReembolsoResponse> solicitarReembolso(Authentication auth, @PathVariable Integer pagoId) {
        return ResponseEntity.ok(reembolsos.solicitar(auth.getName(), pagoId));
    }
}
