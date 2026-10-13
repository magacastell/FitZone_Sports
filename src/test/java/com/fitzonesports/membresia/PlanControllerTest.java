package com.fitzonesports.membresia;

import com.fitzonesports.membresia.controller.PlanController;
import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.service.PlanService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PlanControllerTest {
    private MockMvc mvc;
    private PlanService service;

    @BeforeEach
    void setup() {
        service = mock(PlanService.class);
        mvc = MockMvcBuilders.standaloneSetup(new PlanController(service)).build();
    }

    @Test
    void validatesCreationAndPatchBodies() throws Exception {
        for (String body : List.of("{}", "{\"nombre\":\" \",\"duracionMeses\":1,\"precio\":10}",
                "{\"nombre\":\"Mensual\",\"duracionMeses\":1,\"precio\":0}",
                "{\"nombre\":\"Mensual\",\"duracionMeses\":1,\"precio\":-1}",
                "{\"nombre\":\"Mensual\",\"duracionMeses\":1,\"precio\":10.001}")) {
            mvc.perform(post("/planes").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        for (String body : List.of("{\"nombre\":\" \"}", "{\"precio\":0}", "{\"precio\":1.001}")) {
            mvc.perform(patch("/planes/1").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void returnsRepresentationsAndNoContentForDelete() throws Exception {
        var response = new PlanResponse(1, "Mensual", 1, new BigDecimal("10.50"), true);
        when(service.crearPlan(any())).thenReturn(response);
        when(service.actualizarPlan(eq(1), any())).thenReturn(response);
        when(service.listarPlanes(false)).thenReturn(List.of(response));
        mvc.perform(post("/planes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Mensual\",\"duracionMeses\":1,\"precio\":10.50}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.activo").value(true))
                .andExpect(jsonPath("$.precio").value(10.50));
        mvc.perform(get("/planes")).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(1));
        mvc.perform(patch("/planes/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        mvc.perform(delete("/planes/1")).andExpect(status().isNoContent()).andExpect(content().string(""));
        verify(service).desactivarPlan(1);
    }
}
