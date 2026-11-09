package com.fitzonesports.acceso.offline;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/accesos/offline") @RequiredArgsConstructor
public class OfflineController {
    private final CredencialOfflineService credenciales;
    public record PrepararCredencial(@NotNull Integer sedeId) {}
    @PostMapping("/credenciales") @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public ResponseEntity<CredencialOfflineService.Lote> credenciales(Authentication auth,@Valid @RequestBody PrepararCredencial request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(credenciales.preparar(auth.getName(),request.sedeId()));
    }
}
