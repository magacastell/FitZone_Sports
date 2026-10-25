package com.fitzonesports.membresia;

import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.service.MembresiaService;
import com.fitzonesports.acceso.service.AccesoService;
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
        usuario=crearUsuario(email,"CLIENTE_EXTERNO",sede);
        crearUsuario(recepcion,"RECEPCIONISTA",otraSede);
        crearUsuario(gerente,"GERENTE",otraSede);
        plan=jdbc.queryForObject("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES (?,1,15000.50) RETURNING id",Integer.class,"Mensual "+sufijo);
    }
    private Integer crearUsuario(String mail,String rol,Integer sedeId) {
        return jdbc.queryForObject("INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) "
                + "VALUES (?,?,(SELECT id FROM rol WHERE nombre=?),?,'Test','Test','test') RETURNING id",Integer.class,mail,mail,rol,sedeId);
    }
    private MembresiaResponse contratar() { return service.contratar(email,new CrearMembresiaRequest(plan),UUID.randomUUID()); }
    private void status(int esperado,org.junit.jupiter.api.function.Executable operacion) {
        assertEquals(esperado,assertThrows(ResponseStatusException.class,operacion).getStatusCode().value());
    }

    @Test void contratacionCobraUnaVezYConservaMesCalendario() {
        UUID clave=UUID.randomUUID();
        var m=service.contratar(email,new CrearMembresiaRequest(plan),clave);
        var replay=service.contratar(email,new CrearMembresiaRequest(plan),clave);
        assertEquals(m.id(),replay.id());
        assertEquals(1,replay.periodos().size());
        assertEquals(LocalDate.of(2026,2,28),m.periodoVigente().fin().toLocalDate());
        assertEquals("ACTIVA",m.estado());
        assertTrue(service.tieneMembresiaVigente(usuario));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
        assertEquals("APROBADO",jdbc.queryForObject("SELECT estado FROM pago WHERE usuarioid=?",String.class,usuario));
        assertNotNull(accesos.generarQr(email)); // CLIENTE_EXTERNO con membresia tambien es socio.
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
                return service.contratar(email,new CrearMembresiaRequest(plan),clave);
            };
            var a=pool.submit(tarea); var b=pool.submit(tarea); inicio.countDown();
            assertEquals(a.get(20,java.util.concurrent.TimeUnit.SECONDS).id(),b.get(20,java.util.concurrent.TimeUnit.SECONDS).id());
            assertEquals(1,service.consultarPropia(email).periodos().size());
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
        }
    }
}
