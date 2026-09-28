package com.fitzonesports.auth.controller;

import com.fitzonesports.auth.dto.LoginRequest;
import com.fitzonesports.auth.dto.LoginResponse;
import com.fitzonesports.auth.dto.RegisterRequest;
import com.fitzonesports.auth.dto.RegisterResponse;
import com.fitzonesports.auth.model.Rol;
import com.fitzonesports.auth.model.Usuario;
import com.fitzonesports.auth.repository.RolRepository;
import com.fitzonesports.auth.repository.UsuarioRepository;
import com.fitzonesports.auth.service.CustomUserDetailsService;
import com.fitzonesports.auth.service.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    // Rol asignado a todo alta hecha via /auth/register: es un endpoint publico,
    // asi que nunca deja elegir un rol interno (RECEPCIONISTA, GERENTE, etc.).
    private static final String ROL_REGISTRO_PUBLICO = "CLIENTE_EXTERNO";

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    private final CustomUserDetailsService userDetailsService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String token = jwtService.generateToken(userDetails);

        return ResponseEntity.ok(new LoginResponse(token));
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya esta registrado");
        }

        Rol rol = rolRepository.findByNombre(ROL_REGISTRO_PUBLICO)
                .orElseThrow(() -> new IllegalStateException("Falta seedear el rol " + ROL_REGISTRO_PUBLICO));

        Usuario usuario = new Usuario();
        usuario.setNombre(request.nombre());
        usuario.setApellido(request.apellido());
        usuario.setDni(request.dni());
        usuario.setEmail(request.email());
        usuario.setPassword(passwordEncoder.encode(request.password()));
        usuario.setActivo(true);
        usuario.setRol(rol);
        usuarioRepository.save(usuario);

        UserDetails userDetails = userDetailsService.loadUserByUsername(usuario.getEmail());
        String token = jwtService.generateToken(userDetails);

        return ResponseEntity.status(HttpStatus.CREATED).body(new RegisterResponse(token));
    }
}
