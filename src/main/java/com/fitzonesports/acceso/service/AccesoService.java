package com.fitzonesports.acceso.service;

import com.fitzonesports.acceso.dto.AccesoResponse;
import com.fitzonesports.acceso.dto.AforoResponse;
import com.fitzonesports.acceso.dto.QrAccesoResponse;
import com.fitzonesports.acceso.dto.RegistrarIngresoRequest;
import com.fitzonesports.acceso.dto.RegistrarSalidaRequest;
import com.fitzonesports.acceso.model.RegistroAcceso;
import com.fitzonesports.acceso.repository.CodigoQrRepository;
import com.fitzonesports.acceso.repository.RegistroAccesoRepository;
import com.fitzonesports.sede.dto.SedeResponse;
import com.fitzonesports.sede.service.SedeService;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AccesoService {

    // Por ahora "puede ingresar" se decide por rol. Cuando exista la membresia, el cambio es solo este metodo.
    private static final Set<String> ROLES_CON_INGRESO = Set.of("SOCIO_ACTIVO", "GERENTE");
    private static final String ROL_RECEPCIONISTA = "RECEPCIONISTA";

    private final UsuarioService usuarioService;
    private final SedeService sedeService;
    private final CodigoQrRepository codigoQrRepository;
    private final RegistroAccesoRepository registroAccesoRepository;
    private final QrTokenService qrTokenService;
    private final Clock clock;

    /** Emite el QR del usuario autenticado; reemplaza al anterior, que deja de ser valido. */
    @Transactional
    public QrAccesoResponse generarQr(String email) {
        UsuarioResponse usuario = usuarioService.consultarPerfil(email);
        validarPuedeIngresar(usuario);

        QrTokenService.QrEmitido qr = qrTokenService.emitir(usuario.id());
        codigoQrRepository.guardar(usuario.id(), qr.token(), LocalDateTime.ofInstant(qr.venceEn(), clock.getZone()));
        return new QrAccesoResponse(qr.token(), OffsetDateTime.ofInstant(qr.venceEn(), clock.getZone()), usuario.id());
    }

    /** Valida el QR escaneado y abre el ingreso. Recepcion opera su sede; el gerente indica la sede. */
    @Transactional
    public AccesoResponse registrarIngreso(String emailOperador, RegistrarIngresoRequest request) {
        UsuarioResponse operador = usuarioService.consultarPerfil(emailOperador);
        Integer sedeId = resolverSede(operador, request.sedeId());

        Integer usuarioId = qrTokenService.validar(request.qrToken());
        codigoQrRepository.findByUsuarioId(usuarioId)
                .filter(emitido -> emitido.getToken().equals(request.qrToken()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "El QR ya no esta vigente: se emitio uno mas reciente"));

        UsuarioResponse titular = usuarioService.consultarParaAcceso(usuarioId);
        validarPuedeIngresar(titular);

        if (registroAccesoRepository.existsByUsuarioIdAndFechaHoraSalidaIsNull(usuarioId)) {
            throw ingresoAbierto();
        }
        RegistroAcceso registro;
        try {
            registro = registroAccesoRepository.saveAndFlush(RegistroAcceso.builder()
                    .usuarioId(usuarioId)
                    .sedeId(sedeId)
                    .fechaHoraIngreso(LocalDateTime.now(clock))
                    .build());
        } catch (DataIntegrityViolationException e) {
            // Dos escaneos simultaneos: el indice unico parcial rechaza el segundo.
            throw ingresoAbierto();
        }
        return AccesoResponse.from(registro,
                new AccesoResponse.Titular(titular.nombre(), titular.apellido(), titular.foto()), clock.getZone());
    }

    /** Cierra el acceso abierto: por id, o volviendo a escanear el QR del titular. Quien esta adentro siempre puede salir. */
    @Transactional
    public AccesoResponse registrarSalida(String emailOperador, RegistrarSalidaRequest request) {
        boolean porId = request.accesoId() != null;
        boolean porQr = request.qrToken() != null && !request.qrToken().isBlank();
        if (porId == porQr) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica accesoId o qrToken, uno solo");
        }

        UsuarioResponse operador = usuarioService.consultarPerfil(emailOperador);
        RegistroAcceso acceso = porId
                ? registroAccesoRepository.findById(request.accesoId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El acceso no existe"))
                : accesoAbiertoDelQr(request.qrToken());

        if (esRecepcionista(operador) && !acceso.getSedeId().equals(operador.sedeId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El acceso pertenece a otra sede");
        }
        if (acceso.getFechaHoraSalida() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El acceso ya tiene la salida registrada");
        }

        acceso.setFechaHoraSalida(LocalDateTime.now(clock));
        RegistroAcceso cerrado = registroAccesoRepository.save(acceso);
        UsuarioResponse titular = usuarioService.consultarParaAcceso(cerrado.getUsuarioId());
        return AccesoResponse.from(cerrado,
                new AccesoResponse.Titular(titular.nombre(), titular.apellido(), titular.foto()), clock.getZone());
    }

    /** Aforo informativo de la sede (RF-05): personas con ingreso abierto y capacidad maxima. */
    @Transactional(readOnly = true)
    public AforoResponse consultarAforo(String emailOperador, Integer sedeId) {
        UsuarioResponse operador = usuarioService.consultarPerfil(emailOperador);
        if (esRecepcionista(operador)) {
            validarSedePropia(operador, sedeId);
        }
        SedeResponse sede = sedeService.consultarSede(sedeId);
        long ocupacion = registroAccesoRepository.countBySedeIdAndFechaHoraSalidaIsNull(sedeId);
        return new AforoResponse(sedeId, (int) ocupacion, sede.capacidadMaxima(), OffsetDateTime.now(clock));
    }

    private RegistroAcceso accesoAbiertoDelQr(String qrToken) {
        Integer usuarioId = qrTokenService.validar(qrToken);
        codigoQrRepository.findByUsuarioId(usuarioId)
                .filter(emitido -> emitido.getToken().equals(qrToken))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "El QR ya no esta vigente: se emitio uno mas reciente"));
        return registroAccesoRepository.findByUsuarioIdAndFechaHoraSalidaIsNull(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "El usuario no tiene un ingreso abierto"));
    }

    private boolean esRecepcionista(UsuarioResponse usuario) {
        return ROL_RECEPCIONISTA.equals(usuario.rol());
    }

    private void validarSedePropia(UsuarioResponse recepcionista, Integer sedeId) {
        if (!sedeId.equals(recepcionista.sedeId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Recepcion solo opera su propia sede");
        }
    }

    private Integer resolverSede(UsuarioResponse operador, Integer sedeSolicitada) {
        if (esRecepcionista(operador)) {
            if (sedeSolicitada != null) {
                validarSedePropia(operador, sedeSolicitada);
            }
            return operador.sedeId();
        }
        if (sedeSolicitada == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica la sede del ingreso");
        }
        if (!sedeService.existe(sedeSolicitada)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La sede no existe");
        }
        return sedeSolicitada;
    }

    private void validarPuedeIngresar(UsuarioResponse usuario) {
        if (!usuario.activo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El usuario esta inactivo");
        }
        if (!ROLES_CON_INGRESO.contains(usuario.rol())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El usuario no esta habilitado para ingresar");
        }
    }

    private ResponseStatusException ingresoAbierto() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "El usuario ya tiene un ingreso abierto");
    }
}
