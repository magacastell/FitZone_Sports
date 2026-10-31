package com.fitzonesports.membresia;

import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.service.MembresiaService;
import com.fitzonesports.acceso.service.AccesoService;
import com.fitzonesports.acceso.dto.RegistrarIngresoRequest;
import com.fitzonesports.acceso.dto.RegistrarSalidaRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="PLAN_TEST_DB_URL",matches=".+")
@SpringBootTest(properties={"spring.profiles.active=staging", "spring.datasource.url=${PLAN_TEST_DB_URL}",
        "spring.datasource.username=postgres", "spring.datasource.password=",
        "jwt.secret=clave-exclusiva-de-pruebas-de-membresias-1234567890", "membresias.renovacion.inicio-ms=3600000"})
@Transactional
class MembresiaIntegrationTest {
    @Autowired MembresiaService service;
    @Autowired AccesoService accesos;
    @Autowired JdbcTemplate jdbc;
    @Autowired Reloj reloj;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired org.springframework.web.context.WebApplicationContext contexto;
    @Autowired com.fitzonesports.auth.service.JwtService jwt;
    @Autowired com.fitzonesports.auth.service.CustomUserDetailsService detalles;
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    com.fitzonesports.pago.pasarela.PasarelaPago pasarela;
    Integer sede, otraSede, usuario, plan;
    String email, recepcion, gerente;

    @TestConfiguration
    static class Config {
        @Bean @Primary Reloj reloj() { return new Reloj(); }
    }
    static class Reloj extends Clock {
        private volatile Instant instante = Instant.parse("2026-01-31T15:00:00Z");
        void fijar(String valor) { instante = Instant.parse(valor); }
        public ZoneId getZone() { return ZoneId.of("America/Argentina/Buenos_Aires"); }
        public Clock withZone(ZoneId zone) { return Clock.fixed(instante,zone); }
        public Instant instant() { return instante; }
    }

