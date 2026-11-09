package com.fitzonesports.usuario;

import com.fitzonesports.usuario.dto.RegisterRequest;
import com.fitzonesports.usuario.service.*;
import com.fitzonesports.usuario.repository.UsuarioRepository;
import com.fitzonesports.auth.model.Rol;
import com.fitzonesports.auth.repository.RolRepository;
import com.fitzonesports.sede.repository.SedeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RegistroConflictosTest {
    @Test void traduceSoloUnicidadConocidaYConservaErroresAjenos() {
        for (String nombre : new String[]{"usuario_dni_key", "usuario_email_key", "otra_restriccion"}) {
            var usuarios = mock(UsuarioRepository.class);
            var roles = mock(RolRepository.class);
            var fotos = mock(FotoPerfilService.class);
            when(roles.findByNombre("USUARIO")).thenReturn(java.util.Optional.of(new Rol()));
            var causa = mock(org.hibernate.exception.ConstraintViolationException.class);
            when(causa.getSQLState()).thenReturn("23505");
            when(causa.getConstraintName()).thenReturn(nombre);
            var error = new DataIntegrityViolationException("detalle interno", causa);
            when(usuarios.saveAndFlush(any())).thenThrow(error);
            var service = new UsuarioService(usuarios, roles, mock(SedeRepository.class), mock(PasswordEncoder.class), fotos);
            var request = new RegisterRequest("Ana", "Prueba", "dni-prueba", "registro@fitzone.test", "clave-de-prueba");
            if (nombre.equals("otra_restriccion")) {
                assertSame(error, assertThrows(DataIntegrityViolationException.class, () -> service.registrarCliente(request, null)));
            } else {
                var respuesta = assertThrows(ResponseStatusException.class, () -> service.registrarCliente(request, null));
                assertEquals(409, respuesta.getStatusCode().value());
                assertEquals(nombre.equals("usuario_dni_key") ? "El DNI ya esta registrado" : "El email ya esta registrado", respuesta.getReason());
            }
            verify(fotos, never()).guardar(any(), any());
        }
    }
}
