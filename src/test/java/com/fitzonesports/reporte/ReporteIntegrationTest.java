package com.fitzonesports.reporte;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Reportes del Gerente Central contra PostgreSQL real (HTTP + seguridad + SQL). Dos sedes con datos distintos en
 * junio de 2030, un período que no toca nada de otras suites. Valores esperados calculados a mano en cada caso.
 */
@EnabledIfEnvironmentVariable(named = "PLAN_TEST_DB_URL", matches = ".+")
@SpringBootTest(properties = {"spring.profiles.active=staging", "spring.datasource.url=${PLAN_TEST_DB_URL}",
        "spring.datasource.username=postgres", "spring.datasource.password=",
        "jwt.secret=clave-exclusiva-para-pruebas-de-reportes-1234567890", "membresias.renovacion.inicio-ms=3600000"})
class ReporteIntegrationTest {

    private static final String DESDE = "2030-06-10T00:00:00-03:00";
    private static final String HASTA = "2030-06-12T00:00:00-03:00";

    @Autowired JdbcTemplate jdbc;
    @Autowired org.springframework.web.context.WebApplicationContext contexto;
    @Autowired com.fitzonesports.auth.service.JwtService jwt;
    @Autowired com.fitzonesports.auth.service.CustomUserDetailsService detalles;

    MockMvc mvc;
    Integer sedeA, sedeB, plan, tipoCancha, canchaB;
    Integer uno, dos, tres, cuatro;
    String gerente, recepcion, socio;
    final List<Integer> pagos = new ArrayList<>();
    final List<Integer> reservas = new ArrayList<>();
    final List<Integer> turnos = new ArrayList<>();
    int hora = 8;

