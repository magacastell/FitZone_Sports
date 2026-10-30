package com.fitzonesports.membresia;

import com.fitzonesports.membresia.controller.PlanController;
import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.service.PlanService;
import java.math.BigDecimal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

@SpringJUnitConfig(PlanAuthorizationTest.Config.class)
class PlanAuthorizationTest {
    @Configuration
    @EnableMethodSecurity
    static class Config {
        @Bean PlanService service() { return mock(PlanService.class); }
        @Bean PlanController controller(PlanService service) { return new PlanController(service); }
    }

    @Autowired PlanController controller;

    @AfterEach
    void cleanup() { SecurityContextHolder.clearContext(); }

    @Test
    void customersOnlyListActivePlansAndCannotWrite() {
        for (String role : new String[]{"USUARIO", "RECEPCIONISTA"}) {
            authenticate(role);
            assertDoesNotThrow(() -> controller.listarPlanes(false));
            assertThrows(AccessDeniedException.class, () -> controller.crearPlan(new PlanRequest("Mensual", 1, BigDecimal.TEN)));
            assertThrows(AccessDeniedException.class, () -> controller.actualizarPlan(1, new ActualizarPlanRequest(null, null, null, true)));
            assertThrows(AccessDeniedException.class, () -> controller.desactivarPlan(1));
            if (role.equals("RECEPCIONISTA")) assertDoesNotThrow(() -> controller.listarPlanes(true));
            else assertThrows(AccessDeniedException.class, () -> controller.listarPlanes(true));
        }
    }

    @Test
    void managerCanPerformAllOperations() {
        authenticate("GERENTE");
        assertDoesNotThrow(() -> controller.listarPlanes(true));
        assertDoesNotThrow(() -> controller.crearPlan(new PlanRequest("Mensual", 1, BigDecimal.TEN)));
        assertDoesNotThrow(() -> controller.actualizarPlan(1, new ActualizarPlanRequest(null, null, null, true)));
        assertDoesNotThrow(() -> controller.desactivarPlan(1));
    }

    @Test
    void anonymousAndUnknownRolesAreRejected() {
        assertThrows(AuthenticationCredentialsNotFoundException.class, () -> controller.listarPlanes(false));
        authenticate("DESCONOCIDO");
        assertThrows(AccessDeniedException.class, () -> controller.listarPlanes(false));
    }

    private void authenticate(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "test", null, AuthorityUtils.createAuthorityList("ROLE_" + role)));
    }
}
