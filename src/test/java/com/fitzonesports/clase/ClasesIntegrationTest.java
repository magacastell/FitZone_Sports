package com.fitzonesports.clase;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fitzonesports.clase.dto.ReservaClaseResponse;
import com.fitzonesports.clase.dto.ResponderOfertaRequest.Respuesta;
import com.fitzonesports.clase.service.ListaEsperaService;
import com.fitzonesports.clase.service.ReservaClaseService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * M3 Clases grupales contra PostgreSQL real: las garantías del requisito (nunca se excede el cupo, nunca hay reservas
 * duplicadas), las reglas de 48 h y 2 h, y la lista de espera con su oferta FIFO. Los casos concurrentes usan hilos
 * reales: el resultado lo decide la base (bloqueo de la clase e índice único parcial), no el orden de llegada.
 */
@EnabledIfEnvironmentVariable(named = "PLAN_TEST_DB_URL", matches = ".+")
@SpringBootTest(properties = {"spring.profiles.active=staging", "spring.datasource.url=${PLAN_TEST_DB_URL}",
        "spring.datasource.username=postgres", "spring.datasource.password=",
        "jwt.secret=clave-exclusiva-para-pruebas-de-clases-1234567890", "membresias.renovacion.inicio-ms=3600000",
        "clases.ofertas.intervalo-ms=3600000", "clases.ofertas.inicio-ms=3600000"})
class ClasesIntegrationTest {

    @Autowired JdbcTemplate jdbc;
    @Autowired ReservaClaseService reservas;
    @Autowired ListaEsperaService espera;
    @Autowired Reloj reloj;

    @TestConfiguration
    static class Config {
        @Bean @Primary Reloj reloj() {
            return new Reloj();
        }
    }

    /** Reloj controlable: las reglas de 48 h y 2 h se prueban moviendo la hora, sin dormir. */
    static class Reloj extends Clock {
        private Instant ahora = Instant.parse("2030-06-10T15:00:00Z");
        public ZoneId getZone() { return ZoneId.of("America/Argentina/Buenos_Aires"); }
        public Clock withZone(ZoneId zona) { return Clock.fixed(ahora, zona); }
        public Instant instant() { return ahora; }
        void fijar(LocalDateTime local) { ahora = local.atZone(getZone()).toInstant(); }
        LocalDateTime local() { return LocalDateTime.ofInstant(ahora, getZone()); }
    }

    Integer sede, tipo, instructor, plan;
    final List<Integer> usuarios = new ArrayList<>();
    final List<Integer> clases = new ArrayList<>();
    String sufijo;

