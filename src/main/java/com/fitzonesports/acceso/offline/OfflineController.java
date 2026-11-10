package com.fitzonesports.acceso.offline;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import com.fitzonesports.acceso.offline.SincronizacionOfflineService.Evento;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/accesos/offline") @RequiredArgsConstructor
public class OfflineController {
    private final CredencialOfflineService credenciales;
    private final TerminalOfflineService terminales;
    private final SincronizacionOfflineService sincronizacion;
    private final AutorizacionQrService autorizaciones;
    @PostMapping("/credenciales/automaticas") @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public ResponseEntity<AutorizacionQrService.Lote> automaticas(Authentication auth) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(autorizaciones.emitir(auth.getName()));
    }
    public record Batch(@NotNull java.util.UUID terminalId,@jakarta.validation.constraints.NotEmpty @jakarta.validation.constraints.Size(max=100) java.util.List<@Valid Evento> eventos) {}
    @PostMapping("/sincronizacion") @PreAuthorize("hasRole('RECEPCIONISTA')")
    public ResponseEntity<java.util.List<SincronizacionOfflineService.Resultado>> sincronizar(Authentication auth,@Valid @RequestBody Batch batch) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(sincronizacion.sincronizar(auth.getName(),batch.terminalId(),batch.eventos()));
    }
    public record PrepararCredencial(@NotNull Integer sedeId) {}
    public record PrepararTerminal(@NotNull java.util.UUID terminalId) {}
    @PostMapping("/preparacion") @PreAuthorize("hasRole('RECEPCIONISTA')")
    public ResponseEntity<TerminalOfflineService.Copia> preparar(Authentication auth,@Valid @RequestBody PrepararTerminal request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(terminales.preparar(auth.getName(),request.terminalId()));
    }
    @GetMapping("/conexion")
    public ResponseEntity<Void> conexion() { return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build(); }
    @PostMapping("/credenciales") @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public ResponseEntity<CredencialOfflineService.Lote> credenciales(Authentication auth,@Valid @RequestBody PrepararCredencial request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(credenciales.preparar(auth.getName(),request.sedeId()));
    }
}
