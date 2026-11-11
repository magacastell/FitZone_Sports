package com.fitzonesports.pago.controller;

import com.fitzonesports.pago.dto.ReembolsoResponse;
import com.fitzonesports.pago.dto.PagoDtos.*;
import com.fitzonesports.pago.service.*;
import com.fitzonesports.reserva.service.ReservaCanchaService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController @RequestMapping("/pagos") @RequiredArgsConstructor
public class PagoController {
    private final ComprobanteService comprobantes;
    private final ReembolsoService reembolsos;
    private final PagoCanchaService pagos;
    private final ReservaCanchaService reservas;

    @PostMapping @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public ResponseEntity<PagoResponse> crearPago(Authentication auth,@Valid @RequestBody CrearPagoRequest request) {
        var pago=reservas.pagar(auth.getName(),request.recursoId());
        return ResponseEntity.created(java.net.URI.create("/api/v1/pagos/"+pago.id())).body(pago);
    }
    @GetMapping("/me") @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public List<PagoResponse> listarMisPagos(Authentication auth,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return pagos.listar(auth.getName(),true,null,page,size);
    }
    @GetMapping("/{pagoId}/comprobante") @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public ResponseEntity<byte[]> consultarComprobante(Authentication auth,@PathVariable Integer pagoId) {
        var pdf=comprobantes.descargar(auth.getName(),pagoId);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).cacheControl(CacheControl.noStore())
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename("comprobante-"+pagoId+".pdf").build().toString())
            .body(pdf.contenido());
    }
    @GetMapping("/{pagoId}") @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public PagoResponse consultarPago(Authentication auth,@PathVariable Integer pagoId) {return pagos.consultar(auth.getName(),pagoId);}
    @GetMapping @PreAuthorize("hasRole('GERENTE')")
    public List<PagoResponse> listarPagos(Authentication auth,@RequestParam(required=false) Integer sedeId,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return pagos.listar(auth.getName(),false,sedeId,page,size);
    }
    @PostMapping("/{pagoId}/reembolsos") @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public ResponseEntity<ReembolsoResponse> solicitarReembolso(Authentication auth,@PathVariable Integer pagoId) {
        return ResponseEntity.ok(reembolsos.solicitar(auth.getName(),pagoId));
    }
}
