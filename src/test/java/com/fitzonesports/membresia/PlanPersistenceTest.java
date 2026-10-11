package com.fitzonesports.membresia;

import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.repository.PlanMembresiaRepository;
import com.fitzonesports.membresia.service.PlanService;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

/** Ejecutar exclusivamente contra una base de pruebas vacia y descartable. */
@EnabledIfEnvironmentVariable(named = "PLAN_TEST_DB_URL", matches = ".+")
@SpringBootTest(properties = {
        "spring.profiles.active=staging",
        "spring.datasource.url=${PLAN_TEST_DB_URL}",
        "spring.datasource.username=postgres",
        "spring.datasource.password=",
        "jwt.secret=clave-exclusiva-para-pruebas-de-planes-1234567890"
})
@Transactional
class PlanPersistenceTest {
    @Autowired PlanService service;
    @Autowired PlanMembresiaRepository repository;
    @Autowired JdbcTemplate jdbc;

    @Test
    void persistsCentsAndSoftDeletionKeepsMembershipReference() {
        var plan = service.crearPlan(new PlanRequest("Persistencia", 1, new BigDecimal("15000.50")));
        Integer sede = jdbc.queryForObject("INSERT INTO sede(nombre, capacidad_maxima) VALUES ('Pruebas', 10) RETURNING id", Integer.class);
        Integer usuario = jdbc.queryForObject("INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) "
                + "VALUES ('prueba','prueba@example.com',(SELECT id FROM rol WHERE nombre='CLIENTE_EXTERNO'),?, 'Test','Test','test') RETURNING id", Integer.class, sede);
        jdbc.update("INSERT INTO membresia(fecha_inicio,estado,fecha_fin,renovacion_automatica,usuarioid,plan_membresiaid,sedeid) "
                + "VALUES (CURRENT_TIMESTAMP,'ACTIVA',CURRENT_TIMESTAMP + INTERVAL '1 month',0,?,?,?)", usuario, plan.id(), sede);
        service.desactivarPlan(plan.id());
        repository.flush();
        service.desactivarPlan(plan.id());
        assertFalse(repository.findById(plan.id()).orElseThrow().isActivo());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM membresia WHERE plan_membresiaid=?", Integer.class, plan.id()));
        assertTrue(service.listarPlanes(false).isEmpty());
        assertEquals(1, service.listarPlanes(true).size());
        service.actualizarPlan(plan.id(), new ActualizarPlanRequest(null, null, null, true));
        repository.flush();
        assertEquals(new BigDecimal("15000.50"), jdbc.queryForObject("SELECT precio FROM plan_membresia WHERE id=?", BigDecimal.class, plan.id()));
        assertEquals(1, service.listarPlanes(false).size());
    }

    @Test
    void ordersByDurationThenName() {
        service.crearPlan(new PlanRequest("Anual", 12, BigDecimal.TEN));
        service.crearPlan(new PlanRequest("B mensual", 1, BigDecimal.TEN));
        service.crearPlan(new PlanRequest("A mensual", 1, BigDecimal.TEN));
        assertEquals(java.util.List.of("A mensual", "B mensual", "Anual"),
                service.listarPlanes(false).stream().map(PlanResponse::nombre).toList());
    }

    @Test
    void databaseRejectsCaseInsensitiveDuplicate() {
        service.crearPlan(new PlanRequest("Mensual", 1, BigDecimal.TEN));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES ('MENSUAL',1,10)"));
    }

    @Test
    void databaseRejectsUnsupportedDuration() {
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES ('Semestral',6,10)"));
    }

    @Test
    void databaseRejectsNonpositivePrice() {
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES ('Gratis',1,0)"));
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void upgradesExistingV2DatabaseWithoutLosingPlans() {
        String url = System.getenv("PLAN_TEST_DB_URL");
        String schema = "plan_upgrade_" + java.util.UUID.randomUUID().toString().replace("-", "");
        org.flywaydb.core.Flyway.configure().dataSource(url, "postgres", "")
                .schemas(schema).target("2").load().migrate();
        jdbc.update("INSERT INTO " + schema + ".plan_membresia(nombre,duracion_meses,precio) VALUES (' Mensual ',1,15000)");
        var flyway = org.flywaydb.core.Flyway.configure().dataSource(url, "postgres", "")
                .schemas(schema).load();
        flyway.migrate();
        flyway.validate();
        assertEquals("Mensual", jdbc.queryForObject("SELECT nombre FROM " + schema + ".plan_membresia", String.class));
        assertEquals(new BigDecimal("15000.00"), jdbc.queryForObject("SELECT precio FROM " + schema + ".plan_membresia", BigDecimal.class));
        assertTrue(jdbc.queryForObject("SELECT activo FROM " + schema + ".plan_membresia", Boolean.class));
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentCreationOnlyCommitsOnePlan() throws Exception {
        String name = "Concurrente " + java.util.UUID.randomUUID();
        var ready = new java.util.concurrent.CountDownLatch(2);
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Integer> create = () -> {
                ready.countDown();
                if (!start.await(10, java.util.concurrent.TimeUnit.SECONDS)) throw new IllegalStateException("Timeout");
                try {
                    service.crearPlan(new PlanRequest(name, 1, BigDecimal.TEN));
                    return 201;
                } catch (org.springframework.web.server.ResponseStatusException ex) {
                    return ex.getStatusCode().value();
                }
            };
            var first = executor.submit(create);
            var second = executor.submit(create);
            assertTrue(ready.await(10, java.util.concurrent.TimeUnit.SECONDS));
            start.countDown();
            var results = new java.util.ArrayList<>(java.util.List.of(
                    first.get(20, java.util.concurrent.TimeUnit.SECONDS), second.get(20, java.util.concurrent.TimeUnit.SECONDS)));
            java.util.Collections.sort(results);
            assertEquals(java.util.List.of(201, 409), results);
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM plan_membresia WHERE nombre=?", Integer.class, name));
        } finally {
            jdbc.update("DELETE FROM plan_membresia WHERE nombre=?", name);
        }
    }
}
