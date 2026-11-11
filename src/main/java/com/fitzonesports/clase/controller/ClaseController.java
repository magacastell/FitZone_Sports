package com.fitzonesports.clase.controller;

import com.fitzonesports.clase.dto.ActualizarClaseRequest;
import com.fitzonesports.clase.dto.ClaseRequest;
import com.fitzonesports.clase.dto.ClaseResponse;
import com.fitzonesports.clase.dto.EntradaListaEsperaResponse;
import com.fitzonesports.clase.dto.MiActividadResponse;
import com.fitzonesports.clase.dto.MotivoRequest;
import com.fitzonesports.clase.dto.OfertaClaseResponse;
import com.fitzonesports.clase.dto.PaginaResponse;
import com.fitzonesports.clase.dto.ReservaClaseResponse;
import com.fitzonesports.clase.dto.ResponderOfertaRequest;
import com.fitzonesports.clase.service.ClaseService;
import com.fitzonesports.clase.service.ListaEsperaService;
import com.fitzonesports.clase.service.MiActividadService;
import com.fitzonesports.clase.service.ReservaClaseService;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** M3 Clases grupales. El registro de asistencia sigue en 501 (faltas y penalizaciones quedan pendientes, P06). */
@RestController
@RequestMapping("/clases")
@RequiredArgsConstructor
public class ClaseController {

    private final ClaseService claseService;
    private final ReservaClaseService reservaService;
    private final ListaEsperaService listaEsperaService;
    private final MiActividadService miActividadService;

    @GetMapping
    @PreAuthorize("hasAnyRole('USUARIO', 'GERENTE', 'RECEPCIONISTA')")
    public ResponseEntity<PaginaResponse<ClaseResponse>> listarClases(Authentication authentication,
            @RequestParam(required = false) Integer sedeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime hasta,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(claseService.listar(authentication.getName(), sedeId, desde, hasta, page, size));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USUARIO', 'GERENTE')")
    public ResponseEntity<MiActividadResponse> miActividad(Authentication authentication) {
        return ResponseEntity.ok(miActividadService.consultar(authentication.getName()));
    }

    @PostMapping("/{claseId}/reservas")
    @PreAuthorize("hasRole('GERENTE') or (hasRole('USUARIO') and @membresiaService.tieneMembresiaVigentePorEmail(authentication.name))")
    public ResponseEntity<ReservaClaseResponse> reservarClase(Authentication authentication,
            @PathVariable Integer claseId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservaService.reservar(authentication.getName(), claseId));
    }

    @DeleteMapping("/{claseId}/reservas/{reservaId}")
    @PreAuthorize("hasAnyRole('USUARIO', 'GERENTE', 'RECEPCIONISTA')")
    public ResponseEntity<ReservaClaseResponse> cancelarReserva(Authentication authentication,
            @PathVariable Integer claseId, @PathVariable Integer reservaId) {
        return ResponseEntity.ok(reservaService.cancelar(authentication.getName(), claseId, reservaId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<ClaseResponse> crearClase(Authentication authentication,
            @Valid @RequestBody ClaseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(claseService.crear(authentication.getName(), request));
    }

    @PatchMapping("/{claseId}")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<ClaseResponse> actualizarClase(Authentication authentication, @PathVariable Integer claseId,
            @Valid @RequestBody ActualizarClaseRequest request) {
        return ResponseEntity.ok(claseService.actualizar(authentication.getName(), claseId, request));
    }

    @PostMapping("/{claseId}/cancelacion")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<ClaseResponse> cancelarClase(Authentication authentication, @PathVariable Integer claseId,
            @Valid @RequestBody MotivoRequest request) {
        return ResponseEntity.ok(claseService.cancelar(authentication.getName(), claseId, request));
    }

    @GetMapping("/{claseId}/reservas")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<PaginaResponse<ReservaClaseResponse>> listarReservasClase(Authentication authentication,
            @PathVariable Integer claseId, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reservaService.listarDeClase(authentication.getName(), claseId, page, size));
    }

    @PutMapping("/{claseId}/reservas/{reservaId}/asistencia")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<Void> registrarAsistencia() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/{claseId}/lista-espera")
    @PreAuthorize("hasRole('GERENTE') or (hasRole('USUARIO') and @membresiaService.tieneMembresiaVigentePorEmail(authentication.name))")
    public ResponseEntity<EntradaListaEsperaResponse> incorporarListaEspera(Authentication authentication,
            @PathVariable Integer claseId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(listaEsperaService.incorporar(authentication.getName(), claseId));
    }

    @DeleteMapping("/{claseId}/lista-espera/me")
    @PreAuthorize("hasAnyRole('USUARIO', 'GERENTE')")
    public ResponseEntity<Void> salirListaEspera(Authentication authentication, @PathVariable Integer claseId) {
        listaEsperaService.salir(authentication.getName(), claseId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{claseId}/ofertas/{ofertaId}/respuesta")
    @PreAuthorize("hasRole('GERENTE') or (hasRole('USUARIO') and @membresiaService.tieneMembresiaVigentePorEmail(authentication.name))")
    public ResponseEntity<OfertaClaseResponse> responderOferta(Authentication authentication,
            @PathVariable Integer claseId, @PathVariable Integer ofertaId,
            @Valid @RequestBody ResponderOfertaRequest request) {
        return ResponseEntity.ok(listaEsperaService.responder(authentication.getName(), claseId, ofertaId,
                request.respuesta()));
    }
}