    @BeforeEach
    void preparar() {
        reloj.ahora = Instant.parse("2030-06-10T15:00:00Z");
        sufijo = UUID.randomUUID().toString();
        sede = jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,50) RETURNING id", Integer.class, "Clases " + sufijo);
        tipo = jdbc.queryForObject("INSERT INTO tipo_clase(nombre) VALUES (?) RETURNING id", Integer.class, "Tipo " + sufijo);
        instructor = jdbc.queryForObject("INSERT INTO instructor(nombre,apellido) VALUES ('Ins','Truc') RETURNING id", Integer.class);
        plan = jdbc.queryForObject("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES (?,1,10000) RETURNING id", Integer.class, "Plan " + sufijo);
    }

    @AfterEach
    void limpiar() {
        for (Integer c : clases) {
            jdbc.update("DELETE FROM oferta_clase WHERE clase_grupalid=?", c);
            jdbc.update("DELETE FROM inscripcion_espera WHERE clase_grupalid=?", c);
            jdbc.update("DELETE FROM reserva_clase WHERE clase_grupalid=?", c);
            jdbc.update("DELETE FROM clase_grupal WHERE id=?", c);
        }
        jdbc.update("DELETE FROM periodo_membresia WHERE membresia_id IN (SELECT id FROM membresia WHERE sedeid=?)", sede);
        jdbc.update("DELETE FROM membresia WHERE sedeid=?", sede);
        jdbc.update("DELETE FROM usuario WHERE sedeid=?", sede);
        jdbc.update("DELETE FROM plan_membresia WHERE id=?", plan);
        jdbc.update("DELETE FROM instructor WHERE id=?", instructor);
        jdbc.update("DELETE FROM tipo_clase WHERE id=?", tipo);
        jdbc.update("DELETE FROM sede WHERE id=?", sede);
    }

    // ------------------------------------------------------------------ datos

    private String usuario(String nombre, boolean conMembresia) {
        String mail = nombre + "-" + sufijo + "@test.com";
        Integer id = jdbc.queryForObject("INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) "
                + "VALUES (?,?,(SELECT id FROM rol WHERE nombre='USUARIO'),?,'Test','Clase','x') RETURNING id", Integer.class,
                UUID.randomUUID().toString().substring(0, 8), mail, sede);
        usuarios.add(id);
        if (conMembresia) {
            LocalDateTime ahora = reloj.local();
            Integer m = jdbc.queryForObject("INSERT INTO membresia(fecha_inicio,estado,fecha_fin,renovacion_automatica,usuarioid,plan_membresiaid,sedeid) "
                    + "VALUES (?,'ACTIVA',?,0,?,?,?) RETURNING id", Integer.class,
                    Timestamp.valueOf(ahora.minusDays(5)), Timestamp.valueOf(ahora.plusDays(25)), id, plan, sede);
            jdbc.update("INSERT INTO periodo_membresia(membresia_id,plan_id,nombre_plan,duracion_meses,precio,inicio,fin) VALUES (?,?,'Plan',1,10000,?,?)",
                    m, plan, Timestamp.valueOf(ahora.minusDays(5)), Timestamp.valueOf(ahora.plusDays(25)));
        }
        return mail;
    }

    private Integer clase(int cupo, long horasHastaElInicio) {
        LocalDateTime inicio = reloj.local().plusHours(horasHastaElInicio);
        Integer id = jdbc.queryForObject("INSERT INTO clase_grupal(horario,fin,tipo_claseid,instructorid,capacidad_maxima,sedeid) "
                + "VALUES (?,?,?,?,?,?) RETURNING id", Integer.class, Timestamp.valueOf(inicio),
                Timestamp.valueOf(inicio.plusHours(1)), tipo, instructor, cupo, sede);
        clases.add(id);
        return id;
    }

    private long confirmadas(Integer claseId) {
        return jdbc.queryForObject("SELECT count(*) FROM reserva_clase WHERE clase_grupalid=? AND estado_reserva='CONFIRMADA'", Long.class, claseId);
    }

    private int estado(Throwable t) {
        return ((ResponseStatusException) t).getStatusCode().value();
    }

    /** Lanza todas las tareas a la vez y devuelve cuántas salieron bien y cuántas con 409 Conflict. */
    private int[] simultaneas(List<java.util.concurrent.Callable<Object>> tareas) throws Exception {
        ExecutorService hilos = Executors.newFixedThreadPool(tareas.size());
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Object>> futuros = new ArrayList<>();
        for (var tarea : tareas) {
            futuros.add(hilos.submit(() -> { salida.await(); return tarea.call(); }));
        }
        salida.countDown();
        int ok = 0, conflictos = 0;
        for (Future<Object> f : futuros) {
            try {
                f.get();
                ok++;
            } catch (java.util.concurrent.ExecutionException e) {
                assertEquals(409, estado(e.getCause()), "toda negativa debe ser un 409 Conflict, no un error de la base");
                conflictos++;
            }
        }
        hilos.shutdownNow();
        return new int[] {ok, conflictos};
    }

    // ----------------------------------------------------------- RF-07: cupo

    @Test
    void elCupoNuncaSeExcedeConReservasSimultaneas() throws Exception {
        Integer clase = clase(3, 72);
        List<java.util.concurrent.Callable<Object>> tareas = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            String mail = usuario("u" + i, false);
            tareas.add(() -> reservas.reservar(mail, clase));
        }
        int[] r = simultaneas(tareas);
        assertEquals(3, r[0], "exactamente tantas reservas como lugares");
        assertEquals(9, r[1]);
        assertEquals(3, confirmadas(clase));
    }

    @Test
    void unaPersonaNuncaTieneDosReservasDeLaMismaClaseAunqueLoPidaEnParalelo() throws Exception {
        Integer clase = clase(10, 72);
        String mail = usuario("repetido", false);
        List<java.util.concurrent.Callable<Object>> tareas = new ArrayList<>();
        for (int i = 0; i < 6; i++) tareas.add(() -> reservas.reservar(mail, clase));
        int[] r = simultaneas(tareas);
        assertEquals(1, r[0]);
        assertEquals(5, r[1]);
        assertEquals(1, confirmadas(clase));
    }

    // ----------------------------------------------------------- RF-07: plazos

    @Test
    void lasReservasCierranExactamente48HorasAntesDelInicio() {
        String mail = usuario("plazo", false);
        reservas.reservar(mail, clase(10, 49));
        assertEquals(409, estado(assertThrows(ResponseStatusException.class, () -> reservas.reservar(mail, clase(10, 47)))));
        assertEquals(409, estado(assertThrows(ResponseStatusException.class, () -> reservas.reservar(mail, clase(10, 48)))),
                "a las 48 h justas la inscripción ya está cerrada");
    }

    @Test
    void cancelarConDosHorasOMasEsATiempoYConMenosEsTardiaYCuentaComoFalta() {
        Integer clase = clase(10, 72);
        String aTiempo = usuario("a-tiempo", false), tarde = usuario("tardia", false);
        ReservaClaseResponse r1 = reservas.reservar(aTiempo, clase);
        ReservaClaseResponse r2 = reservas.reservar(tarde, clase);
        LocalDateTime inicio = reloj.local().plusHours(72);

        reloj.fijar(inicio.minusHours(3));
        ReservaClaseResponse cancelada = reservas.cancelar(aTiempo, clase, r1.id());
        assertEquals("CANCELADA", cancelada.estado());
        assertEquals("A_TIEMPO", cancelada.tipoCancelacion());
        assertEquals(false, cancelada.cuentaComoFalta());

        reloj.fijar(inicio.minusHours(1));
        ReservaClaseResponse tardia = reservas.cancelar(tarde, clase, r2.id());
        assertEquals("TARDIA", tardia.tipoCancelacion());
        assertEquals(true, tardia.cuentaComoFalta());
        assertEquals(0, confirmadas(clase));
    }

    // ------------------------------------------------- RF-08: lista de espera

    @Test
    void alLiberarseUnLugarSeOfreceAlPrimeroDeLaFilaYSoloUnaAceptacionCrea_la_reserva() {
        Integer clase = clase(1, 72);
        String titular = usuario("titular", false), primero = usuario("primero", true), segundo = usuario("segundo", true);
        String intruso = usuario("intruso", false);
        ReservaClaseResponse reserva = reservas.reservar(titular, clase);
        assertEquals(1, espera.incorporar(primero, clase).posicion());
        assertEquals(2, espera.incorporar(segundo, clase).posicion());

        reservas.cancelar(titular, clase, reserva.id());   // libera el lugar y lo ofrece (Observer)

        List<java.util.Map<String, Object>> ofertas = jdbc.queryForList(
                "SELECT o.id, o.estado, u.email FROM oferta_clase o JOIN usuario u ON u.id=o.usuarioid WHERE o.clase_grupalid=?", clase);
        assertEquals(1, ofertas.size(), "se ofrece a una sola persona");
        assertEquals(primero, ofertas.get(0).get("email"), "al primero de la fila");
        assertEquals("PENDIENTE", ofertas.get(0).get("estado"));
        assertEquals(409, estado(assertThrows(ResponseStatusException.class, () -> reservas.reservar(intruso, clase))),
                "mientras la oferta está pendiente el lugar está reservado: nadie se lo puede llevar");

        Integer ofertaId = (Integer) ofertas.get(0).get("id");
        var aceptada = espera.responder(primero, clase, ofertaId, Respuesta.ACEPTAR);
        assertEquals("ACEPTADA", aceptada.estado().name());
        var repetida = espera.responder(primero, clase, ofertaId, Respuesta.ACEPTAR);
        assertEquals(aceptada.reserva().id(), repetida.reserva().id(), "aceptar dos veces devuelve la misma reserva");
        assertEquals(1, confirmadas(clase), "y nunca se supera el cupo ni se duplica la reserva");
        assertEquals("EN_ESPERA", jdbc.queryForObject("SELECT estado FROM inscripcion_espera WHERE clase_grupalid=? AND posicion=2", String.class, clase));
    }

    @Test
    void siElPrimeroRechazaElLugarPasaAlSiguienteDeLaFila() {
        Integer clase = clase(1, 72);
        String titular = usuario("titular", false), primero = usuario("primero", true), segundo = usuario("segundo", true);
        ReservaClaseResponse reserva = reservas.reservar(titular, clase);
        espera.incorporar(primero, clase);
        espera.incorporar(segundo, clase);
        reservas.cancelar(titular, clase, reserva.id());
        Integer oferta = jdbc.queryForObject("SELECT id FROM oferta_clase WHERE clase_grupalid=? AND estado='PENDIENTE'", Integer.class, clase);

        espera.responder(primero, clase, oferta, Respuesta.RECHAZAR);

        List<String> estados = jdbc.queryForList("SELECT u.email||'='||o.estado FROM oferta_clase o JOIN usuario u ON u.id=o.usuarioid "
                + "WHERE o.clase_grupalid=? ORDER BY o.id", String.class, clase);
        assertEquals(List.of(primero + "=RECHAZADA", segundo + "=PENDIENTE"), estados);
        assertTrue(confirmadas(clase) == 0);
    }

    @Test
    void unaEntradaDeLaListaDeEsperaNoSeDuplicaYLasPosicionesSonCorrelativasBajoConcurrencia() throws Exception {
        Integer clase = clase(1, 72);
        reservas.reservar(usuario("titular", false), clase);
        List<java.util.concurrent.Callable<Object>> tareas = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            String mail = usuario("e" + i, false);
            tareas.add(() -> espera.incorporar(mail, clase));
        }
        int[] r = simultaneas(tareas);
        assertEquals(8, r[0]);
        List<Integer> posiciones = jdbc.queryForList("SELECT posicion FROM inscripcion_espera WHERE clase_grupalid=? ORDER BY posicion", Integer.class, clase);
        assertEquals(List.of(1, 2, 3, 4, 5, 6, 7, 8), posiciones, "cada llegada recibe una posición distinta y sin huecos");
        assertNotEquals(0, posiciones.size());
    }
}
