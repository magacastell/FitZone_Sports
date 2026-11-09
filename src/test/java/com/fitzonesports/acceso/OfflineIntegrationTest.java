package com.fitzonesports.acceso;

import com.fitzonesports.acceso.offline.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="PLAN_TEST_DB_URL",matches=".+")
@SpringBootTest(properties={"spring.profiles.active=staging","spring.datasource.url=${PLAN_TEST_DB_URL}","spring.datasource.username=postgres","spring.datasource.password=","jwt.secret=clave-solo-pruebas-offline-no-productiva-1234567890"})
@Transactional
class OfflineIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired CredencialOfflineService credenciales;
    @Autowired TerminalOfflineService terminales;
    @Autowired FirmaOffline firma;
    @Autowired Clock clock;
    @Autowired jakarta.persistence.EntityManager entityManager;
    Integer sede,otra,uid;String socio,operador,ajeno;
    UUID terminal;
    @BeforeEach void preparar() {
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
}
