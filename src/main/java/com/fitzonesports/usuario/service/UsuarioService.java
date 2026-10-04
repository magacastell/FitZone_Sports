package com.fitzonesports.usuario.service;

import com.fitzonesports.usuario.dto.RegisterRequest;
import com.fitzonesports.auth.model.Rol;
import com.fitzonesports.auth.model.Sede;
import com.fitzonesports.auth.repository.RolRepository;
import com.fitzonesports.auth.repository.SedeRepository;
import com.fitzonesports.usuario.dto.ActualizarPerfilRequest;
import com.fitzonesports.usuario.dto.ActualizarUsuarioRequest;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.model.Usuario;
import com.fitzonesports.usuario.repository.UsuarioRepository;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    // Rol asignado a todo alta hecha via /auth/register: es un endpoint publico,
    // asi que nunca deja elegir un rol interno (RECEPCIONISTA, GERENTE, etc.).
    private static final String ROL_REGISTRO_PUBLICO = "CLIENTE_EXTERNO";

    private static final String ROL_RECEPCIONISTA = "RECEPCIONISTA";
    // Roles que recepcion puede modificar; el personal (recepcion/gerente) solo lo gestiona el gerente.
    private static final Set<String> ROLES_GESTIONABLES_POR_RECEPCION = Set.of("SOCIO_ACTIVO", "CLIENTE_EXTERNO");

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final SedeRepository sedeRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Usuario registrarCliente(RegisterRequest request) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya esta registrado");
        }

        Rol rol = rolRepository.findByNombre(ROL_REGISTRO_PUBLICO)
                .orElseThrow(() -> new IllegalStateException("Falta seedear el rol " + ROL_REGISTRO_PUBLICO));
        Sede sede = sedeRepository.findById(request.sedeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La sede no existe"));

        Usuario usuario = Usuario.builder()
                .nombre(request.nombre())
                .apellido(request.apellido())
                .dni(request.dni())
                .email(request.email())
                .contrasenia(passwordEncoder.encode(request.password()))
                .rol(rol)
                .sede(sede)
                .build();
        return usuarioRepository.save(usuario);
    }

    @Transactional(readOnly = true)
    public UsuarioResponse consultarPerfil(String email) {
        return UsuarioResponse.from(cargarPorEmail(email));
    }

    @Transactional
    public UsuarioResponse actualizarPerfil(String email, ActualizarPerfilRequest request) {
        Usuario usuario = cargarPorEmail(email);
        aplicarDatos(usuario, request.nombre(), request.apellido(), request.foto());
        return UsuarioResponse.from(usuario);
    }

    /** Recepcion solo ve su sede; el gerente ve todas y puede filtrar por sede. */
    @Transactional(readOnly = true)
    public List<UsuarioResponse> listarUsuarios(String emailSolicitante, Integer sedeId) {
        Usuario solicitante = cargarPorEmail(emailSolicitante);
        Integer sedeFiltro = sedeId;
        if (esRecepcionista(solicitante)) {
            if (sedeId != null && !sedeId.equals(solicitante.getSede().getId())) {
                throw sedeAjena();
            }
            sedeFiltro = solicitante.getSede().getId();
        }
        List<Usuario> usuarios = sedeFiltro == null
                ? usuarioRepository.findAll()
                : usuarioRepository.findBySedeId(sedeFiltro);
        return usuarios.stream().map(UsuarioResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse consultarUsuario(String emailSolicitante, Integer usuarioId) {
        Usuario solicitante = cargarPorEmail(emailSolicitante);
        Usuario usuario = cargarPorId(usuarioId);
        validarSede(solicitante, usuario);
        return UsuarioResponse.from(usuario);
    }

    @Transactional
    public UsuarioResponse actualizarUsuario(String emailSolicitante, Integer usuarioId,
            ActualizarUsuarioRequest request) {
        Usuario solicitante = cargarPorEmail(emailSolicitante);
        Usuario usuario = cargarPorId(usuarioId);
        validarSede(solicitante, usuario);

        if (esRecepcionista(solicitante)
                && !ROLES_GESTIONABLES_POR_RECEPCION.contains(usuario.getRol().getNombre())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Recepcion no puede modificar usuarios del personal");
        }
        if (Boolean.FALSE.equals(request.activo()) && solicitante.getId().equals(usuario.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No podes desactivar tu propia cuenta");
        }

        aplicarDatos(usuario, request.nombre(), request.apellido(), request.foto());
        if (request.activo() != null) {
            usuario.setActivo(request.activo());
        }
        return UsuarioResponse.from(usuario);
    }

    private void aplicarDatos(Usuario usuario, String nombre, String apellido, String foto) {
        if (nombre != null) {
            usuario.setNombre(nombre.trim());
        }
        if (apellido != null) {
            usuario.setApellido(apellido.trim());
        }
        if (foto != null) {
            usuario.setFoto(foto);
        }
    }

    private void validarSede(Usuario solicitante, Usuario objetivo) {
        if (esRecepcionista(solicitante)
                && !solicitante.getSede().getId().equals(objetivo.getSede().getId())) {
            throw sedeAjena();
        }
    }

    private boolean esRecepcionista(Usuario usuario) {
        return ROL_RECEPCIONISTA.equals(usuario.getRol().getNombre());
    }

    private ResponseStatusException sedeAjena() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "El usuario pertenece a otra sede");
    }

    private Usuario cargarPorEmail(String email) {
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El usuario no existe"));
    }

    private Usuario cargarPorId(Integer id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El usuario no existe"));
    }
}
