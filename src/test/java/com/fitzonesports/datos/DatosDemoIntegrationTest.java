package com.fitzonesports.datos;

import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;

/** Solo la base descartable del runner: cada caso usa su propio esquema, sin clean/drop. */
@EnabledIfEnvironmentVariable(named="PLAN_TEST_DB_URL", matches=".+")
class DatosDemoIntegrationTest {
    private record Base(String esquema, JdbcTemplate jdbc) {}

    private Base base() {
        String esquema="demo_"+UUID.randomUUID().toString().replace("-", "");
        var ds=new DriverManagerDataSource(System.getenv("PLAN_TEST_DB_URL"),"postgres","");
        var propiedades=new java.util.Properties();
        propiedades.setProperty("currentSchema",esquema+",public");
        ds.setConnectionProperties(propiedades);
        return new Base(esquema,new JdbcTemplate(ds));
    }

    private Flyway flyway(Base base, String perfiles) {
        var configuracion=Flyway.configure().dataSource(System.getenv("PLAN_TEST_DB_URL"),"postgres","")
                .schemas(base.esquema()).cleanDisabled(true);
        if(perfiles!=null) configuracion.locations("classpath:db/migration","classpath:db/demo")
                .placeholders(Map.of("demoProfiles",perfiles));
        return configuracion.load();
    }

    private int cantidad(Base base, String tabla) {
        return base.jdbc().queryForObject("SELECT count(*) FROM "+tabla,Integer.class);
    }

