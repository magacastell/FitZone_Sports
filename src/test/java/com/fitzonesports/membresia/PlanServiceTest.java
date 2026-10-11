package com.fitzonesports.membresia;

import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.model.PlanMembresia;
import com.fitzonesports.membresia.repository.PlanMembresiaRepository;
import com.fitzonesports.membresia.service.PlanService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PlanServiceTest {
    private PlanMembresiaRepository repository;
    private PlanService service;

    @BeforeEach
    void setup() {
        repository = mock(PlanMembresiaRepository.class);
        service = new PlanService(repository);
    }

    @Test
    void createsActivePlanAndPreservesCents() {
        when(repository.saveAndFlush(any())).thenAnswer(call -> {
            PlanMembresia plan = call.getArgument(0);
            plan.setId(1);
            return plan;
        });
        for (int months : List.of(1, 3, 12)) {
            var result = service.crearPlan(new PlanRequest(" Mensual ", months, new BigDecimal("15000.50")));
            assertEquals("Mensual", result.nombre());
            assertEquals(months, result.duracionMeses());
            assertEquals(new BigDecimal("15000.50"), result.precio());
            assertTrue(result.activo());
        }
    }

    @Test
    void rejectsUnsupportedDurationBeforeSaving() {
        assertStatus(400, () -> service.crearPlan(new PlanRequest("Semestral", 6, BigDecimal.TEN)));
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void inactiveNamesRemainReservedAndConcurrentDuplicatesAreConflicts() {
        PlanMembresia existing = plan();
        existing.setActivo(false);
        when(repository.findByNombreIgnoreCase("mensual")).thenReturn(Optional.of(existing));
        assertStatus(409, () -> service.crearPlan(new PlanRequest(" mensual ", 1, BigDecimal.TEN)));
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));
        assertStatus(409, () -> service.crearPlan(new PlanRequest("Anual", 12, BigDecimal.TEN)));
    }

    @Test
    void deletionIsIdempotentAndPatchReactivatesWithoutChangingOtherFields() {
        PlanMembresia existing = plan();
        when(repository.findById(1)).thenReturn(Optional.of(existing));
        when(repository.saveAndFlush(existing)).thenReturn(existing);
        service.desactivarPlan(1);
        service.desactivarPlan(1);
        assertFalse(existing.isActivo());
        var result = service.actualizarPlan(1, new ActualizarPlanRequest(null, null, null, true));
        assertTrue(result.activo());
        assertEquals("Mensual", result.nombre());
        assertEquals(1, result.duracionMeses());
        assertEquals(BigDecimal.TEN, result.precio());
        verify(repository, never()).delete(any());
        verify(repository, never()).deleteById(any());
    }

    @Test
    void updatesOwnNameButRejectsOtherPlanNameAndInvalidDuration() {
        PlanMembresia existing = plan();
        when(repository.findById(1)).thenReturn(Optional.of(existing));
        when(repository.findByNombreIgnoreCase("Mensual")).thenReturn(Optional.of(existing));
        when(repository.saveAndFlush(existing)).thenReturn(existing);
        service.actualizarPlan(1, new ActualizarPlanRequest(" Mensual ", 3, new BigDecimal("20.25"), null));
        assertEquals(3, existing.getDuracionMeses());
        assertEquals(new BigDecimal("20.25"), existing.getPrecio());
        assertStatus(400, () -> service.actualizarPlan(1, new ActualizarPlanRequest(null, 2, null, null)));
        PlanMembresia other = plan();
        other.setId(2);
        when(repository.findByNombreIgnoreCase("Anual")).thenReturn(Optional.of(other));
        assertStatus(409, () -> service.actualizarPlan(1, new ActualizarPlanRequest("Anual", null, null, null)));
    }

    @Test
    void unknownPlansReturnNotFound() {
        assertStatus(404, () -> service.desactivarPlan(99));
        assertStatus(404, () -> service.actualizarPlan(99, new ActualizarPlanRequest(null, null, null, true)));
    }

    @Test
    void listingSelectsActiveOrAllPlans() {
        when(repository.findByActivoTrueOrderByDuracionMesesAscNombreAsc()).thenReturn(List.of(plan()));
        when(repository.findAllByOrderByDuracionMesesAscNombreAsc()).thenReturn(List.of());
        assertEquals(1, service.listarPlanes(false).size());
        assertTrue(service.listarPlanes(true).isEmpty());
    }

    private PlanMembresia plan() {
        PlanMembresia plan = new PlanMembresia();
        plan.setId(1);
        plan.setNombre("Mensual");
        plan.setDuracionMeses(1);
        plan.setPrecio(BigDecimal.TEN);
        return plan;
    }

    private void assertStatus(int status, Runnable action) {
        assertEquals(status, assertThrows(ResponseStatusException.class, action::run).getStatusCode().value());
    }
}
