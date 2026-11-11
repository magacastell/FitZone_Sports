package com.fitzonesports.reserva;

import com.fitzonesports.reserva.dto.CanchaDtos.*;
import com.fitzonesports.reserva.service.*;
import com.fitzonesports.pago.service.*;
import com.fitzonesports.membresia.service.MembresiaService;
import com.fitzonesports.membresia.dto.CrearMembresiaRequest;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@EnabledIfEnvironmentVariable(named="PLAN_TEST_DB_URL",matches=".+")
@SpringBootTest(properties={"spring.profiles.active=staging","spring.datasource.url=${PLAN_TEST_DB_URL}",
        "spring.datasource.username=postgres","spring.datasource.password=","jwt.secret=clave-exclusiva-de-pruebas-m4-12345678901234567890",
        "membresias.renovacion.inicio-ms=86400000","canchas.vencimientos.inicio-ms=86400000"})
class CanchasIntegrationTest {
    @Autowired CanchaService canchas;
    @Autowired ReservaCanchaService reservas;
    @Autowired PagoCanchaService pagos;
    @Autowired ReembolsoService reembolsos;
    @Autowired ComprobanteService comprobantes;
    @Autowired MembresiaService membresias;
    @Autowired JdbcTemplate jdbc;
    @Autowired Reloj reloj;
    @Autowired org.springframework.web.context.WebApplicationContext context;
    @Autowired com.fitzonesports.auth.service.JwtService jwt;
    @Autowired com.fitzonesports.auth.service.CustomUserDetailsService detalles;
    MockMvc mvc;
    Integer sede,otraSede,cancha,tipo,usuario,rechazado,otro,plan;
    String email,mailRechazado,mailOtro,gerente,recepcion,recepcionAjena,nombreTipo;

