package com.fitzonesports.membresia;

import com.fitzonesports.membresia.controller.MembresiaController;
import com.fitzonesports.membresia.service.MembresiaService;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class MembresiaControllerTest {
    private MembresiaService service;
    private MockMvc mvc;
    @BeforeEach void preparar() {
        service=mock(MembresiaService.class);
        mvc=MockMvcBuilders.standaloneSetup(new MembresiaController(service)).build();
    }
    @Test void exigePlanPositivoYClaveUuid() throws Exception {
        mvc.perform(post("/membresias").contentType(MediaType.APPLICATION_JSON).content("{\"planId\":1}"))
                .andExpect(status().isBadRequest());
        for (String body : new String[]{"{}","{\"planId\":0}","{\"planId\":-1}","{\"planId\":1,\"sedeId\":0}","{\"planId\":1,\"sedeId\":-1}"})
            mvc.perform(post("/membresias").header("Idempotency-Key",UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        mvc.perform(post("/membresias").header("Idempotency-Key","invalida").contentType(MediaType.APPLICATION_JSON).content("{\"planId\":1}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void exigeConsentimientoYAccionAdministrativaValida() throws Exception {
        mvc.perform(put("/membresias/1/renovacion-automatica").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        for (String body : new String[]{"{}","{\"accion\":\"SUSPENDER\",\"motivo\":\" \"}","{\"accion\":\"ACTIVA\",\"motivo\":\"x\"}"})
            mvc.perform(patch("/membresias/1/estado").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