    @BeforeEach
    void preparar() {
        String s = UUID.randomUUID().toString();
        sedeA = jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,10) RETURNING id", Integer.class, "Rep A " + s);
        sedeB = jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,20) RETURNING id", Integer.class, "Rep B " + s);
        gerente = "gerente-" + s + "@test.com";
        recepcion = "recepcion-" + s + "@test.com";
        socio = "socio-" + s + "@test.com";
        usuario(gerente, "GERENTE", sedeA);
        usuario(recepcion, "RECEPCIONISTA", sedeA);
        usuario(socio, "USUARIO", sedeA);
        uno = usuario("u1-" + s + "@test.com", "USUARIO", sedeA);
        dos = usuario("u2-" + s + "@test.com", "USUARIO", sedeA);
        tres = usuario("u3-" + s + "@test.com", "USUARIO", sedeA);
        cuatro = usuario("u4-" + s + "@test.com", "USUARIO", sedeB);
        plan = jdbc.queryForObject("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES (?,1,10000) RETURNING id", Integer.class, "Plan " + s);
        tipoCancha = jdbc.queryForObject("INSERT INTO tipo_cancha(nombre,precio_hora) VALUES (?,1000) RETURNING id", Integer.class, "Tipo " + s);
        canchaB = jdbc.queryForObject("INSERT INTO cancha(nombre,costo_base_hora,activa,sedeid,tipo_canchaid) VALUES ('C1',1000,1,?,?) RETURNING id",
                Integer.class, sedeB, tipoCancha);
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
        sembrarAccesos();
        sembrarPagos();
    }

    @AfterEach
    void limpiar() {
        for (Integer id : pagos) jdbc.update("DELETE FROM reembolso_pago WHERE pago_id=?", id);
        jdbc.update("DELETE FROM periodo_membresia WHERE membresia_id IN (SELECT id FROM membresia WHERE sedeid IN (?,?))", sedeA, sedeB);
        for (Integer id : pagos) jdbc.update("DELETE FROM pago WHERE id=?", id);
        for (Integer id : reservas) jdbc.update("DELETE FROM reserva_cancha WHERE id=?", id);
        for (Integer id : turnos) jdbc.update("DELETE FROM turno_cancha WHERE id=?", id);
        jdbc.update("DELETE FROM membresia WHERE sedeid IN (?,?)", sedeA, sedeB);
        jdbc.update("DELETE FROM registro_acceso WHERE sedeid IN (?,?)", sedeA, sedeB);
        jdbc.update("DELETE FROM cancha WHERE id=?", canchaB);
        jdbc.update("DELETE FROM tipo_cancha WHERE id=?", tipoCancha);
        jdbc.update("DELETE FROM usuario WHERE sedeid IN (?,?)", sedeA, sedeB);
        jdbc.update("DELETE FROM plan_membresia WHERE id=?", plan);
        jdbc.update("DELETE FROM sede WHERE id IN (?,?)", sedeA, sedeB);
    }

    // ------------------------------------------------------------------ datos

    private void sembrarAccesos() {
        // Sede A: tres ingresos del 10 y 11 con salida, uno offline (a3) y uno abierto (a4).
        acceso(sedeA, uno, "2030-06-10 10:00", "2030-06-10 11:00", false);
        acceso(sedeA, dos, "2030-06-10 10:30", "2030-06-10 12:00", false);
        acceso(sedeA, uno, "2030-06-11 09:00", "2030-06-11 09:30", true);
        acceso(sedeA, tres, "2030-06-10 23:30", null, false);
        // Sede B: uno justo en desde (incluido) y uno el 10 a la tarde.
        acceso(sedeB, cuatro, "2030-06-10 00:00", "2030-06-10 00:30", false);
        acceso(sedeB, dos, "2030-06-10 18:00", "2030-06-10 19:00", false);
        // Fuera del período: justo en hasta (excluido) y posterior.
        acceso(sedeB, cuatro, "2030-06-12 00:00", "2030-06-12 00:10", false);
        acceso(sedeA, uno, "2030-07-01 10:00", "2030-07-01 11:00", false);
    }

    private void acceso(Integer sede, Integer usuario, String ingreso, String salida, boolean offline) {
        jdbc.update("INSERT INTO registro_acceso(fecha_hora_ingreso,fecha_hora_salida,usuarioid,sedeid,offline_visita) "
                + "VALUES (CAST(? AS timestamp),CAST(? AS timestamp),?,?," + (offline ? "gen_random_uuid()" : "NULL") + ")",
                ingreso, salida, usuario, sede);
    }

    private void sembrarPagos() {
        // p1: membresía sede A, cobrada en el período.
        pago("MEMBRESIA", "APROBADO", "10000.00", "2030-06-10 12:00", uno, periodo(uno, sedeA));
        // p2: membresía sede A cobrada antes del período y devuelta completa el 11.
        int p2 = pago("MEMBRESIA", "REEMBOLSADO", "20000.00", "2030-05-30 12:00", dos, periodo(dos, sedeA));
        reembolso(p2, "20000.00", "2030-06-11 10:00", "100");
        // p3: cancha sede B, cobrada y devuelta al 50 % el mismo día.
        int p3 = pago("RESERVA_CANCHA", "REEMBOLSADO_PARCIAL", "3000.00", "2030-06-10 20:00", cuatro, reserva("CANCELADA"));
        reembolso(p3, "1500.00", "2030-06-10 21:00", "50");
        // p4: cancha sede B rechazada: no suma.
        pago("RESERVA_CANCHA", "RECHAZADO", "4000.00", "2030-06-10 20:00", cuatro, reserva("RECHAZADA"));
        // p5: cancha sede B cobrada justo en hasta: fuera.
        pago("RESERVA_CANCHA", "APROBADO", "5000.00", "2030-06-12 00:00", cuatro, reserva("CONFIRMADA"));
        // p6: membresía sede B.
        pago("MEMBRESIA", "APROBADO", "7000.00", "2030-06-10 15:00", tres, periodo(tres, sedeB));
        // p7: membresía sin período asociado: sede indeterminada.
        pago("MEMBRESIA", "APROBADO", "1000.00", "2030-06-11 08:00", tres, 0);
    }

    private int pago(String concepto, String estado, String monto, String fecha, Integer usuario, int referencia) {
        int id = jdbc.queryForObject("INSERT INTO pago(monto,tipo_referencia,referencia_id,fecha_pago,usuarioid,estado) "
                + "VALUES (CAST(? AS numeric),?,?,CAST(? AS timestamp),?,?) RETURNING id", Integer.class,
                monto, concepto, "MEMBRESIA".equals(concepto) ? 0 : referencia, fecha, usuario, estado);
        pagos.add(id);
        if ("MEMBRESIA".equals(concepto) && referencia > 0) {
            jdbc.update("UPDATE periodo_membresia SET pago_id=? WHERE id=?", id, referencia);
        }
        return id;
    }

    /** Crea membresía + período sin pago y devuelve el id del período para enlazarlo al pago. */
    private int periodo(Integer usuario, Integer sede) {
        int membresia = jdbc.queryForObject("INSERT INTO membresia(fecha_inicio,estado,fecha_fin,renovacion_automatica,usuarioid,plan_membresiaid,sedeid) "
                + "VALUES ('2030-05-01','ACTIVA','2030-12-01',0,?,?,?) RETURNING id", Integer.class, usuario, plan, sede);
        return jdbc.queryForObject("INSERT INTO periodo_membresia(membresia_id,plan_id,nombre_plan,duracion_meses,precio,inicio,fin) "
                + "VALUES (?,?,'Plan',1,10000,'2030-05-01','2030-06-01') RETURNING id", Integer.class, membresia, plan);
    }

    private int reserva(String estado) {
        hora++;
        int turno = jdbc.queryForObject("INSERT INTO turno_cancha(fecha,hora_inicio,hora_fin,canchaid) VALUES ('2030-06-20',?,?,?) RETURNING id",
                Integer.class, java.sql.Time.valueOf(hora + ":00:00"), java.sql.Time.valueOf(hora + ":30:00"), canchaB);
        turnos.add(turno);
        int id = jdbc.queryForObject("INSERT INTO reserva_cancha(precio_aplicado,estado,turno_canchaid,usuarioid) VALUES (1000,?,?,?) RETURNING id",
                Integer.class, estado, turno, cuatro);
        reservas.add(id);
        return id;
    }

    private void reembolso(int pago, String monto, String fecha, String porcentaje) {
        jdbc.update("INSERT INTO reembolso_pago(pago_id,monto,fecha,referencia_externa,proveedor,porcentaje) "
                + "VALUES (?,CAST(? AS numeric),CAST(? AS timestamp),?,'fake',CAST(? AS numeric))", pago, monto, fecha,
                "ref-" + UUID.randomUUID(), porcentaje);
    }

    private Integer usuario(String mail, String rol, Integer sede) {
        return jdbc.queryForObject("INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) "
                + "VALUES (?,?,(SELECT id FROM rol WHERE nombre=?),?,'Test','Reporte','x') RETURNING id", Integer.class,
                UUID.randomUUID().toString().substring(0, 8), mail, rol, sede);
    }

    private String bearer(String mail) {
        return "Bearer " + jwt.generateToken(detalles.loadUserByUsername(mail));
    }

    private ResultActions consultar(String ruta, String mail, String desde, String hasta, Integer sede) throws Exception {
        var pedido = get("/reportes/" + ruta).param("desde", desde).param("hasta", hasta);
        if (sede != null) pedido.param("sedeId", sede.toString());
        if (mail != null) pedido.header("Authorization", bearer(mail));
        return mvc.perform(pedido);
    }

    private String sedeJson(String ruta, Integer id) {
        return "$." + ruta + "[?(@.sedeId==" + id + ")]";
    }

    // ----------------------------------------------------------------- accesos

    @Test
    void accesosConsolidadosDeLaCadenaYDesglosePorSede() throws Exception {
        consultar("ocupacion", gerente, DESDE, HASTA, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.resumen.totalIngresos").value(6))        // 4 de A + 2 de B (excluye hasta y julio)
                .andExpect(jsonPath("$.resumen.usuariosUnicos").value(4))        // u1,u2,u3,u4
                .andExpect(jsonPath("$.resumen.ingresosOffline").value(1))
                .andExpect(jsonPath("$.resumen.ingresosSinSalida").value(1))
                .andExpect(jsonPath("$.resumen.permanenciaMediaMinutos").value(54.0)) // (60+90+30+30+60)/5
                .andExpect(jsonPath(sedeJson("porSede", sedeA) + ".totalIngresos").value(4))
                .andExpect(jsonPath(sedeJson("porSede", sedeA) + ".usuariosUnicos").value(3))
                .andExpect(jsonPath(sedeJson("porSede", sedeA) + ".picoSimultaneo").value(2))
                .andExpect(jsonPath(sedeJson("porSede", sedeA) + ".porcentajePico").value(20.0))
                .andExpect(jsonPath(sedeJson("porSede", sedeA) + ".permanenciaMediaMinutos").value(60.0))
                .andExpect(jsonPath(sedeJson("porSede", sedeB) + ".totalIngresos").value(2))
                .andExpect(jsonPath(sedeJson("porSede", sedeB) + ".picoSimultaneo").value(1))
                .andExpect(jsonPath(sedeJson("porSede", sedeB) + ".porcentajePico").value(5.0))
                .andExpect(jsonPath("$.porDia.length()").value(2))
                .andExpect(jsonPath("$.porDia[0].fecha").value("2030-06-10"))
                .andExpect(jsonPath("$.porDia[0].totalIngresos").value(5))
                .andExpect(jsonPath("$.porDia[0].usuariosUnicos").value(4))
                .andExpect(jsonPath("$.porDia[1].fecha").value("2030-06-11"))
                .andExpect(jsonPath("$.porDia[1].totalIngresos").value(1))
                .andExpect(jsonPath("$.generadoEn").exists())
                .andExpect(jsonPath("$.advertencias.length()").value(3));
    }

    @Test
    void accesosFiltradosPorSedeSoloCuentanEsaSede() throws Exception {
        consultar("ocupacion", gerente, DESDE, HASTA, sedeA).andExpect(status().isOk())
                .andExpect(jsonPath("$.sedeId").value(sedeA))
                .andExpect(jsonPath("$.resumen.totalIngresos").value(4))
                .andExpect(jsonPath("$.resumen.usuariosUnicos").value(3))
                .andExpect(jsonPath("$.porSede.length()").value(1));
    }

    @Test
    void accesosDeUnPeriodoSinDatosDevuelveCerosYSerieContinua() throws Exception {
        consultar("ocupacion", gerente, "2031-01-01T00:00:00-03:00", "2031-01-04T00:00:00-03:00", sedeA)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumen.totalIngresos").value(0))
                .andExpect(jsonPath("$.resumen.usuariosUnicos").value(0))
                .andExpect(jsonPath("$.resumen.permanenciaMediaMinutos").doesNotExist())
                .andExpect(jsonPath("$.porSede[0].totalIngresos").value(0))
                .andExpect(jsonPath("$.porSede[0].picoSimultaneo").value(0))
                .andExpect(jsonPath("$.porDia.length()").value(3))
                .andExpect(jsonPath("$.porDia[2].totalIngresos").value(0));
    }

    // -------------------------------------------------------------- financiero

    @Test
    void financieroConsolidaCobrosDevolucionesYNetoNegativoConAtribucionPorSede() throws Exception {
        consultar("ingresos", gerente, DESDE, HASTA, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.moneda").value("ARS"))
                .andExpect(jsonPath("$.totales.cobrosBrutos").value(21000.0))     // 10000 + 3000 + 7000 + 1000
                .andExpect(jsonPath("$.totales.devoluciones").value(21500.0))     // 20000 (de un pago de mayo) + 1500
                .andExpect(jsonPath("$.totales.neto").value(-500.0))              // negativo es válido
                .andExpect(jsonPath("$.totales.cantidadCobros").value(4))
                .andExpect(jsonPath("$.totales.cantidadDevoluciones").value(2))
                .andExpect(jsonPath("$.totales.operacionesRechazadas").value(1))
                .andExpect(jsonPath(sedeJson("porSede", sedeA) + ".cobrosBrutos").value(10000.0))
                .andExpect(jsonPath(sedeJson("porSede", sedeA) + ".devoluciones").value(20000.0))
                .andExpect(jsonPath(sedeJson("porSede", sedeA) + ".neto").value(-10000.0))
                .andExpect(jsonPath(sedeJson("porSede", sedeB) + ".cobrosBrutos").value(10000.0))
                .andExpect(jsonPath(sedeJson("porSede", sedeB) + ".devoluciones").value(1500.0))
                .andExpect(jsonPath(sedeJson("porSede", sedeB) + ".neto").value(8500.0))
                .andExpect(jsonPath("$.porSede[?(@.sedeId==null)].cobrosBrutos").value(1000.0))
                .andExpect(jsonPath("$.porConcepto[?(@.concepto=='MEMBRESIA')].cobrosBrutos").value(18000.0))
                .andExpect(jsonPath("$.porConcepto[?(@.concepto=='MEMBRESIA')].devoluciones").value(20000.0))
                .andExpect(jsonPath("$.porConcepto[?(@.concepto=='RESERVA_CANCHA')].cobrosBrutos").value(3000.0))
                .andExpect(jsonPath("$.porConcepto[?(@.concepto=='RESERVA_CANCHA')].devoluciones").value(1500.0))
                .andExpect(jsonPath("$.porDia.length()").value(2))
                .andExpect(jsonPath("$.porDia[0].cobrosBrutos").value(20000.0))
                .andExpect(jsonPath("$.porDia[0].devoluciones").value(1500.0))
                .andExpect(jsonPath("$.porDia[1].cobrosBrutos").value(1000.0))
                .andExpect(jsonPath("$.porDia[1].devoluciones").value(20000.0))
                .andExpect(jsonPath("$.porDia[1].neto").value(-19000.0));
    }

    @Test
    void financieroFiltradoPorSedeAtribuyeCadaPagoASuSede() throws Exception {
        consultar("ingresos", gerente, DESDE, HASTA, sedeB).andExpect(status().isOk())
                .andExpect(jsonPath("$.totales.cobrosBrutos").value(10000.0))
                .andExpect(jsonPath("$.totales.devoluciones").value(1500.0))
                .andExpect(jsonPath("$.totales.neto").value(8500.0))
                .andExpect(jsonPath("$.totales.cantidadCobros").value(2))
                .andExpect(jsonPath("$.totales.operacionesRechazadas").value(1))
                .andExpect(jsonPath("$.porSede.length()").value(1));
        consultar("ingresos", gerente, DESDE, HASTA, sedeA).andExpect(status().isOk())
                .andExpect(jsonPath("$.totales.cobrosBrutos").value(10000.0))
                .andExpect(jsonPath("$.totales.devoluciones").value(20000.0))
                .andExpect(jsonPath("$.totales.operacionesRechazadas").value(0));
    }

    @Test
    void financieroDeUnPeriodoVacioDevuelveCeros() throws Exception {
        consultar("ingresos", gerente, "2031-01-01T00:00:00-03:00", "2031-01-03T00:00:00-03:00", sedeA)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totales.cobrosBrutos").value(0.0))
                .andExpect(jsonPath("$.totales.neto").value(0.0))
                .andExpect(jsonPath("$.totales.cantidadCobros").value(0))
                .andExpect(jsonPath("$.porConcepto.length()").value(0))
                .andExpect(jsonPath("$.porDia.length()").value(2));
    }

    @Test
    void elPeriodoEsSemiabiertoYTrabajaEnHoraArgentina() throws Exception {
        // 2030-06-10T03:00Z es 00:00 en Buenos Aires (-03:00): mismo período que DESDE/HASTA con otro offset.
        consultar("ingresos", gerente, "2030-06-10T03:00:00Z", "2030-06-12T03:00:00Z", null).andExpect(status().isOk())
                .andExpect(jsonPath("$.totales.cobrosBrutos").value(21000.0));
        // Terminar un minuto antes de las 21:00 del 10 deja afuera la devolución de las 21:00 (hasta es exclusivo).
        consultar("ingresos", gerente, DESDE, "2030-06-10T21:00:00-03:00", sedeB).andExpect(status().isOk())
                .andExpect(jsonPath("$.totales.devoluciones").value(0.0));
        consultar("ingresos", gerente, DESDE, "2030-06-10T21:00:01-03:00", sedeB).andExpect(status().isOk())
                .andExpect(jsonPath("$.totales.devoluciones").value(1500.0));
    }

    // ---------------------------------------------------- validación y permisos

    @Test
    void rechazaParametrosInvalidos() throws Exception {
        consultar("ocupacion", gerente, HASTA, DESDE, null).andExpect(status().isBadRequest());
        consultar("ingresos", gerente, DESDE, DESDE, null).andExpect(status().isBadRequest());
        consultar("ingresos", gerente, "2029-01-01T00:00:00-03:00", "2030-06-01T00:00:00-03:00", null).andExpect(status().isBadRequest());
        consultar("ingresos", gerente, "no-es-una-fecha", HASTA, null).andExpect(status().isBadRequest());
        mvc.perform(get("/reportes/ingresos").param("desde", DESDE).header("Authorization", bearer(gerente)))
                .andExpect(status().isBadRequest());
        consultar("ocupacion", gerente, DESDE, HASTA, 999999).andExpect(status().isNotFound());
        consultar("ingresos", gerente, DESDE, HASTA, 999999).andExpect(status().isNotFound());
    }

    @Test
    void soloElGerenteConsultaReportes() throws Exception {
        for (String ruta : List.of("ocupacion", "ingresos")) {
            consultar(ruta, null, DESDE, HASTA, null).andExpect(status().isUnauthorized());
            consultar(ruta, recepcion, DESDE, HASTA, null).andExpect(status().isForbidden());
            consultar(ruta, socio, DESDE, HASTA, null).andExpect(status().isForbidden());
        }
    }
}
