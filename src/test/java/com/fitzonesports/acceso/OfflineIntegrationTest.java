package com.fitzonesports.acceso;

import com.fitzonesports.acceso.offline.*;
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
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="PLAN_TEST_DB_URL",matches=".+")
@SpringBootTest(properties={"spring.profiles.active=staging","spring.datasource.url=${PLAN_TEST_DB_URL}","spring.datasource.username=postgres","spring.datasource.password=","jwt.secret=clave-solo-pruebas-offline-no-productiva-1234567890"})
@Transactional
class OfflineIntegrationTest {
    @org.springframework.test.context.DynamicPropertySource
    static void clave(org.springframework.test.context.DynamicPropertyRegistry propiedades){String valor=FirmaOfflineTest.clavePruebas();propiedades.add("fitzone.offline.private-key",()->valor);}
    @Autowired JdbcTemplate jdbc;
    @Autowired CredencialOfflineService credenciales;
    @Autowired TerminalOfflineService terminales;
    @Autowired FirmaOffline firma;
    @Autowired Clock clock;
    @Autowired RelojOffline reloj;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired SincronizacionOfflineService sync;
    Integer sede,otra,uid;String socio,operador,ajeno;
    UUID terminal;
    @TestConfiguration static class Config {
        @Bean @Primary RelojOffline relojOffline(){return new RelojOffline();}
    }
    static class RelojOffline extends Clock {
        Instant ahora=Instant.parse("2026-11-09T15:00:00Z");
        public Instant instant(){return ahora;}
        public ZoneId getZone(){return ZoneId.of("America/Argentina/Buenos_Aires");}
        public Clock withZone(ZoneId zona){return Clock.fixed(ahora,zona);}
    }
    @BeforeEach void preparar() {
        reloj.ahora=Instant.parse("2026-11-09T15:00:00Z");
        String sufijo=UUID.randomUUID().toString();terminal=UUID.randomUUID();
        sede=jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,20) RETURNING id",Integer.class,"Offline "+sufijo);
        otra=jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,20) RETURNING id",Integer.class,"Otra offline "+sufijo);
        socio="socio-"+sufijo+"@test.invalid";operador="recepcion-"+sufijo+"@test.invalid";ajeno="ajeno-"+sufijo+"@test.invalid";
        uid=usuario(socio,"USUARIO",otra);usuario(operador,"RECEPCIONISTA",sede);usuario(ajeno,"RECEPCIONISTA",otra);
        int plan=jdbc.queryForObject("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES (?,1,100) RETURNING id",Integer.class,"Plan offline "+sufijo);
        int m=jdbc.queryForObject("INSERT INTO membresia(fecha_inicio,fecha_fin,estado,renovacion_automatica,usuarioid,plan_membresiaid,sedeid) VALUES (?,?, 'ACTIVA',0,?,?,?) RETURNING id",Integer.class,LocalDateTime.now(clock).minusDays(1),LocalDateTime.now(clock).plusDays(10),uid,plan,otra);
        jdbc.update("INSERT INTO periodo_membresia(membresia_id,plan_id,nombre_plan,duracion_meses,precio,inicio,fin) VALUES (?,?,'Prueba',1,100,?,?)",m,plan,LocalDateTime.now(clock).minusDays(1),LocalDateTime.now(clock).plusDays(10));
    }
    private int usuario(String email,String rol,Integer sedeId) {
        return jdbc.queryForObject("INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) VALUES (?,?,(SELECT id FROM rol WHERE nombre=?),?,'Socio','Offline','no-es-password-real') RETURNING id",Integer.class,email,email,rol,sedeId);
    }
    @Test void copiaAcotadaPorConsentimientoYPermisosSinFotosNiIdentidadCompleta() {
        var vacia=terminales.preparar(operador,terminal);
        assertTrue(((List<?>)firma.verificar(vacia.evidencia(),"m2-copia",clock.instant()).get("miembros")).isEmpty());
        var lote=credenciales.preparar(socio,sede);assertEquals(120,lote.tokens().size());
        assertEquals(lote.id(),credenciales.preparar(socio,sede).id());
        var copia=terminales.preparar(operador,terminal);var claims=firma.verificar(copia.evidencia(),"m2-copia",clock.instant());
        var miembros=(List<?>)claims.get("miembros");assertEquals(1,miembros.size());
        var miembro=(Map<?,?>)miembros.getFirst();assertEquals(uid,miembro.get("id"));assertFalse(miembro.containsKey("email"));assertFalse(miembro.containsKey("foto"));assertFalse(miembro.containsKey("dni"));
        assertFalse(((List<?>)miembro.get("periodos")).isEmpty());
        assertThrows(ResponseStatusException.class,()->terminales.preparar(socio,UUID.randomUUID()));
        assertThrows(ResponseStatusException.class,()->terminales.autorizar(ajeno,terminal));
        assertThrows(ResponseStatusException.class,()->terminales.preparar(operador,UUID.randomUUID()));
        assertThrows(ResponseStatusException.class,()->firma.verificar(copia.evidencia(),"m2-copia",clock.instant().plusSeconds(7201)));
    }
    @Test void suspendidaOInactivaNoPreparaCredencialesYLaCopiaReflejaSuspensionPosterior() {
        credenciales.preparar(socio,sede);
        jdbc.update("UPDATE membresia SET suspendida=true WHERE usuarioid=?",uid);
        entityManager.clear();
        var copia=terminales.preparar(operador,terminal);var miembros=(List<?>)firma.verificar(copia.evidencia(),"m2-copia",clock.instant()).get("miembros");
        assertEquals(true,((Map<?,?>)miembros.getFirst()).get("suspendido"));
        assertThrows(ResponseStatusException.class,()->credenciales.preparar(socio,sede));
    }
    private SincronizacionOfflineService.Evento evento(String visita,String tipo,UUID revision,String qr,long ms) {
        return new SincronizacionOfflineService.Evento(UUID.randomUUID(),visita,uid,tipo,ms,qr,revision,"INGRESO".equals(tipo)?1:2);
    }
    private UUID revision(TerminalOfflineService.Copia copia) { return UUID.fromString((String)firma.verificar(copia.evidencia(),"m2-copia",clock.instant()).get("revision")); }
    @Test void batchDesordenadoSeConfirmaUnaVezYNoPermiteCambiarLaIntencion() {
        var lote=credenciales.preparar(socio,sede);var rev=revision(terminales.preparar(operador,terminal));
        String visita=UUID.randomUUID().toString();long t=clock.instant().toEpochMilli();
        var entrada=evento(visita,"INGRESO",rev,lote.tokens().getFirst(),t);
        var salida=evento(visita,"SALIDA",rev,null,t+5);
        var resultado=sync.sincronizar(operador,terminal,List.of(salida,entrada));
        assertTrue(resultado.stream().allMatch(r->"CONFIRMADO".equals(r.estado())));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM registro_acceso WHERE offline_visita=? AND fecha_hora_salida IS NOT NULL",Integer.class,UUID.fromString(visita)));
        assertTrue(sync.sincronizar(operador,terminal,List.of(entrada,salida)).stream().allMatch(SincronizacionOfflineService.Resultado::repetido));
        var cambiado=new SincronizacionOfflineService.Evento(entrada.id(),visita,uid,"INGRESO",t+1,entrada.qrToken(),rev,1);
        assertEquals("CONFLICTO",sync.sincronizar(operador,terminal,List.of(cambiado)).getFirst().estado());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM acceso_intento_incompatible WHERE evento_id=?",Integer.class,entrada.id()));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM registro_acceso WHERE offline_visita=?",Integer.class,UUID.fromString(visita)));
    }
    @Test void egresoRecibidoAntesDelIngresoQuedaPendienteYSeRecupera() {
        var lote=credenciales.preparar(socio,sede);var rev=revision(terminales.preparar(operador,terminal));
        String visita=UUID.randomUUID().toString();long t=clock.instant().toEpochMilli();
        var salida=evento(visita,"SALIDA",rev,null,t+3);
        assertEquals("EN_ESPERA",sync.sincronizar(operador,terminal,List.of(salida)).getFirst().estado());
        var entrada=evento(visita,"INGRESO",rev,lote.tokens().getFirst(),t);
        assertTrue(sync.sincronizar(operador,terminal,List.of(entrada,salida)).stream().allMatch(r->"CONFIRMADO".equals(r.estado())));
    }
    @Test void conflictoEntreSedesConservaEvidenciaInclusoConVisitasCerradas() {
        var a=credenciales.preparar(socio,sede);var b=credenciales.preparar(socio,otra);
        UUID ta=terminal,tb=UUID.randomUUID();var ra=revision(terminales.preparar(operador,ta));var rb=revision(terminales.preparar(ajeno,tb));
        long t=clock.instant().toEpochMilli();String va=UUID.randomUUID().toString(),vb=UUID.randomUUID().toString();
        sync.sincronizar(operador,ta,List.of(evento(va,"INGRESO",ra,a.tokens().getFirst(),t),evento(va,"SALIDA",ra,null,t+10)));
        var conflicto=sync.sincronizar(ajeno,tb,List.of(evento(vb,"INGRESO",rb,b.tokens().getFirst(),t+2),evento(vb,"SALIDA",rb,null,t+8)));
        assertTrue(conflicto.stream().allMatch(r->"CONFLICTO".equals(r.estado())));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM registro_acceso WHERE usuarioid=?",Integer.class,uid));
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM acceso_evento_offline WHERE terminal_id=? AND estado='CONFLICTO'",Integer.class,tb));
        assertEquals("CONFLICTO",sync.sincronizar(ajeno,tb,List.of(evento(vb,"SALIDA",rb,null,t+12))).getFirst().estado());
        assertThrows(ResponseStatusException.class,()->sync.sincronizar(ajeno,ta,List.of(evento(vb,"INGRESO",rb,b.tokens().getFirst(),t))));
    }
    @Test void capturaSinCopiaVigenteOConQrFalsificadoNoConcedeAcceso() {
        var lote=credenciales.preparar(socio,sede);var copia=terminales.preparar(operador,terminal);var rev=revision(copia);
        var qr=lote.tokens().getFirst();long t=clock.instant().toEpochMilli();
        var falso=evento(UUID.randomUUID().toString(),"INGRESO",rev,qr.substring(0,qr.length()-8)+"AAAAAAAA",t);
        var previo=evento(UUID.randomUUID().toString(),"INGRESO",rev,qr,firma.verificar(copia.evidencia(),"m2-copia",clock.instant()).getNotBefore().getTime()-1);
        assertTrue(sync.sincronizar(operador,terminal,List.of(falso,previo)).stream().allMatch(r->"RECHAZADO".equals(r.estado())));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM registro_acceso WHERE usuarioid=?",Integer.class,uid));
    }
    @Test void sincronizarTardeUsaLaCapturaPeroNoPermiteCapturarConCopiaCaducada() {
        var lote=credenciales.preparar(socio,sede);var rev=revision(terminales.preparar(operador,terminal));
        long t=clock.instant().toEpochMilli();String visita=UUID.randomUUID().toString();
        var entrada=evento(visita,"INGRESO",rev,lote.tokens().getFirst(),t);
        var salida=evento(visita,"SALIDA",rev,null,t+5);
        reloj.ahora=reloj.ahora.plusSeconds(10800);
        assertTrue(sync.sincronizar(operador,terminal,List.of(entrada,salida)).stream().allMatch(r->"CONFIRMADO".equals(r.estado())));
        var caducado=evento(UUID.randomUUID().toString(),"INGRESO",rev,lote.tokens().getFirst(),t+7200000);
        assertEquals("RECHAZADO",sync.sincronizar(operador,terminal,List.of(caducado)).getFirst().estado());
    }
    @Autowired org.springframework.web.context.WebApplicationContext contexto;
    @Autowired com.fitzonesports.auth.service.JwtService jwt;
    @Autowired com.fitzonesports.auth.service.CustomUserDetailsService detalles;
    @Test void httpExigeIdentidadRolYBodyValido() throws Exception {
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(contexto).apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity()).build();
        String cuerpo="{\"terminalId\":\""+terminal+"\"}";
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/accesos/offline/preparacion").contentType("application/json").content(cuerpo))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        String bearer="Bearer "+jwt.generateToken(detalles.loadUserByUsername(socio));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/accesos/offline/preparacion").header("Authorization",bearer).contentType("application/json").content(cuerpo))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        bearer="Bearer "+jwt.generateToken(detalles.loadUserByUsername(operador));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/accesos/offline/sincronizacion").header("Authorization",bearer).contentType("application/json").content("{\"terminalId\":\""+terminal+"\",\"eventos\":[]}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
    }
}
