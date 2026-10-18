package com.fitzonesports.membresia.service;

import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.model.*;
import com.fitzonesports.membresia.repository.*;
import com.fitzonesports.pago.service.CobroMembresiaService;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MembresiaService {
    private final MembresiaRepository membresias;
    private final PeriodoMembresiaRepository periodos;
    private final PlanMembresiaRepository planes;
    private final UsuarioService usuarios;
    private final CobroMembresiaService cobros;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    public MembresiaService(MembresiaRepository membresias, PeriodoMembresiaRepository periodos,
            PlanMembresiaRepository planes, UsuarioService usuarios, CobroMembresiaService cobros,
            JdbcTemplate jdbc, Clock clock) {
        this.membresias = membresias;
        this.periodos = periodos;
        this.planes = planes;
        this.usuarios = usuarios;
        this.cobros = cobros;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Transactional(readOnly=true)
    public MembresiaResponse consultarPropia(String email) {
        var usuario = usuarios.consultarPerfil(email);
        validarActivo(usuario);
        return respuesta(membresias.findByUsuarioId(usuario.id()).orElseThrow(() -> error(404,"No tenes una membresia")));
    }

    @Transactional(readOnly=true)
    public MembresiaResponse consultarPorId(String email, Integer id) {
        var operador = usuarios.consultarPerfil(email);
        validarActivo(operador);
        var membresia = cargar(id);
        validarAdministracion(operador, membresia);
        return respuesta(membresia);
    }

    @Transactional
    public MembresiaResponse contratar(String email, CrearMembresiaRequest request, UUID clave) {
        var usuario = usuarios.consultarPerfil(email);
        bloquearUsuario(usuario.id());
        usuario = usuarios.consultarParaAcceso(usuario.id());
        validarActivo(usuario);
        validarCliente(usuario);
        String operacion = clave(usuario.id(), "alta", clave);
        var repetido = periodos.findByClaveOperacion(operacion);
        if (repetido.isPresent()) {
            validarReintento(repetido.get(), request.planId());
            return respuesta(cargar(repetido.get().getMembresiaId()));
        }
        if (membresias.findByUsuarioId(usuario.id()).isPresent()) {
            throw error(409,"Ya tenes una membresia; usa renovaciones para contratar otro periodo");
        }
        var plan = planActivo(request.planId());
        var ahora = LocalDateTime.now(clock);
        var membresia = new Membresia();
        membresia.setUsuarioId(usuario.id());
        membresia.setSedeId(usuario.sedeId());
        membresia.setPlanId(plan.getId());
        membresia.setFechaInicio(ahora);
        membresia.setFechaFin(ahora.plusMonths(plan.getDuracionMeses()));
        membresia.setEstado("ACTIVA");
        membresias.saveAndFlush(membresia);
        agregarPeriodo(membresia, plan, operacion);
        return respuesta(membresia);
    }

    @Transactional
    public MembresiaResponse renovar(String email, Integer id, RenovarMembresiaRequest request, UUID clave) {
        var operador = usuarios.consultarPerfil(email);
        validarActivo(operador);
        var titularId = cargar(id).getUsuarioId();
        bloquearUsuario(titularId);
        var membresia = cargar(id);
        validarPropietario(operador, membresia);
        validarActivo(usuarios.consultarParaAcceso(titularId));
        String operacion = clave(titularId,"renovacion",clave);
        var repetido = periodos.findByClaveOperacion(operacion);
        if (repetido.isPresent()) {
            validarReintento(repetido.get(), request.planId());
            return respuesta(membresia);
        }
        if (membresia.isSuspendida()) throw error(409,"La membresia esta suspendida; debe reactivarla administracion");
        var plan = planActivo(request.planId() == null ? membresia.getPlanId() : request.planId());
        agregarPeriodo(membresia,plan,operacion);
        return respuesta(membresia);
    }

    @Transactional
    public MembresiaResponse actualizarEstado(String email, Integer id, ActualizarEstadoMembresiaRequest request) {
        var operador = usuarios.consultarPerfil(email);
        validarActivo(operador);
        bloquearUsuario(cargar(id).getUsuarioId());
        var membresia = cargar(id);
        validarAdministracion(operador,membresia);
        boolean suspender = request.accion() == ActualizarEstadoMembresiaRequest.Accion.SUSPENDER;
        if (membresia.isSuspendida() != suspender) {
            membresia.setSuspendida(suspender);
            actualizarEstadoGuardado(membresia);
            jdbc.update("INSERT INTO auditoria_membresia(membresia_id,operador_id,accion,motivo,fecha) VALUES (?,?,?,?,?)",
                    id,operador.id(),request.accion().name(),request.motivo().strip(),LocalDateTime.now(clock));
        }
        return respuesta(membresia);
    }

    @Transactional
    public MembresiaResponse configurarAutomatica(String email, Integer id, RenovacionAutomaticaRequest request) {
        var operador = usuarios.consultarPerfil(email);
        validarActivo(operador);
        bloquearUsuario(cargar(id).getUsuarioId());
        var membresia = cargar(id);
        validarPropietario(operador,membresia);
        if (request.habilitada()) {
            if (membresia.isSuspendida()) throw error(409,"No se puede habilitar la renovacion de una membresia suspendida");
            if (periodos.findByMembresiaIdOrderByInicioAsc(id).stream().noneMatch(p->!p.isCancelado()))
                throw error(409,"Primero debes contratar un nuevo periodo mediante renovacion manual");
            planActivo(membresia.getPlanId());
            if (membresia.getTokenRenovacion() == null) membresia.setTokenRenovacion("fake-metodo-" + UUID.randomUUID());
        }
        membresia.setRenovacionAutomatica((short)(request.habilitada() ? 1 : 0));
        if (!request.habilitada()) membresia.setTokenRenovacion(null);
        return respuesta(membresia);
    }

    /** Arrepentimiento del periodo pagado durante sus primeras 24 h; conserva el historial. */
    @Transactional
    public MembresiaResponse cancelarPeriodo(String email,Integer id,Integer periodoId) {
        var operador=usuarios.consultarPerfil(email);
        validarActivo(operador);
        bloquearUsuario(cargar(id).getUsuarioId());
        var membresia=cargar(id);
        validarPropietario(operador,membresia);
        var periodo=periodos.findById(periodoId).filter(p->p.getMembresiaId().equals(id))
                .orElseThrow(()->error(404,"El periodo no existe en esta membresia"));
        if (periodo.isCancelado()) return respuesta(membresia);
        if (periodo.getPagoId()==null) throw error(409,"El periodo historico no tiene un pago reembolsable");
        if (!LocalDateTime.now(clock).isBefore(cobros.fechaCobro(periodo.getPagoId()).plusHours(24)))
            throw error(409,"Finalizo el plazo de arrepentimiento de 24 horas");
        cobros.reembolsar(periodo.getPagoId());
        periodo.setCancelado(true);
        periodos.saveAndFlush(periodo);
        var ultimo=periodos.findByMembresiaIdOrderByInicioAsc(id).stream().filter(p->!p.isCancelado())
                .max(Comparator.comparing(PeriodoMembresia::getFin));
        ultimo.ifPresent(p->{ membresia.setFechaFin(p.getFin()); membresia.setPlanId(p.getPlanId()); });
        membresia.setRenovacionAutomatica((short)0);
        membresia.setTokenRenovacion(null);
        actualizarEstadoGuardado(membresia);
        return respuesta(membresia);
    }

    /** Consulta publica para M2/M3/M4: sin restriccion por sede ni dependencia del rol legado. */
    @Transactional(readOnly=true)
    public boolean tieneMembresiaVigente(Integer usuarioId) {
        if (!usuarios.consultarParaAcceso(usuarioId).activo()) return false;
        return membresias.findByUsuarioId(usuarioId)
                .filter(m -> !m.isSuspendida()).map(m -> tienePeriodoVigente(m.getId())).orElse(false);
    }

    @Transactional(readOnly=true)
    public List<Integer> renovacionesAutomaticas() {
        return membresias.findByRenovacionAutomatica((short)1).stream().map(Membresia::getId).toList();
    }

    /** Cada cuenta se procesa en su propia transaccion y bajo el mismo bloqueo que las renovaciones manuales. */
    @Transactional
    public void procesarAutomatica(Integer id) {
        bloquearUsuario(cargar(id).getUsuarioId());
        var membresia = cargar(id);
        actualizarEstadoGuardado(membresia);
        if (membresia.getRenovacionAutomatica() != 1 || membresia.isSuspendida()
                || membresia.getFechaFin().isAfter(LocalDateTime.now(clock))) return;
        if (!usuarios.consultarParaAcceso(membresia.getUsuarioId()).activo()) return;
        var plan = planes.findById(membresia.getPlanId()).filter(PlanMembresia::isActivo);
        if (plan.isEmpty() || membresia.getTokenRenovacion() == null) {
            membresia.setRenovacionAutomatica((short)0);
            return;
        }
        String operacion = "auto:" + id + ":" + membresia.getFechaFin();
        if (periodos.findByClaveOperacion(operacion).isEmpty()) agregarPeriodo(membresia,plan.get(),operacion);
    }

    @Transactional
    public void actualizarVencimientos() {
        var ahora=LocalDateTime.now(clock);
        String estado="CASE WHEN m.suspendida THEN 'SUSPENDIDA' WHEN EXISTS (SELECT 1 FROM periodo_membresia p "
                + "WHERE p.membresia_id=m.id AND NOT p.cancelado AND p.inicio<=? AND p.fin>?) THEN 'ACTIVA' ELSE 'VENCIDA' END";
        jdbc.update("UPDATE membresia m SET estado="+estado+" WHERE m.estado IS DISTINCT FROM "+estado,ahora,ahora,ahora,ahora);
    }

    private void agregarPeriodo(Membresia membresia, PlanMembresia plan, String operacion) {
        var ahora = LocalDateTime.now(clock);
        var historial = periodos.findByMembresiaIdOrderByInicioAsc(membresia.getId());
        var inicio = historial.stream().filter(p -> !p.isCancelado()).map(PeriodoMembresia::getFin).max(Comparator.naturalOrder())
                .filter(fin -> fin.isAfter(ahora)).orElse(ahora);
        var pagoId = cobros.cobrar(membresia.getUsuarioId(),membresia.getId(),plan.getPrecio(),operacion,ahora);
        var periodo = new PeriodoMembresia();
        periodo.setMembresiaId(membresia.getId());
        periodo.setPlanId(plan.getId());
        periodo.setNombrePlan(plan.getNombre());
        periodo.setDuracionMeses(plan.getDuracionMeses());
        periodo.setPrecio(plan.getPrecio());
        periodo.setInicio(inicio);
        periodo.setFin(inicio.plusMonths(plan.getDuracionMeses()));
        periodo.setPagoId(pagoId);
        periodo.setClaveOperacion(operacion);
        periodos.saveAndFlush(periodo);
        membresia.setPlanId(plan.getId());
        membresia.setFechaFin(periodo.getFin());
        actualizarEstadoGuardado(membresia);
    }

    private MembresiaResponse respuesta(Membresia membresia) {
        var ahora = LocalDateTime.now(clock);
        var historial = periodos.findByMembresiaIdOrderByInicioAsc(membresia.getId()).stream().map(p ->
                new MembresiaResponse.Periodo(p.getId(),p.getPlanId(),p.getNombrePlan(),p.getDuracionMeses(),p.getPrecio(),
                        p.getInicio().atZone(clock.getZone()).toOffsetDateTime(),p.getFin().atZone(clock.getZone()).toOffsetDateTime(),
                        p.getPagoId(), p.isCancelado() ? "CANCELADA" : !p.getFin().isAfter(ahora) ? "VENCIDA" : p.getInicio().isAfter(ahora) ? "PROGRAMADA"
                                : membresia.isSuspendida() ? "SUSPENDIDA" : "ACTIVA")).toList();
        var vigente = historial.stream().filter(p -> !"CANCELADA".equals(p.estado()) && !p.inicio().toLocalDateTime().isAfter(ahora)
                && p.fin().toLocalDateTime().isAfter(ahora)).findFirst().orElse(null);
        String estado = membresia.isSuspendida() ? "SUSPENDIDA" : vigente == null ? "VENCIDA" : "ACTIVA";
        return new MembresiaResponse(membresia.getId(),membresia.getUsuarioId(),membresia.getSedeId(),membresia.getPlanId(),
                estado,membresia.getRenovacionAutomatica()==1,vigente,historial);
    }

    private boolean tienePeriodoVigente(Integer id) {
        var ahora = LocalDateTime.now(clock);
        return periodos.findByMembresiaIdOrderByInicioAsc(id).stream()
                .anyMatch(p -> !p.isCancelado() && !p.getInicio().isAfter(ahora) && p.getFin().isAfter(ahora));
    }
    private void actualizarEstadoGuardado(Membresia m) {
        m.setEstado(m.isSuspendida() ? "SUSPENDIDA" : tienePeriodoVigente(m.getId()) ? "ACTIVA" : "VENCIDA");
    }
    private Membresia cargar(Integer id) { return membresias.findById(id).orElseThrow(() -> error(404,"La membresia no existe")); }
    private PlanMembresia planActivo(Integer id) {
        var p = planes.findById(id).orElseThrow(() -> error(404,"El plan no existe"));
        if (!p.isActivo()) throw error(409,"El plan esta inactivo");
        return p;
    }
    private void bloquearUsuario(Integer id) {
        jdbc.queryForObject("SELECT id FROM usuario WHERE id = ? FOR UPDATE",Integer.class,id);
        // Hibernate puede haber cargado la cuenta antes de esperar el bloqueo.
        // Refrescar garantiza que otra renovacion ya confirmada sea visible.
        membresias.findByUsuarioId(id).ifPresent(m -> entityManager.refresh(m));
    }
    private void validarActivo(UsuarioResponse u) { if (!u.activo()) throw error(403,"El usuario esta inactivo"); }
    private void validarCliente(UsuarioResponse u) {
        if (!Set.of("CLIENTE_EXTERNO","SOCIO_ACTIVO").contains(u.rol())) throw error(403,"Solo los clientes pueden contratar membresias");
    }
    private void validarPropietario(UsuarioResponse u,Membresia m) {
        if (!u.id().equals(m.getUsuarioId()) && !"GERENTE".equals(u.rol())) throw error(403,"La membresia pertenece a otro usuario");
    }
    private void validarAdministracion(UsuarioResponse u,Membresia m) {
        if ("GERENTE".equals(u.rol())) return;
        if (!"RECEPCIONISTA".equals(u.rol()) || !u.sedeId().equals(usuarios.consultarParaAcceso(m.getUsuarioId()).sedeId()))
            throw error(403,"Recepcion solo administra membresias de su sede");
    }
    private String clave(Integer usuario,String tipo,UUID clave) {
        if (clave == null) throw error(400,"Idempotency-Key es obligatorio");
        return tipo + ":" + usuario + ":" + clave;
    }
    private void validarReintento(PeriodoMembresia p,Integer planId) {
        if (planId != null && !planId.equals(p.getPlanId())) throw error(409,"La clave ya se uso con otro plan");
    }
    private ResponseStatusException error(int status,String mensaje) { return new ResponseStatusException(HttpStatus.valueOf(status),mensaje); }
}