    @TestConfiguration static class Config {@Bean @Primary Reloj reloj(){return new Reloj();}}
    static class Reloj extends Clock {
        Instant ahora=Instant.parse("2026-11-12T13:00:00Z");
        public ZoneId getZone(){return ZoneId.of("America/Argentina/Buenos_Aires");}
        public Clock withZone(ZoneId zona){return Clock.fixed(ahora,zona);}
        public Instant instant(){return ahora;}
        void avanzar(Duration d){ahora=ahora.plus(d);}
    }
    @BeforeEach void preparar() {
        reloj.ahora=Instant.parse("2026-11-12T13:00:00Z");String sufijo=UUID.randomUUID().toString();
        sede=jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,100) RETURNING id",Integer.class,"M4 "+sufijo);
        otraSede=jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,100) RETURNING id",Integer.class,"Otra M4 "+sufijo);
        email="m4-"+sufijo+"@test.com";mailRechazado="rechazo-"+sufijo+"@test.com";mailOtro="otro-"+sufijo+"@test.com";
        gerente="gerente-"+sufijo+"@test.com";recepcion="recepcion-"+sufijo+"@test.com";recepcionAjena="recepcion-ajena-"+sufijo+"@test.com";
        usuario=usuario(email,"USUARIO",sede,"m4-"+sufijo);rechazado=usuario(mailRechazado,"USUARIO",sede,"99999999");otro=usuario(mailOtro,"USUARIO",sede,"otro-"+sufijo);
        usuario(gerente,"GERENTE",sede,"g-"+sufijo);usuario(recepcion,"RECEPCIONISTA",sede,"r-"+sufijo);usuario(recepcionAjena,"RECEPCIONISTA",otraSede,"ra-"+sufijo);
        nombreTipo="PADEL "+sufijo;tipo=canchas.guardarTipo(gerente,null,new TipoRequest(nombreTipo,new BigDecimal("10000.00"))).id();
        cancha=canchas.crear(gerente,new CrearCancha("Cancha 1",nombreTipo,sede,true)).id();
        plan=jdbc.queryForObject("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES (?,1,100) RETURNING id",Integer.class,"Plan M4 "+sufijo);
        mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    private Integer usuario(String mail,String rol,Integer sedeId,String dni) {
        return jdbc.queryForObject("INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) VALUES (?,?,(SELECT id FROM rol WHERE nombre=?),?,'Test','M4','test') RETURNING id",Integer.class,dni,mail,rol,sedeId);
    }
    private OffsetDateTime hora(int h,int m){return OffsetDateTime.of(2026,11,12,h,m,0,0,ZoneOffset.ofHours(-3));}
    private TurnoResponse turno(int h,int m){return canchas.crearTurno(gerente,cancha,new CrearTurno(hora(h,m),hora(h,m).plusHours(1)));}
    private ReservaResponse reservar(String mail,int turno){return reservas.reservar(mail,cancha,new Reservar(turno),UUID.randomUUID());}
    private String bearer(String mail){return "Bearer "+jwt.generateToken(detalles.loadUserByUsername(mail));}
    private void assertEstado(int status,org.junit.jupiter.api.function.Executable action) {
        assertEquals(status,assertThrows(ResponseStatusException.class,action).getStatusCode().value());
    }
    @AfterEach void limpiar() {
        jdbc.update("DELETE FROM detalle_facturacion WHERE comprobanteid IN (SELECT c.id FROM comprobante c JOIN pago p ON p.id=c.pagoid JOIN usuario u ON u.id=p.usuarioid WHERE u.sedeid IN (?,?))",sede,otraSede);
        jdbc.update("DELETE FROM comprobante WHERE pagoid IN (SELECT p.id FROM pago p JOIN usuario u ON u.id=p.usuarioid WHERE u.sedeid IN (?,?))",sede,otraSede);
        jdbc.update("DELETE FROM reembolso_pago WHERE pago_id IN (SELECT p.id FROM pago p JOIN usuario u ON u.id=p.usuarioid WHERE u.sedeid IN (?,?))",sede,otraSede);
        jdbc.update("DELETE FROM periodo_membresia WHERE membresia_id IN (SELECT id FROM membresia WHERE usuarioid IN (SELECT id FROM usuario WHERE sedeid IN (?,?)))",sede,otraSede);
        jdbc.update("DELETE FROM pago WHERE usuarioid IN (SELECT id FROM usuario WHERE sedeid IN (?,?))",sede,otraSede);
        jdbc.update("DELETE FROM membresia WHERE usuarioid IN (SELECT id FROM usuario WHERE sedeid IN (?,?))",sede,otraSede);
        jdbc.update("DELETE FROM reserva_cancha WHERE turno_canchaid IN (SELECT t.id FROM turno_cancha t JOIN cancha c ON c.id=t.canchaid WHERE c.sedeid IN (?,?))",sede,otraSede);
        jdbc.update("DELETE FROM bloqueo_mantenimiento WHERE canchaid IN (SELECT id FROM cancha WHERE sedeid IN (?,?))",sede,otraSede);
        jdbc.update("DELETE FROM turno_cancha WHERE canchaid IN (SELECT id FROM cancha WHERE sedeid IN (?,?))",sede,otraSede);
        jdbc.update("DELETE FROM cancha WHERE sedeid IN (?,?)",sede,otraSede);
        jdbc.update("DELETE FROM tipo_cancha WHERE id=?",tipo);
        jdbc.update("DELETE FROM usuario WHERE sedeid IN (?,?)",sede,otraSede);
        jdbc.update("DELETE FROM plan_membresia WHERE id=?",plan);
        jdbc.update("DELETE FROM sede WHERE id IN (?,?)",sede,otraSede);
    }

    @Test void flujoAprobadoRetieneConfirmaYPdfConservaPrecioYDatos()throws Exception {
        var t=turno(19,0);var clave=UUID.randomUUID();var r=reservas.reservar(email,cancha,new Reservar(t.id()),clave);
        assertEquals("PENDIENTE_PAGO",r.estado());assertEquals(new BigDecimal("12000.00"),r.precioAplicado());
        assertEquals(r.id(),reservas.reservar(email,cancha,new Reservar(t.id()),clave).id());
        assertFalse(canchas.turnos(email,cancha,LocalDate.of(2026,11,12),LocalDate.of(2026,11,12)).getFirst().disponible());
        var p=reservas.pagar(email,r.id());assertEquals("APROBADO",p.estado());assertEquals(p.id(),reservas.pagar(email,r.id()).id());
        assertEquals("CONFIRMADA",reservas.consultar(email,r.id()).estado());
        byte[] pdf=comprobantes.descargar(email,p.id()).contenido();
        try(var doc=Loader.loadPDF(pdf)) {
            var texto=new PDFTextStripper().getText(doc);assertTrue(texto.contains("CANCHA DEPORTIVA"));
            assertTrue(texto.contains("Cancha 1"));assertTrue(texto.contains("19:00"));assertTrue(texto.contains("12.000,00"));
            java.nio.file.Files.write(java.nio.file.Path.of("target/comprobante-cancha.pdf"),pdf);
            javax.imageio.ImageIO.write(new org.apache.pdfbox.rendering.PDFRenderer(doc).renderImageWithDPI(0,90),"png",java.nio.file.Path.of("target/comprobante-cancha.png").toFile());
        }
        canchas.guardarTipo(gerente,tipo,new TipoRequest(nombreTipo,new BigDecimal("50000")));
        assertArrayEquals(pdf,comprobantes.descargar(email,p.id()).contenido());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM pago WHERE tipo_referencia='RESERVA_CANCHA' AND referencia_id=?",Integer.class,r.id()));
    }
    @Test void dni99999999RechazaPersisteYLiberaSinPdf() {
        var t=turno(14,0);var r=reservar(mailRechazado,t.id());var p=reservas.pagar(mailRechazado,r.id());
        assertEquals("RECHAZADO",p.estado());assertEquals("RECHAZADA",reservas.consultar(mailRechazado,r.id()).estado());
        assertEstado(409,()->comprobantes.descargar(mailRechazado,p.id()));
        assertEquals(p.id(),reservas.pagar(mailRechazado,r.id()).id());
        assertEquals("CONFIRMADA",confirmar(email,t.id()).estado());
    }
    private ReservaResponse confirmar(String mail,int turno) {var r=reservar(mail,turno);reservas.pagar(mail,r.id());return reservas.consultar(mail,r.id());}
    @Test void descuentoSeDerivaDeMembresiaYMoraPagaTarifaExterna() {
        membresias.contratar(email,new CrearMembresiaRequest(plan,sede),UUID.randomUUID());
        var t=turno(19,0);assertEquals(new BigDecimal("10200.00"),reservar(email,t.id()).precioAplicado());
        assertEquals(new BigDecimal("12000.00"),canchas.turnos(mailOtro,cancha,LocalDate.of(2026,11,12),LocalDate.of(2026,11,12)).getFirst().precio().total());
        reloj.avanzar(Duration.ofDays(32));assertFalse(membresias.tieneMembresiaVigente(usuario));
        var inicio=OffsetDateTime.ofInstant(reloj.instant(),reloj.getZone()).plusHours(3).withSecond(0).withNano(0);
        var futuro=canchas.crearTurno(gerente,cancha,new CrearTurno(inicio,inicio.plusHours(1)));
        assertEquals("ESTANDAR",futuro.precio().estrategia());
    }
    @Test void expiracionLiberaTurnoYNoPermitePagoViejo() {
        var t=turno(14,0);var r=reservar(email,t.id());reloj.avanzar(Duration.ofMinutes(10));reservas.vencer();
        assertEquals("EXPIRADA",reservas.consultar(email,r.id()).estado());assertEstado(409,()->reservas.pagar(email,r.id()));
        assertEquals("PENDIENTE_PAGO",reservar(mailOtro,t.id()).estado());
    }
    @Test void mantenimientoNoPisaReservasYEliminacionEsLogica() {
        var t=turno(14,0);var r=reservar(email,t.id());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->canchas.mantenimiento(gerente,cancha,new MantenimientoRequest(hora(14,0),hora(15,0),"Piso")));
        reservas.cancelar(email,cancha,r.id(),null);
        var b=canchas.mantenimiento(recepcion,cancha,new MantenimientoRequest(hora(14,0),hora(15,0),"Piso"));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->reservar(email,t.id()));
        canchas.eliminarMantenimiento(recepcion,cancha,b.id());assertEquals("PENDIENTE_PAGO",reservar(email,t.id()).estado());
    }
    @Test void impideTurnosSolapadosPeroPermiteContiguos() {
        turno(14,0);assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->turno(14,30));
        assertNotNull(turno(15,0));
    }
    @Test void cancelacionDosHorasDevuelveTodoYComparteIdempotenciaConPagos() {
        var r=confirmar(email,turno(12,0).id());var p=pagos.datos(r.pagoId());
        reservas.cancelar(email,cancha,r.id(),null);reembolsos.solicitar(email,p.id());
        assertEquals("REEMBOLSADO",pagos.consultar(email,p.id()).estado());
        assertEquals(p.monto(),pagos.consultar(email,p.id()).montoReembolsado());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM reembolso_pago WHERE pago_id=?",Integer.class,p.id()));
    }
    @Test void cancelacionTardiaDevuelveMitadYConservaComprobanteOriginal() {
        var r=confirmar(email,turno(11,0).id());byte[] pdf=comprobantes.descargar(email,r.pagoId()).contenido();
        var reembolso=reembolsos.solicitar(email,r.pagoId());
        assertEquals("REEMBOLSADO_PARCIAL",reembolso.estado());assertEquals(new BigDecimal("5000.00"),reembolso.monto());
        assertArrayEquals(pdf,comprobantes.descargar(email,r.pagoId()).contenido());
        assertEquals(reembolso,reembolsos.solicitar(email,r.pagoId()));
    }
    @Test void noCancelaTurnoIniciadoYMarcaCumplidaAlFinalizar() {
        var r=confirmar(email,turno(11,0).id());reloj.avanzar(Duration.ofHours(1));
        assertEstado(409,()->reservas.cancelar(email,cancha,r.id(),null));reloj.avanzar(Duration.ofHours(1));reservas.vencer();
        assertEquals("CUMPLIDA",reservas.consultar(email,r.id()).estado());
    }
    @Test void permisosPorSedePropiedadYTarifas() {
        assertEstado(403,()->canchas.actualizar(recepcionAjena,cancha,new ActualizarCancha("Ajena",null,null)));
        assertEstado(403,()->canchas.guardarTipo(recepcion,tipo,new TipoRequest(nombreTipo,BigDecimal.TEN)));
        var r=reservar(email,turno(14,0).id());assertEstado(403,()->reservas.pagar(mailOtro,r.id()));
        assertEstado(403,()->reservas.cancelar(mailOtro,cancha,r.id(),null));
        reservas.pagar(email,r.id());assertEstado(403,()->comprobantes.descargar(mailOtro,reservas.consultar(email,r.id()).pagoId()));
    }
    @Test void rutasHttpAutenticadasYErroresNoExponenSql()throws Exception {
        mvc.perform(get("/canchas").param("sedeId",sede.toString())).andExpect(status().isUnauthorized());
        mvc.perform(get("/canchas").param("sedeId",sede.toString()).header("Authorization",bearer(email))).andExpect(status().isOk());
        var t=turno(14,0);
        mvc.perform(post("/canchas/"+cancha+"/reservas").contentType("application/json").content("{\"turnoId\":"+t.id()+"}").header("Idempotency-Key",UUID.randomUUID()).header("Authorization",bearer(email))).andExpect(status().isCreated());
        mvc.perform(post("/canchas/"+cancha+"/reservas").contentType("application/json").content("{\"turnoId\":"+t.id()+"}").header("Idempotency-Key",UUID.randomUUID()).header("Authorization",bearer(mailOtro)))
                .andExpect(status().isConflict()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(get("/pagos/me").header("Authorization",bearer(email))).andExpect(status().isOk());
        mvc.perform(get("/pagos").header("Authorization",bearer(email))).andExpect(status().isForbidden());
    }
    @Test void sqlDirectoNoPermiteDobleOcupacion() {
        var t=turno(14,0);reservar(email,t.id());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("INSERT INTO reserva_cancha(precio_aplicado,estado,turno_canchaid,usuarioid) VALUES (100,'CONFIRMADA',?,?)",t.id(),otro));
    }
    @Test void dosUsuariosSimultaneosSoloUnoRetieneYCobra()throws Exception {
        var t=turno(14,0);var inicio=new java.util.concurrent.CountDownLatch(1);
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.function.Function<String,java.util.concurrent.Callable<Integer>> tarea=mail->()->{
                inicio.await();try{var r=reservar(mail,t.id());reservas.pagar(mail,r.id());return 201;}
                catch(org.springframework.dao.DataIntegrityViolationException ex){return 409;}
            };
            var a=pool.submit(tarea.apply(email));var b=pool.submit(tarea.apply(mailOtro));inicio.countDown();
            var estados=new ArrayList<>(List.of(a.get(20,java.util.concurrent.TimeUnit.SECONDS),b.get(20,java.util.concurrent.TimeUnit.SECONDS)));Collections.sort(estados);
            assertEquals(List.of(201,409),estados);
        }
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM reserva_cancha WHERE turno_canchaid=? AND estado='CONFIRMADA'",Integer.class,t.id()));
    }
    @Test void pagosConcurrentesNoDuplicanCobro()throws Exception {
        var r=reservar(email,turno(14,0).id());var inicio=new java.util.concurrent.CountDownLatch(1);
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Integer> pagar=()->{inicio.await();return reservas.pagar(email,r.id()).id();};
            var a=pool.submit(pagar);var b=pool.submit(pagar);inicio.countDown();assertEquals(a.get(20,java.util.concurrent.TimeUnit.SECONDS),b.get(20,java.util.concurrent.TimeUnit.SECONDS));
        }
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM pago WHERE tipo_referencia='RESERVA_CANCHA' AND referencia_id=?",Integer.class,r.id()));
    }

    @Test void mantenimientoYReservaSimultaneosSoloUnoOcupaLaFranja()throws Exception {
        var t=turno(14,0);var inicio=new java.util.concurrent.CountDownLatch(1);
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{inicio.await();try{reservar(email,t.id());return 201;}catch(org.springframework.dao.DataIntegrityViolationException ex){return 409;}});
            var b=pool.submit(()->{inicio.await();try{canchas.mantenimiento(gerente,cancha,new MantenimientoRequest(hora(14,0),hora(15,0),"Piso"));return 201;}catch(org.springframework.dao.DataIntegrityViolationException ex){return 409;}});
            inicio.countDown();var estados=new ArrayList<>(List.of(a.get(20,java.util.concurrent.TimeUnit.SECONDS),b.get(20,java.util.concurrent.TimeUnit.SECONDS)));Collections.sort(estados);
            assertEquals(List.of(201,409),estados);
        }
    }

    @Test void pagosHttpRechazadosPersistenSinExponerPrecioEditable()throws Exception {
        var r=reservar(mailRechazado,turno(14,0).id());
        String cuerpo="{\"concepto\":\"RESERVA_CANCHA\",\"recursoId\":"+r.id()+",\"monto\":1}";
        mvc.perform(post("/pagos").contentType("application/json").content(cuerpo).header("Authorization",bearer(mailRechazado)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.estado").value("RECHAZADO")).andExpect(jsonPath("$.monto").value(10000));
    }

    @Test void consultaDisponibilidadConDatosRepresentativosYRegistraLatencia()throws Exception {
        // Dataset exclusivo de esta prueba, eliminado en finally; no usa la base de desarrollo.
        String prefijo="RNF03-"+UUID.randomUUID();
        try {
            jdbc.update("INSERT INTO sede(nombre,capacidad_maxima) SELECT ? || n,100 FROM generate_series(1,25)n",prefijo);
            jdbc.update("INSERT INTO cancha(nombre,costo_base_hora,activa,sedeid,tipo_canchaid) SELECT 'Cancha '||n,10000,1,s.id,? FROM sede s CROSS JOIN generate_series(1,4)n WHERE s.nombre LIKE ?",tipo,prefijo+"%");
            jdbc.update("INSERT INTO turno_cancha(fecha,hora_inicio,hora_fin,canchaid) SELECT DATE '2026-11-12'+d,time '08:00'+h*interval '1 hour',time '09:00'+h*interval '1 hour',c.id FROM cancha c JOIN sede s ON s.id=c.sedeid CROSS JOIN generate_series(0,6)d CROSS JOIN generate_series(0,11)h WHERE s.nombre LIKE ?",prefijo+"%");
            int id=jdbc.queryForObject("SELECT min(c.id) FROM cancha c JOIN sede s ON s.id=c.sedeid WHERE s.nombre LIKE ?",Integer.class,prefijo+"%");
            var desde=LocalDate.of(2026,11,12);var hasta=desde.plusDays(6);
            for(int i=0;i<5;i++)canchas.turnos(email,id,desde,hasta);
            var tiempos=new ArrayList<Double>();
            for(int i=0;i<30;i++) {
                long start=System.nanoTime();var turnos=canchas.turnos(email,id,desde,hasta);
                tiempos.add((System.nanoTime()-start)/1_000_000.0);assertEquals(84,turnos.size());
            }
            Collections.sort(tiempos);
            String informe="Dataset: 25 sedes, 100 canchas, 8400 turnos. JVM local, PostgreSQL 18, 5 calentamientos y 30 consultas de 84 turnos.\n"
                    +"Mediana ms: "+tiempos.get(15)+"\nP95 ms: "+tiempos.get(28)+"\nMax ms: "+tiempos.get(29)+"\nNo se fija un umbral institucional que no fue acordado.\n";
            java.nio.file.Files.writeString(java.nio.file.Path.of("target/rnf03-canchas.txt"),informe);
        } finally {
            jdbc.update("DELETE FROM turno_cancha WHERE canchaid IN (SELECT c.id FROM cancha c JOIN sede s ON s.id=c.sedeid WHERE s.nombre LIKE ?)",prefijo+"%");
            jdbc.update("DELETE FROM cancha WHERE sedeid IN (SELECT id FROM sede WHERE nombre LIKE ?)",prefijo+"%");
            jdbc.update("DELETE FROM sede WHERE nombre LIKE ?",prefijo+"%");
        }
    }

    @Test void datosDevSonRepetiblesYPreparanAmbosRecorridosSinTocarCodigo() {
        String esquema="seed_m4_"+UUID.randomUUID().toString().replace("-","");
        String url=System.getenv("PLAN_TEST_DB_URL");
        org.flywaydb.core.Flyway.configure().dataSource(url,"postgres","").schemas(esquema).load().migrate();
        var ds=new org.springframework.jdbc.datasource.DriverManagerDataSource(url,"postgres","");
        var props=new java.util.Properties();props.setProperty("currentSchema",esquema+",public");ds.setConnectionProperties(props);
        var seed=new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(new org.springframework.core.io.ClassPathResource("data.sql"));
        seed.execute(ds);seed.execute(ds);
        var base=new JdbcTemplate(ds);
        assertEquals(25,base.queryForObject("SELECT count(*) FROM sede",Integer.class));
        assertEquals(50,base.queryForObject("SELECT count(*) FROM cancha",Integer.class));
        assertEquals(4200,base.queryForObject("SELECT count(*) FROM turno_cancha",Integer.class));
        assertEquals("99999999",base.queryForObject("SELECT dni FROM usuario WHERE email='rechazo@fitzone.com'",String.class));
        String hash=base.queryForObject("SELECT contrasenia FROM usuario WHERE email='rechazo@fitzone.com'",String.class);
        assertTrue(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().matches("cliente123",hash));
    }
}