    private String snapshot(Base base) {
        return java.util.List.of("sede","usuario","tipo_cancha","cancha","turno_cancha","tipo_clase",
                "instructor","clase_grupal","plan_membresia","membresia","periodo_membresia","pago").stream()
                .map(t->base.jdbc().queryForObject("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb)::text FROM "+t+" t",String.class))
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    @Test void instalaUnConjuntoPequenoCoherenteYNoLoReinserta() {
        var base=base();var flyway=flyway(base,"dev");
        assertEquals(17,flyway.migrate().migrationsExecuted);
        for(var entrada:Map.of("sede",25,"cancha",50,"turno_cancha",100,"clase_grupal",25,
                "usuario",6,"plan_membresia",3,"membresia",2,"periodo_membresia",2,"pago",2).entrySet())
            assertEquals(entrada.getValue(),cantidad(base,entrada.getKey()),entrada.getKey());
        assertEquals(0,cantidad(base,"reserva_cancha"));assertEquals(0,cantidad(base,"reserva_clase"));
        assertEquals(0,cantidad(base,"registro_acceso"));
        assertEquals(0,base.jdbc().queryForObject("SELECT count(*) FROM sede s WHERE NOT EXISTS "
                +"(SELECT 1 FROM cancha c WHERE c.sedeid=s.id AND c.activa=1) OR NOT EXISTS "
                +"(SELECT 1 FROM clase_grupal c WHERE c.sedeid=s.id AND c.horario>"
                +"(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')+interval '48 hours')",Integer.class));
        assertEquals(0,base.jdbc().queryForObject("SELECT count(*) FROM clase_grupal a JOIN clase_grupal b "
                +"ON a.id<b.id AND a.instructorid=b.instructorid AND a.horario<b.fin AND b.horario<a.fin",Integer.class));
        assertEquals(0,base.jdbc().queryForObject("SELECT count(*) FROM turno_cancha WHERE fecha+hora_inicio<="
                +"CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'",Integer.class));
        assertEquals(3,base.jdbc().queryForObject("SELECT count(DISTINCT duracion_meses) FROM plan_membresia WHERE activo",Integer.class));
        assertEquals(1,base.jdbc().queryForObject("SELECT count(*) FROM periodo_membresia p JOIN membresia m "
                +"ON m.id=p.membresia_id JOIN usuario u ON u.id=m.usuarioid JOIN pago pago ON pago.id=p.pago_id "
                +"WHERE u.email='socio@fitzone.com' AND NOT m.suspendida AND NOT p.cancelado "
                +"AND p.inicio<=CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires' "
                +"AND p.fin>CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires' AND pago.estado='APROBADO'",Integer.class));
        assertEquals(1,base.jdbc().queryForObject("SELECT count(*) FROM periodo_membresia p JOIN membresia m "
                +"ON m.id=p.membresia_id JOIN usuario u ON u.id=m.usuarioid WHERE u.email='vencido@fitzone.com' "
                +"AND p.fin<CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires'",Integer.class));
        assertEquals(0,base.jdbc().queryForObject("SELECT count(*) FROM membresia m JOIN usuario u ON u.id=m.usuarioid "
                +"WHERE u.email IN ('cliente@fitzone.com','rechazo@fitzone.com')",Integer.class));
        var encoder=new BCryptPasswordEncoder();
        var claves=Map.of("socio@fitzone.com","socio123","cliente@fitzone.com","cliente123",
                "recepcion@fitzone.com","recepcion123","gerente@fitzone.com","gerente123",
                "vencido@fitzone.com","socio123","rechazo@fitzone.com","cliente123");
        claves.forEach((mail,clave)->assertTrue(encoder.matches(clave,base.jdbc().queryForObject(
                "SELECT contrasenia FROM usuario WHERE email=?",String.class,mail)),mail));
        assertEquals(3,base.jdbc().queryForObject("SELECT count(DISTINCT r.nombre) FROM usuario u JOIN rol r ON r.id=u.rolid",Integer.class));
        String antes=snapshot(base);
        assertEquals(0,flyway.migrate().migrationsExecuted);
        flyway.validate();
        assertEquals(antes,snapshot(base),"El segundo arranque no debe alterar datos ni fechas");
    }

    @Test void conservaIdentidadesPreciosClasesYVigenciasPreexistentes() {
        var base=base();flyway(base,null).migrate();var jdbc=base.jdbc();
        int sede=jdbc.queryForObject("INSERT INTO sede(nombre,direccion,capacidad_maxima) VALUES ('Sede Central','Conservar',73) RETURNING id",Integer.class);
        int tipo=jdbc.queryForObject("INSERT INTO tipo_cancha(nombre,precio_hora) VALUES ('PADEL',12345) RETURNING id",Integer.class);
        int cancha=jdbc.queryForObject("INSERT INTO cancha(nombre,costo_base_hora,activa,sedeid,tipo_canchaid) VALUES ('Padel 1',12345,1,?,?) RETURNING id",Integer.class,sede,tipo);
        int usuario=jdbc.queryForObject("INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) "
                +"VALUES ('10000001','socio@fitzone.com',(SELECT id FROM rol WHERE nombre='USUARIO'),?,'Propio','Conservar','clave-personal') RETURNING id",Integer.class,sede);
        int plan=jdbc.queryForObject("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES ('Mensual propio',1,19000) RETURNING id",Integer.class);
        jdbc.update("INSERT INTO plan_membresia(nombre,duracion_meses,precio,activo) VALUES ('Demo Trimestral',3,50000,false)");
        int membresia=jdbc.queryForObject("INSERT INTO membresia(fecha_inicio,fecha_fin,estado,renovacion_automatica,usuarioid,plan_membresiaid,sedeid) "
                +"VALUES (now()-interval '3 months',now()-interval '2 months','VENCIDA',0,?,?,?) RETURNING id",Integer.class,usuario,plan,sede);
        int instructor=jdbc.queryForObject("INSERT INTO instructor(nombre,apellido) VALUES ('Instructor','Propio') RETURNING id",Integer.class);
        int claseTipo=jdbc.queryForObject("INSERT INTO tipo_clase(nombre) VALUES ('Clase propia') RETURNING id",Integer.class);
        int clase=jdbc.queryForObject("INSERT INTO clase_grupal(horario,fin,instructorid,tipo_claseid,capacidad_maxima,sedeid) "
                +"VALUES (now()+interval '10 days',now()+interval '10 days 1 hour',?,?,7,?) RETURNING id",Integer.class,instructor,claseTipo,sede);
        var registros=Map.of("sede",sede,"tipo_cancha",tipo,"cancha",cancha,"usuario",usuario,
                "plan_membresia",plan,"membresia",membresia,"instructor",instructor,"tipo_clase",claseTipo,"clase_grupal",clase);
        var antes=new java.util.HashMap<String,String>();
        registros.forEach((tabla,id)->antes.put(tabla,jdbc.queryForObject("SELECT to_jsonb(t)::text FROM "+tabla+" t WHERE id=?",String.class,id)));
        flyway(base,"dev").migrate();
        registros.forEach((tabla,id)->assertEquals(antes.get(tabla),jdbc.queryForObject("SELECT to_jsonb(t)::text FROM "+tabla+" t WHERE id=?",String.class,id),tabla));
        assertEquals(25,cantidad(base,"clase_grupal"));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
        assertEquals(3,jdbc.queryForObject("SELECT count(DISTINCT duracion_meses) FROM plan_membresia WHERE activo",Integer.class));
        assertEquals(0,flyway(base,"dev").migrate().migrationsExecuted);
    }

    @Test void reutilizaVeinticincoSedesAunqueNoTenganNombresDemo() {
        for(boolean nombresDemo:java.util.List.of(false,true)) {
            var base=base();flyway(base,null).migrate();
            base.jdbc().update(nombresDemo
                    ? "INSERT INTO sede(nombre,capacidad_maxima) SELECT 'Sede Demo '||lpad(n::text,2,'0'),80 FROM generate_series(2,25) n"
                    : "INSERT INTO sede(nombre,capacidad_maxima) SELECT 'Sede propia '||n,80 FROM generate_series(1,25) n");
            flyway(base,"dev").migrate();
            assertEquals(25,cantidad(base,"sede"));
            assertEquals(50,cantidad(base,"cancha"));
            assertEquals(25,cantidad(base,"clase_grupal"));
            assertEquals(6,cantidad(base,"usuario"));
            assertEquals(2,cantidad(base,"membresia"));
            assertEquals(0,base.jdbc().queryForObject("SELECT count(*) FROM sede WHERE nombre='Sede Central'",Integer.class));
        }
    }

    @Test void ubicacionComunNoIncluyeDatosDemo() {
        var base=base();var flyway=flyway(base,null);
        assertEquals(16,flyway.migrate().migrationsExecuted);
        for(String tabla:java.util.List.of("sede","usuario","plan_membresia","clase_grupal","cancha"))
            assertEquals(0,cantidad(base,tabla),tabla);
    }

    @Test void rechazaLaCargaInclusoSiSeIncluyeDemoConUnPerfilCompartido() {
        for(String perfiles:java.util.List.of("prod","staging","dev,prod","prod,dev","dev,staging","dev, prod"," prod , dev ")) {
            var base=base();flyway(base,null).migrate();
            var error=assertThrows(org.flywaydb.core.api.FlywayException.class,()->flyway(base,perfiles).migrate());
            assertTrue(error.getMessage().contains("V17 demo requiere dev"));
            assertEquals(0,cantidad(base,"usuario"));assertEquals(0,cantidad(base,"sede"));
        }
    }
}
