package com.fitzonesports.security;

import com.fitzonesports.usuario.controller.UsuarioController;
import com.fitzonesports.sede.controller.SedeController;
import com.fitzonesports.membresia.controller.PlanController;
import com.fitzonesports.membresia.controller.MembresiaController;
import com.fitzonesports.acceso.controller.AccesoController;
import com.fitzonesports.clase.controller.ClaseController;
import com.fitzonesports.reserva.controller.CanchaController;
import com.fitzonesports.reserva.controller.ReservaController;
import com.fitzonesports.pago.controller.PagoController;
import com.fitzonesports.reporte.controller.ReporteController;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.InvocationTargetException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EndpointAuthorizationTest {
    private static final List<Class<?>> CONTROLLERS = List.of(
        UsuarioController.class,
        SedeController.class,
        PlanController.class,
        MembresiaController.class,
        AccesoController.class,
        ClaseController.class,
        CanchaController.class,
        ReservaController.class,
        PagoController.class,
        ReporteController.class);

    private AnnotationConfigApplicationContext context;

    @Configuration
    @EnableMethodSecurity
    static class MethodSecurityConfiguration {}

    @BeforeEach
    void setUp() {
        context = new AnnotationConfigApplicationContext();
        context.register(MethodSecurityConfiguration.class);
        CONTROLLERS.forEach(context::register);
        context.refresh();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        context.close();
    }

    @Test
    void gerenteCanReachEveryBusinessStub() throws Exception {
        authenticate("GERENTE");
        for (Class<?> controller : CONTROLLERS) {
            Object bean = context.getBean(controller);
            for (var method : controller.getDeclaredMethods()) {
                assertEquals(501, ((ResponseEntity<?>) method.invoke(bean)).getStatusCode().value(),
                        controller.getSimpleName() + "." + method.getName());
            }
        }
    }

    @Test
    void unknownRoleCannotReachAnyBusinessStub() {
        authenticate("DESCONOCIDO");
        for (Class<?> controller : CONTROLLERS) {
            Object bean = context.getBean(controller);
            for (var method : controller.getDeclaredMethods()) {
                var error = assertThrows(InvocationTargetException.class, () -> method.invoke(bean));
                assertInstanceOf(AccessDeniedException.class, error.getCause());
            }
        }
    }

    @Test
    void customerCannotPerformReceptionOrManagerOperations() {
        authenticate("CLIENTE_EXTERNO");
        assertThrows(AccessDeniedException.class,
                () -> context.getBean(AccesoController.class).registrarIngreso());
        assertThrows(AccessDeniedException.class,
                () -> context.getBean(ClaseController.class).reservarClase());
        assertThrows(AccessDeniedException.class,
                () -> context.getBean(PlanController.class).crearPlan());
        assertEquals(501, context.getBean(CanchaController.class).reservarTurno().getStatusCode().value());
    }

    @Test
    void memberCanReserveClassesButCannotRecordAccess() {
        authenticate("SOCIO_ACTIVO");
        assertEquals(501, context.getBean(ClaseController.class).reservarClase().getStatusCode().value());
        assertEquals(501, context.getBean(AccesoController.class).obtenerQr().getStatusCode().value());
        assertThrows(AccessDeniedException.class,
                () -> context.getBean(AccesoController.class).registrarIngreso());
    }

    @Test
    void receptionCanManageLocalOperationsButCannotSetGlobalPlansOrProcessPayments() {
        authenticate("RECEPCIONISTA");
        assertEquals(501, context.getBean(AccesoController.class).registrarIngreso().getStatusCode().value());
        assertEquals(501, context.getBean(ClaseController.class).crearClase().getStatusCode().value());
        assertThrows(AccessDeniedException.class,
                () -> context.getBean(PlanController.class).crearPlan());
        assertThrows(AccessDeniedException.class,
                () -> context.getBean(PagoController.class).crearPago());
    }

    private void authenticate(String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("test-user", "unused", "ROLE_" + role));
    }
}
