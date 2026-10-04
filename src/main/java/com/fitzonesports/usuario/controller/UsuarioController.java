package com.fitzonesports.usuario.controller;

import com.fitzonesports.usuario.dto.ActualizarPerfilRequest;
import com.fitzonesports.usuario.dto.ActualizarUsuarioRequest;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<UsuarioResponse> consultarPerfil(Authentication authentication) {
        return ResponseEntity.ok(usuarioService.consultarPerfil(authentication.getName()));
    }

    @PatchMapping("/me")
    @PreAuthorize("hasAnyRole('SOCIO_ACTIVO', 'CLIENTE_EXTERNO', 'RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<UsuarioResponse> actualizarPerfil(Authentication authentication,
            @Valid @RequestBody ActualizarPerfilRequest request) {
        return ResponseEntity.ok(usuarioService.actualizarPerfil(authentication.getName(), request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<List<UsuarioResponse>> listarUsuarios(Authentication authentication,
            @RequestParam(required = false) Integer sedeId) {
        return ResponseEntity.ok(usuarioService.listarUsuarios(authentication.getName(), sedeId));
    }

    @GetMapping("/{usuarioId}")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<UsuarioResponse> consultarUsuario(Authentication authentication,
            @PathVariable Integer usuarioId) {
        return ResponseEntity.ok(usuarioService.consultarUsuario(authentication.getName(), usuarioId));
    }

    @PatchMapping("/{usuarioId}")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE')")
    public ResponseEntity<UsuarioResponse> actualizarUsuario(Authentication authentication,
            @PathVariable Integer usuarioId, @Valid @RequestBody ActualizarUsuarioRequest request) {
        return ResponseEntity.ok(usuarioService.actualizarUsuario(authentication.getName(), usuarioId, request));
    }
}