    @BeforeEach void preparar() {
        org.mockito.Mockito.when(pasarela.cobrar(org.mockito.ArgumentMatchers.any())).thenAnswer(inv ->
                new com.fitzonesports.pago.pasarela.PasarelaPagoFake().cobrar(inv.getArgument(0)));
        org.mockito.Mockito.when(pasarela.reembolsar(org.mockito.ArgumentMatchers.any())).thenAnswer(inv ->
                new com.fitzonesports.pago.pasarela.PasarelaPagoFake().reembolsar(inv.getArgument(0)));
        reloj.fijar("2026-01-31T15:00:00Z");
        String sufijo = UUID.randomUUID().toString();
        sede = jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,10) RETURNING id",Integer.class,"Sede "+sufijo);
        otraSede = jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,10) RETURNING id",Integer.class,"Otra "+sufijo);
        email="cliente-"+sufijo+"@test.com"; recepcion="recepcion-"+sufijo+"@test.com"; gerente="gerente-"+sufijo+"@test.com";
        usuario=crearUsuario(email,"USUARIO",sede);
        crearUsuario(recepcion,"RECEPCIONISTA",otraSede);
        crearUsuario(gerente,"GERENTE",otraSede);
        plan=jdbc.queryForObject("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES (?,1,15000.50) RETURNING id",Integer.class,"Mensual "+sufijo);
    }
    private Integer crearUsuario(String mail,String rol,Integer sedeId) {
        return jdbc.queryForObject("INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) "
                + "VALUES (?,?,(SELECT id FROM rol WHERE nombre=?),?,'Test','Test','test') RETURNING id",Integer.class,mail,mail,rol,sedeId);
    }
    private MembresiaResponse contratar() { return service.contratar(email,new CrearMembresiaRequest(plan,null),UUID.randomUUID()); }
    private void status(int esperado,org.junit.jupiter.api.function.Executable operacion) {
        assertEquals(esperado,assertThrows(ResponseStatusException.class,operacion).getStatusCode().value());
    }

    @Test void contratacionCobraUnaVezYConservaMesCalendario() {
        UUID clave=UUID.randomUUID();
        var m=service.contratar(email,new CrearMembresiaRequest(plan,null),clave);
        var replay=service.contratar(email,new CrearMembresiaRequest(plan,null),clave);
        assertEquals(m.id(),replay.id());
        assertEquals(1,replay.periodos().size());
        assertEquals(LocalDate.of(2026,2,28),m.periodoVigente().fin().toLocalDate());
        assertEquals("ACTIVA",m.estado());
        assertTrue(service.tieneMembresiaVigente(usuario));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
        assertEquals("APROBADO",jdbc.queryForObject("SELECT estado FROM pago WHERE usuarioid=?",String.class,usuario));
        assertNotNull(accesos.generarQr(email)); // USUARIO con membresia tambien es socio.
    }

    @Test void renovacionAnticipadaConservaPrecioAnteriorEHistorial() {
        var m=contratar();
        jdbc.update("UPDATE plan_membresia SET precio=20000.75,nombre=? WHERE id=?","Nuevo "+UUID.randomUUID(),plan);
        entityManager.clear();
        UUID clave=UUID.randomUUID();
        var renovada=service.renovar(email,m.id(),new RenovarMembresiaRequest(null),clave);
        assertEquals(2,renovada.periodos().size());
        assertEquals(new java.math.BigDecimal("15000.50"),renovada.periodos().get(0).precio());
        assertEquals(new java.math.BigDecimal("20000.75"),renovada.periodos().get(1).precio());
        assertEquals("PROGRAMADA",renovada.periodos().get(1).estado());
        assertEquals(renovada.periodos().get(0).fin(),renovada.periodos().get(1).inicio());
        assertEquals(2,service.renovar(email,m.id(),new RenovarMembresiaRequest(null),clave).periodos().size());
    }

    @Test void vencimientoExactoYRenovacionSinCobroRetroactivo() {
        var m=contratar();
        reloj.fijar("2026-02-28T15:00:00Z");
        assertFalse(service.tieneMembresiaVigente(usuario));
        assertEquals("VENCIDA",service.consultarPropia(email).estado());
        status(403,()->accesos.generarQr(email));
        reloj.fijar("2026-03-05T15:00:00Z");
        var nueva=service.renovar(email,m.id(),new RenovarMembresiaRequest(null),UUID.randomUUID());
        assertEquals(LocalDate.of(2026,3,5),nueva.periodoVigente().inicio().toLocalDate());
    }

    @Test void vencimientoDerivadoRechazaQrPrevioYConservaSedeHistorialYPdf() {
        var m=contratar();
        var original=comprobarPdf(m.periodoVigente().pagoId());
        reloj.fijar("2026-02-28T14:59:59Z");
        var qr=accesos.generarQr(email);
        reloj.fijar("2026-02-28T15:00:00Z");
        var vencida=service.consultarPropia(email);
        assertEquals("ACTIVA",jdbc.queryForObject("SELECT estado FROM membresia WHERE id=?",String.class,m.id()));
        assertEquals("VENCIDA",vencida.estado());
        assertNull(vencida.periodoVigente());
        assertEquals(1,vencida.periodos().size());
        assertEquals("VENCIDA",vencida.periodos().get(0).estado());
        assertEquals(sede,jdbc.queryForObject("SELECT sedeid FROM usuario WHERE id=?",Integer.class,usuario));
        assertEquals(sede,vencida.sedeId());
        status(403,()->accesos.generarQr(email));
        status(403,()->accesos.registrarIngreso(recepcion,new RegistrarIngresoRequest(qr.token(),null)));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM registro_acceso WHERE usuarioid=?",Integer.class,usuario));
        assertArrayEquals(original,comprobarPdf(m.periodoVigente().pagoId()));
    }

    private byte[] comprobarPdf(Integer pago) {
        return contexto.getBean(com.fitzonesports.pago.service.ComprobanteService.class).descargar(email,pago).contenido();
    }

    @Test void renovacionVencidaReplayNoDuplicaPagoPeriodoNiComprobanteNiReasignaSede() {
        var m=contratar();
        reloj.fijar("2026-03-15T15:00:00Z");
        var clave=UUID.randomUUID();
        var renovada=service.renovar(email,m.id(),new RenovarMembresiaRequest(plan),clave);
        assertEquals("ACTIVA",renovada.estado());
        assertEquals(LocalDateTime.of(2026,3,15,12,0),renovada.periodoVigente().inicio().toLocalDateTime());
        assertEquals(LocalDateTime.of(2026,4,15,12,0),renovada.periodoVigente().fin().toLocalDateTime());
        assertTrue(renovada.periodos().get(0).fin().isBefore(renovada.periodoVigente().inicio()));
        assertEquals(2,service.renovar(email,m.id(),new RenovarMembresiaRequest(plan),clave).periodos().size());
        status(409,()->service.renovar(email,m.id(),new RenovarMembresiaRequest(Integer.MAX_VALUE),clave));
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM comprobante c JOIN pago p ON p.id=c.pagoid WHERE p.usuarioid=?",Integer.class,usuario));
        assertEquals(sede,jdbc.queryForObject("SELECT sedeid FROM usuario WHERE id=?",Integer.class,usuario));
        assertEquals(m.sedeId(),renovada.sedeId());
        assertNotNull(accesos.registrarIngreso(recepcion,new RegistrarIngresoRequest(accesos.generarQr(email).token(),null)));
    }

    @Test void periodoProgramadoMantieneContinuidadExactamenteAlFinalizarElAnterior() {
        var m=contratar();
        var renovada=service.renovar(email,m.id(),new RenovarMembresiaRequest(null),UUID.randomUUID());
        assertEquals("PROGRAMADA",renovada.periodos().get(1).estado());
        reloj.fijar(m.periodoVigente().fin().toInstant().toString());
        var siguiente=service.consultarPropia(email);
        assertEquals("ACTIVA",siguiente.estado());
        assertEquals(renovada.periodos().get(1).id(),siguiente.periodoVigente().id());
        assertEquals("VENCIDA",siguiente.periodos().get(0).estado());
        assertTrue(service.tieneMembresiaVigente(usuario));
        assertNotNull(accesos.generarQr(email));
    }

    @Test void reactivarDespuesDelVencimientoNoRegalaDiasNiBorraLaSede() {
        var m=contratar();
        service.actualizarEstado(gerente,m.id(),new ActualizarEstadoMembresiaRequest(ActualizarEstadoMembresiaRequest.Accion.SUSPENDER,"Control de prueba"));
        assertNotNull(service.consultarPropia(email).periodoVigente());
        reloj.fijar("2026-03-15T15:00:00Z");
        assertEquals("SUSPENDIDA",service.consultarPropia(email).estado());
        status(409,()->service.renovar(email,m.id(),new RenovarMembresiaRequest(null),UUID.randomUUID()));
        var reactivada=service.actualizarEstado(gerente,m.id(),new ActualizarEstadoMembresiaRequest(ActualizarEstadoMembresiaRequest.Accion.REACTIVAR,"Control finalizado"));
        assertEquals("VENCIDA",reactivada.estado());
        assertNull(reactivada.periodoVigente());
        assertEquals(m.periodoVigente().fin(),reactivada.periodos().get(0).fin());
        assertEquals(sede,jdbc.queryForObject("SELECT sedeid FROM usuario WHERE id=?",Integer.class,usuario));
        status(403,()->accesos.generarQr(email));
    }

    @Test void jobActualizaEstadosPersistidosYNoSóloLaRespuesta() {
        var m=contratar();
        reloj.fijar("2026-02-28T15:00:00Z");
        service.actualizarVencimientos();
        assertEquals("VENCIDA",jdbc.queryForObject("SELECT estado FROM membresia WHERE id=?",String.class,m.id()));
    }

    @Test void suspensionNoExtiendeVigenciaYRecepcionNoCruzaSedes() {
        var m=contratar();
        status(403,()->service.actualizarEstado(recepcion,m.id(),new ActualizarEstadoMembresiaRequest(ActualizarEstadoMembresiaRequest.Accion.SUSPENDER,"Prueba")));
        service.actualizarEstado(gerente,m.id(),new ActualizarEstadoMembresiaRequest(ActualizarEstadoMembresiaRequest.Accion.SUSPENDER,"Prueba"));
        assertFalse(service.tieneMembresiaVigente(usuario));
        status(403,()->accesos.generarQr(email));
        status(409,()->service.renovar(email,m.id(),new RenovarMembresiaRequest(null),UUID.randomUUID()));
        var reactivada=service.actualizarEstado(gerente,m.id(),new ActualizarEstadoMembresiaRequest(ActualizarEstadoMembresiaRequest.Accion.REACTIVAR,"Corregido"));
        assertEquals(m.periodoVigente().fin(),reactivada.periodoVigente().fin());
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM auditoria_membresia WHERE membresia_id=?",Integer.class,m.id()));
    }

    @Test void ajenosInactivosYPlanesDesactivadosNoObtienenVigencia() {
        var m=contratar();
        status(403,()->service.renovar(recepcion,m.id(),new RenovarMembresiaRequest(null),UUID.randomUUID()));
        jdbc.update("UPDATE plan_membresia SET activo=false WHERE id=?",plan);
        entityManager.clear();
        status(409,()->service.renovar(email,m.id(),new RenovarMembresiaRequest(null),UUID.randomUUID()));
        jdbc.update("UPDATE usuario SET activo=false WHERE id=?",usuario);
        entityManager.clear();
        status(403,()->service.consultarPropia(email));
    }

    @Test void automaticaRenuevaUnaSolaVezYSePuedeDeshabilitar() {
        var m=contratar();
        service.configurarAutomatica(email,m.id(),new RenovacionAutomaticaRequest(true));
        reloj.fijar("2026-02-28T15:00:00Z");
        service.procesarAutomatica(m.id());
        service.procesarAutomatica(m.id());
        var renovada=service.consultarPropia(email);
        assertEquals("ACTIVA",renovada.estado());
        assertEquals(2,renovada.periodos().size());
        service.configurarAutomatica(email,m.id(),new RenovacionAutomaticaRequest(false));
        reloj.fijar("2026-03-28T15:00:00Z");
        service.procesarAutomatica(m.id());
        assertEquals("VENCIDA",service.consultarPropia(email).estado());
        assertEquals(2,service.consultarPropia(email).periodos().size());
    }

    @Test void httpValidaJwtRolesYRespuestasReales() throws Exception {
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(contexto)
                .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
        String token=jwt.generateToken(detalles.loadUserByUsername(email));
        String tokenRecepcion=jwt.generateToken(detalles.loadUserByUsername(recepcion));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/membresias/me"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/membresias")
                .header("Authorization","Bearer "+tokenRecepcion).header("Idempotency-Key",UUID.randomUUID())
                .contentType("application/json").content("{\"planId\":"+plan+"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/membresias")
                .header("Authorization","Bearer "+token).header("Idempotency-Key",UUID.randomUUID())
                .contentType("application/json").content("{\"planId\":"+plan+"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.estado").value("ACTIVA"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.periodos[0].pagoId").isNumber());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/accesos/qr").header("Authorization","Bearer "+token))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        jdbc.update("UPDATE usuario SET activo=false WHERE id=?",usuario);
        entityManager.clear();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/membresias/me").header("Authorization","Bearer "+token))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
    }

    @Test void arrepentimientoDevuelvePagoUnaVezYNoBorraHistoria() {
        var m=contratar();
        var periodo=m.periodoVigente();
        service.cancelarPeriodo(email,m.id(),periodo.id());
        var cancelada=service.cancelarPeriodo(email,m.id(),periodo.id());
        assertFalse(service.tieneMembresiaVigente(usuario));
        assertEquals("CANCELADA",cancelada.periodos().get(0).estado());
        assertEquals("REEMBOLSADO",jdbc.queryForObject("SELECT estado FROM pago WHERE id=?",String.class,periodo.pagoId()));
        org.mockito.Mockito.verify(pasarela,org.mockito.Mockito.times(1)).reembolsar(org.mockito.ArgumentMatchers.any());
        var nueva=service.renovar(email,m.id(),new RenovarMembresiaRequest(null),UUID.randomUUID());
        assertEquals("ACTIVA",nueva.estado());
        assertEquals(2,nueva.periodos().size());
    }

    @Test void arrepentimientoCierraExactamenteALas24Horas() {
        var m=contratar();
        reloj.fijar("2026-02-01T15:00:00Z");
        status(409,()->service.cancelarPeriodo(email,m.id(),m.periodoVigente().id()));
        assertTrue(service.tieneMembresiaVigente(usuario));
    }

    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void migraV4ConMembresiaExistenteSinInventarPago() {
        String esquema="membresia_upgrade_"+UUID.randomUUID().toString().replace("-","");
        String url=System.getenv("PLAN_TEST_DB_URL");
        org.flywaydb.core.Flyway.configure().dataSource(url,"postgres","").schemas(esquema).target("4").load().migrate();
        jdbc.update("INSERT INTO "+esquema+".sede(id,nombre,capacidad_maxima) VALUES (1,'Historica',10)");
        jdbc.update("INSERT INTO "+esquema+".usuario(id,dni,email,rolid,sedeid,nombre,apellido,contrasenia) VALUES (1,'x','x',1,1,'x','x','x')");
        jdbc.update("INSERT INTO "+esquema+".plan_membresia(id,nombre,duracion_meses,precio) VALUES (1,'Original',3,10.25)");
        jdbc.update("INSERT INTO "+esquema+".membresia(fecha_inicio,estado,fecha_fin,renovacion_automatica,usuarioid,plan_membresiaid,sedeid) "
                + "VALUES ('2026-01-01','ACTIVA','2026-04-01',0,1,1,1)");
        org.flywaydb.core.Flyway.configure().dataSource(url,"postgres","").schemas(esquema).load().migrate();
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM "+esquema+".periodo_membresia",Integer.class));
        assertNull(jdbc.queryForObject("SELECT pago_id FROM "+esquema+".periodo_membresia",Integer.class));
        assertEquals(new java.math.BigDecimal("10.25"),jdbc.queryForObject("SELECT precio FROM "+esquema+".periodo_membresia",java.math.BigDecimal.class));
    }

    @AfterEach void limpiarFixturesFueraDeTransaccion() {
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) return;
        jdbc.update("DELETE FROM auditoria_membresia WHERE membresia_id IN (SELECT id FROM membresia WHERE usuarioid=?)",usuario);
        jdbc.update("DELETE FROM periodo_membresia WHERE membresia_id IN (SELECT id FROM membresia WHERE usuarioid=?)",usuario);
        jdbc.update("DELETE FROM detalle_facturacion WHERE comprobanteid IN (SELECT c.id FROM comprobante c JOIN pago p ON p.id=c.pagoid WHERE p.usuarioid=?)",usuario);
        jdbc.update("DELETE FROM comprobante WHERE pagoid IN (SELECT id FROM pago WHERE usuarioid=?)",usuario);
        jdbc.update("DELETE FROM reembolso_pago WHERE pago_id IN (SELECT id FROM pago WHERE usuarioid=?)",usuario);
        jdbc.update("DELETE FROM pago WHERE usuarioid=?",usuario);
        jdbc.update("DELETE FROM membresia WHERE usuarioid=?",usuario);
        jdbc.update("DELETE FROM usuario WHERE email IN (?,?,?)",email,recepcion,gerente);
        jdbc.update("DELETE FROM plan_membresia WHERE id=?",plan);
        jdbc.update("DELETE FROM sede WHERE id IN (?,?)",sede,otraSede);
    }

    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void cobroRechazadoRevierteAltaSinOtorgarVigencia() {
        org.mockito.Mockito.doReturn(new com.fitzonesports.pago.pasarela.ResultadoCobro(
                com.fitzonesports.pago.pasarela.ResultadoCobro.Estado.RECHAZADO,"rechazo","TEST"))
                .when(pasarela).cobrar(org.mockito.ArgumentMatchers.any());
        status(402,this::contratar);
        assertFalse(service.tieneMembresiaVigente(usuario));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM membresia WHERE usuarioid=?",Integer.class,usuario));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
    }

    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void reintentosConcurrentesCreanUnSoloCobroYPeriodo() throws Exception {
        UUID clave=UUID.randomUUID();
        var inicio=new java.util.concurrent.CountDownLatch(1);
        try (var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<MembresiaResponse> tarea=()->{
                if (!inicio.await(10,java.util.concurrent.TimeUnit.SECONDS)) throw new IllegalStateException("Timeout");
                return service.contratar(email,new CrearMembresiaRequest(plan,null),clave);
            };
            var a=pool.submit(tarea); var b=pool.submit(tarea); inicio.countDown();
            assertEquals(a.get(20,java.util.concurrent.TimeUnit.SECONDS).id(),b.get(20,java.util.concurrent.TimeUnit.SECONDS).id());
            assertEquals(1,service.consultarPropia(email).periodos().size());
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
        }
    }
    @Test void variasRenovacionesDistintasSeEncadenanYNoCambianAutoridad() {
        var primera=contratar();
        var segunda=service.renovar(email,primera.id(),new RenovarMembresiaRequest(plan),UUID.randomUUID());
        UUID clave=UUID.randomUUID();
        var tercera=service.renovar(email,primera.id(),new RenovarMembresiaRequest(plan),clave);
        assertEquals(3,tercera.periodos().size());
        assertEquals(primera.periodoVigente().fin(),segunda.periodos().get(1).inicio());
        assertEquals(segunda.periodos().get(1).fin(),tercera.periodos().get(2).inicio());
        assertEquals(3,service.renovar(email,primera.id(),new RenovarMembresiaRequest(plan),clave).periodos().size());
        assertEquals(3,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
        assertEquals("USUARIO",detalles.loadUserByUsername(email).getAuthorities().iterator().next().getAuthority().replace("ROLE_",""));
        reloj.fijar(primera.periodoVigente().fin().toInstant().toString());
        var limite=service.consultarPropia(email);
        assertEquals("ACTIVA",limite.estado());
        assertEquals(segunda.periodos().get(1).id(),limite.periodoVigente().id());
        assertNotNull(accesos.generarQr(email));
    }

    @Test void autoridadEstableYTokenAnteriorRechazado() throws Exception {
        var actual=detalles.loadUserByUsername(email);
        String token=jwt.generateToken(actual);
        assertTrue(jwt.isTokenValid(token,actual));
        var viejo=org.springframework.security.core.userdetails.User.withUsername(email).password("test").roles("SOCIO_ACTIVO").build();
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(contexto)
                .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/usuarios/me")
                .header("Authorization","Bearer "+jwt.generateToken(viejo)))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        contratar();
        assertTrue(jwt.isTokenValid(token,detalles.loadUserByUsername(email)));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/accesos/qr")
                .header("Authorization","Bearer "+token))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        reloj.fijar("2030-01-01T15:00:00Z");
        assertTrue(jwt.isTokenValid(token,detalles.loadUserByUsername(email)));
        assertEquals("VENCIDA",service.consultarPropia(email).estado());
        status(403,()->accesos.generarQr(email));
    }

    @Test void ingresoMultisedeSalidaTrasVencerYAforo() {
        contratar();
        var qr=accesos.generarQr(email);
        var ingreso=accesos.registrarIngreso(recepcion,new com.fitzonesports.acceso.dto.RegistrarIngresoRequest(qr.token(),null));
        assertEquals(otraSede,ingreso.sedeId());
        assertEquals(1,accesos.consultarAforo(recepcion,otraSede).ocupacionActual());
        reloj.fijar("2030-01-01T15:00:00Z");
        assertNotNull(accesos.registrarSalida(recepcion,new com.fitzonesports.acceso.dto.RegistrarSalidaRequest(ingreso.id(),null)).salida());
        assertEquals(0,accesos.consultarAforo(recepcion,otraSede).ocupacionActual());
    }

    @Test void clasesSiguenStubPeroElBeneficioExigeMembresia() throws Exception {
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(contexto)
                .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
        String bearer="Bearer "+jwt.generateToken(detalles.loadUserByUsername(email));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/clases/1/reservas").header("Authorization",bearer))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        contratar();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/clases/1/reservas").header("Authorization",bearer))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isNotImplemented());
        reloj.fijar("2030-01-01T15:00:00Z");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/clases/1/reservas/1").header("Authorization",bearer))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isNotImplemented());
    }

    @Test void registroLoginNoPermitenElegirPrivilegios() throws Exception {
        var usuarios=contexto.getBean(com.fitzonesports.usuario.service.UsuarioService.class);
        String nuevo="registro-"+UUID.randomUUID()+"@test.com";
        var registrado=usuarios.registrarCliente(new com.fitzonesports.usuario.dto.RegisterRequest("Nuevo","Cliente",nuevo,nuevo,"password123"));
        assertEquals("USUARIO",registrado.getRol().getNombre());
        assertFalse(service.tieneMembresiaVigente(registrado.getId()));
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(contexto)
                .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/auth/login")
                .contentType("application/json").content("{\"email\":\""+nuevo+"\",\"password\":\"password123\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.token").isString());
        String token=jwt.generateToken(detalles.loadUserByUsername(nuevo));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/planes")
                .header("Authorization","Bearer "+token).contentType("application/json")
                .content("{\"nombre\":\"Plan ajeno\",\"duracionMeses\":1,\"precio\":100}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
    }


    private MockMvc recepcionMvc() {
        return org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(contexto)
                .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
    }
    private String bearerM2(String mail) { return "Bearer "+jwt.generateToken(detalles.loadUserByUsername(mail)); }
    private String cuerpoQr(String qr) { return "{\"qrToken\":\""+qr+"\"}"; }

    @Test void recepcionHttpIngresoSalidaYAforoSinDoblePresencia() throws Exception {
        contratar(); var mvc=recepcionMvc(); String qr=accesos.generarQr(email).token();
        mvc.perform(post("/accesos/ingresos").header("Authorization",bearerM2(recepcion)).contentType("application/json").content(cuerpoQr(qr)))
                .andExpect(MockMvcResultMatchers.status().isCreated()).andExpect(jsonPath("$.sedeId").value(otraSede)).andExpect(jsonPath("$.titular.nombre").value("Test"));
        mvc.perform(get("/accesos/sedes/"+otraSede+"/aforo").header("Authorization",bearerM2(recepcion)))
                .andExpect(MockMvcResultMatchers.status().isOk()).andExpect(jsonPath("$.ocupacionActual").value(1));
        mvc.perform(post("/accesos/ingresos").header("Authorization",bearerM2(gerente)).contentType("application/json")
                .content("{\"qrToken\":\""+qr+"\",\"sedeId\":"+sede+"}"))
                .andExpect(MockMvcResultMatchers.status().isConflict());
        mvc.perform(post("/accesos/salidas").header("Authorization",bearerM2(recepcion)).contentType("application/json").content(cuerpoQr(qr)))
                .andExpect(MockMvcResultMatchers.status().isOk()).andExpect(jsonPath("$.salida").isNotEmpty());
        assertEquals(0,accesos.consultarAforo(recepcion,otraSede).ocupacionActual());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM registro_acceso WHERE sedeid=? AND fecha_hora_salida IS NOT NULL",Integer.class,otraSede));
    }
    @Test void recepcionSedeManipuladaNoAutorizaIngresoSalidaNiAforo() throws Exception {
        contratar(); var mvc=recepcionMvc(); String qr=accesos.generarQr(email).token();
        mvc.perform(post("/accesos/ingresos").header("Authorization",bearerM2(recepcion)).contentType("application/json")
                .content("{\"qrToken\":\""+qr+"\",\"sedeId\":"+sede+"}"))
                .andExpect(MockMvcResultMatchers.status().isForbidden());
        mvc.perform(get("/accesos/sedes/"+sede+"/aforo").header("Authorization",bearerM2(recepcion))).andExpect(MockMvcResultMatchers.status().isForbidden());
        var ingreso=accesos.registrarIngreso(gerente,new RegistrarIngresoRequest(qr,sede));
        for(String body:new String[]{cuerpoQr(qr),"{\"accesoId\":"+ingreso.id()+"}"})
            mvc.perform(post("/accesos/salidas").header("Authorization",bearerM2(recepcion)).contentType("application/json").content(body)).andExpect(MockMvcResultMatchers.status().isForbidden());
        assertEquals(1,accesos.consultarAforo(gerente,sede).ocupacionActual());
    }
    @Test void recepcionRolesHttpYPermisoExistenteDeGerente() throws Exception {
        var mvc=recepcionMvc();
        for(String ruta:new String[]{"/accesos/ingresos","/accesos/salidas"}) {
            mvc.perform(post(ruta).contentType("application/json").content("{}")).andExpect(MockMvcResultMatchers.status().isUnauthorized());
            mvc.perform(post(ruta).header("Authorization",bearerM2(email)).contentType("application/json").content(cuerpoQr("lectura"))).andExpect(MockMvcResultMatchers.status().isForbidden());
        }
        mvc.perform(get("/accesos/sedes/"+otraSede+"/aforo")).andExpect(MockMvcResultMatchers.status().isUnauthorized());
        mvc.perform(get("/accesos/sedes/"+otraSede+"/aforo").header("Authorization",bearerM2(email))).andExpect(MockMvcResultMatchers.status().isForbidden());
        mvc.perform(get("/accesos/qr").header("Authorization",bearerM2(recepcion))).andExpect(MockMvcResultMatchers.status().isForbidden());
        contratar();
        mvc.perform(post("/accesos/ingresos").header("Authorization",bearerM2(gerente)).contentType("application/json").content(cuerpoQr(accesos.generarQr(email).token()))).andExpect(MockMvcResultMatchers.status().isBadRequest());
        mvc.perform(get("/usuarios/me").header("Authorization",bearerM2(recepcion))).andExpect(MockMvcResultMatchers.status().isOk()).andExpect(jsonPath("$.sedeId").value(otraSede));
        mvc.perform(get("/accesos/sedes/"+sede+"/aforo").header("Authorization",bearerM2(gerente))).andExpect(MockMvcResultMatchers.status().isOk());
    }
    @Test void recepcionQrInvalidoVencidoReemplazadoYSuspension() throws Exception {
        contratar(); var mvc=recepcionMvc();
        mvc.perform(post("/accesos/ingresos").header("Authorization",bearerM2(recepcion)).contentType("application/json").content(cuerpoQr("invalido"))).andExpect(MockMvcResultMatchers.status().isBadRequest());
        String anterior=accesos.generarQr(email).token(); reloj.fijar("2026-01-31T15:00:02Z"); String actual=accesos.generarQr(email).token();
        mvc.perform(post("/accesos/ingresos").header("Authorization",bearerM2(recepcion)).contentType("application/json").content(cuerpoQr(anterior))).andExpect(MockMvcResultMatchers.status().isConflict());
        reloj.fijar("2026-01-31T15:01:04Z");
        mvc.perform(post("/accesos/ingresos").header("Authorization",bearerM2(recepcion)).contentType("application/json").content(cuerpoQr(actual))).andExpect(MockMvcResultMatchers.status().isConflict());
        actual=accesos.generarQr(email).token(); jdbc.update("UPDATE membresia SET suspendida=true,estado='SUSPENDIDA' WHERE usuarioid=?",usuario); entityManager.clear();
        mvc.perform(post("/accesos/ingresos").header("Authorization",bearerM2(recepcion)).contentType("application/json").content(cuerpoQr(actual))).andExpect(MockMvcResultMatchers.status().isForbidden());
        assertEquals(0,accesos.consultarAforo(recepcion,otraSede).ocupacionActual());
    }
    @Test void recepcionAforoEsInformativoInclusoAlSuperarCapacidad() {
        contratar(); jdbc.update("UPDATE sede SET capacidad_maxima=1 WHERE id=?",otraSede); entityManager.clear();
        accesos.registrarIngreso(recepcion,new RegistrarIngresoRequest(accesos.generarQr(email).token(),null));
        String segundo="segundo-"+UUID.randomUUID()+"@test.com"; crearUsuario(segundo,"USUARIO",sede);
        service.contratar(segundo,new CrearMembresiaRequest(plan,null),UUID.randomUUID());
        accesos.registrarIngreso(recepcion,new RegistrarIngresoRequest(accesos.generarQr(segundo).token(),null));
        assertEquals(2,accesos.consultarAforo(recepcion,otraSede).ocupacionActual());
        assertEquals(1,accesos.consultarAforo(recepcion,otraSede).capacidadMaxima());
    }
    @Test void recepcionSalidaExigeUnaIdentificacionYNoDuplica() throws Exception {
        contratar(); var mvc=recepcionMvc(); String qr=accesos.generarQr(email).token();
        var ingreso=accesos.registrarIngreso(recepcion,new RegistrarIngresoRequest(qr,null));
        for(String body:new String[]{"{}","{\"accesoId\":"+ingreso.id()+",\"qrToken\":\""+qr+"\"}"})
            mvc.perform(post("/accesos/salidas").header("Authorization",bearerM2(recepcion)).contentType("application/json").content(body)).andExpect(MockMvcResultMatchers.status().isBadRequest());
        accesos.registrarSalida(recepcion,new RegistrarSalidaRequest(ingreso.id(),null));
        mvc.perform(post("/accesos/salidas").header("Authorization",bearerM2(recepcion)).contentType("application/json").content("{\"accesoId\":"+ingreso.id()+"}")).andExpect(MockMvcResultMatchers.status().isConflict());
        mvc.perform(post("/accesos/salidas").header("Authorization",bearerM2(recepcion)).contentType("application/json").content(cuerpoQr(qr))).andExpect(MockMvcResultMatchers.status().isNotFound());
    }
    @Test void sedeRegistroHttpSinAsignacionInclusoConCampoLegado() throws Exception {
        var mvc=recepcionMvc();
        for (String extra : new String[]{"", ",\"sedeId\":"+sede}) {
            String mail="sin-sede-"+UUID.randomUUID()+"@test.com";
            var registro=mvc.perform(post("/auth/register").contentType("application/json").content(
                "{\"nombre\":\"Nuevo\",\"apellido\":\"Cliente\",\"dni\":\""+mail+"\",\"email\":\""+mail+"\",\"password\":\"password123\""+extra+"}"))
                .andExpect(MockMvcResultMatchers.status().isCreated()).andReturn();
            String token=new com.fasterxml.jackson.databind.ObjectMapper().readTree(registro.getResponse().getContentAsString()).get("token").asText();
            mvc.perform(get("/usuarios/me").header("Authorization","Bearer "+token))
                .andExpect(MockMvcResultMatchers.status().isOk()).andExpect(jsonPath("$.rol").value("USUARIO"))
                .andExpect(jsonPath("$.sedeId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.sedeNombre").value(org.hamcrest.Matchers.nullValue()));
            mvc.perform(get("/sedes")).andExpect(MockMvcResultMatchers.status().isUnauthorized());
        }
    }
    @Test void sedeAltaSinAsignacionExigeEleccionYNoOtorgaPrivilegios() {
        jdbc.update("UPDATE usuario SET sedeid=NULL WHERE id=?",usuario); entityManager.clear();
        status(400,()->service.contratar(email,new CrearMembresiaRequest(plan,null),UUID.randomUUID()));
        status(404,()->service.contratar(email,new CrearMembresiaRequest(plan,Integer.MAX_VALUE),UUID.randomUUID()));
        assertFalse(service.tieneMembresiaVigente(usuario));
        status(403,()->accesos.generarQr(email));
        assertNull(jdbc.queryForObject("SELECT sedeid FROM usuario WHERE id=?",Integer.class,usuario));
    }
    @Test void sedeElegidaSePersisteConPagoOrigenYReplayInmutable() {
        jdbc.update("UPDATE usuario SET sedeid=NULL WHERE id=?",usuario); entityManager.clear();
        UUID clave=UUID.randomUUID(); var pedido=new CrearMembresiaRequest(plan,otraSede);
        var alta=service.contratar(email,pedido,clave); entityManager.flush();
        assertEquals(otraSede,alta.sedeId());
        assertEquals(otraSede,jdbc.queryForObject("SELECT sedeid FROM usuario WHERE id=?",Integer.class,usuario));
        assertEquals(alta.id(),service.contratar(email,pedido,clave).id());
        status(409,()->service.contratar(email,new CrearMembresiaRequest(plan,sede),clave));
        status(409,()->service.contratar(email,new CrearMembresiaRequest(Integer.MAX_VALUE,otraSede),clave));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM comprobante c JOIN pago p ON p.id=c.pagoid WHERE p.usuarioid=?",Integer.class,usuario));
        // Renovar no cambia sede ni origen. El QR puede usarse fuera de la habitual.
        service.renovar(email,alta.id(),new RenovarMembresiaRequest(null),UUID.randomUUID());
        var ingreso=accesos.registrarIngreso(gerente,new RegistrarIngresoRequest(accesos.generarQr(email).token(),sede));
        assertEquals(sede,ingreso.sedeId());
        assertEquals(otraSede,service.consultarPropia(email).sedeId());
    }
    @Test void sedeExistenteNoSeCambiaMedianteContratacion() {
        status(409,()->service.contratar(email,new CrearMembresiaRequest(plan,otraSede),UUID.randomUUID()));
        assertEquals(sede,jdbc.queryForObject("SELECT sedeid FROM usuario WHERE id=?",Integer.class,usuario));
        assertEquals(sede,service.contratar(email,new CrearMembresiaRequest(plan,sede),UUID.randomUUID()).sedeId());
        status(409,()->service.contratar(email,new CrearMembresiaRequest(plan,sede),UUID.randomUUID()));
    }
    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void sedeRechazoRevierteTodaElAlta() {
        jdbc.update("UPDATE usuario SET sedeid=NULL WHERE id=?",usuario);
        org.mockito.Mockito.doReturn(new com.fitzonesports.pago.pasarela.ResultadoCobro(
            com.fitzonesports.pago.pasarela.ResultadoCobro.Estado.RECHAZADO,"rechazo","TEST"))
            .when(pasarela).cobrar(org.mockito.ArgumentMatchers.any());
        status(402,()->service.contratar(email,new CrearMembresiaRequest(plan,sede),UUID.randomUUID()));
        assertNull(jdbc.queryForObject("SELECT sedeid FROM usuario WHERE id=?",Integer.class,usuario));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM membresia WHERE usuarioid=?",Integer.class,usuario));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
    }
    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void sedePersonalObligatoriaEnBaseAunqueUsuarioSeaNullable() {
        for(String mail:new String[]{recepcion,gerente})
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE usuario SET sedeid=NULL WHERE email=?",mail));
        jdbc.update("UPDATE usuario SET sedeid=NULL WHERE id=?",usuario);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update(
            "UPDATE usuario SET rolid=(SELECT id FROM rol WHERE nombre='RECEPCIONISTA') WHERE id=?",usuario));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE rol SET nombre='INTERNO' WHERE nombre='USUARIO'"));
    }
    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void sedeMigracionV7AV8ConservaAsignacionYFkYOrigen() {
        String esquema="sede_upgrade_"+UUID.randomUUID().toString().replace("-","");
        String url=System.getenv("PLAN_TEST_DB_URL");
        org.flywaydb.core.Flyway.configure().dataSource(url,"postgres","").schemas(esquema).target("7").load().migrate();
        jdbc.update("INSERT INTO "+esquema+".sede(id,nombre,capacidad_maxima) VALUES (5,'Existente',10)");
        jdbc.update("INSERT INTO "+esquema+".usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) VALUES ('x','x',(SELECT id FROM "+esquema+".rol WHERE nombre='USUARIO'),5,'x','x','x')");
        org.flywaydb.core.Flyway.configure().dataSource(url,"postgres","").schemas(esquema).load().migrate();
        assertEquals(5,jdbc.queryForObject("SELECT sedeid FROM "+esquema+".usuario WHERE email='x'",Integer.class));
        assertEquals("YES",jdbc.queryForObject("SELECT is_nullable FROM information_schema.columns WHERE table_schema=? AND table_name='usuario' AND column_name='sedeid'",String.class,esquema));
        assertEquals("NO",jdbc.queryForObject("SELECT is_nullable FROM information_schema.columns WHERE table_schema=? AND table_name='membresia' AND column_name='sedeid'",String.class,esquema));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE "+esquema+".usuario SET sedeid=99999"));
    }

}
