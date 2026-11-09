package com.fitzonesports.usuario;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Solo se habilita contra PostgreSQL aislada indicada explícitamente por el ejecutor. */
@EnabledIfEnvironmentVariable(named = "PLAN_TEST_DB_URL", matches = ".+")
@SpringBootTest(properties = {"spring.profiles.active=staging", "spring.datasource.url=${PLAN_TEST_DB_URL}",
        "spring.datasource.username=postgres", "spring.datasource.password=",
        "jwt.secret=clave-exclusiva-de-pruebas-de-registro-1234567890", "membresias.renovacion.inicio-ms=3600000"})
class RegistroIdentidadIntegrationTest {
    @Autowired WebApplicationContext contexto;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    MockMvc mvc;
    final java.util.List<String> emails = new java.util.ArrayList<>();

    @BeforeEach void preparar() {
        mvc = MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
    }

    private org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder registro(String dni, String email) throws Exception {
        emails.add(email);
        var salida = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", salida);
        String datos = "{\"nombre\":\"Ana\",\"apellido\":\"Prueba\",\"dni\":\"" + dni
                + "\",\"email\":\"" + email + "\",\"password\":\"clave-de-prueba\"}";
        return multipart("/auth/register")
                .file(new MockMultipartFile("datos", "", "application/json", datos.getBytes(StandardCharsets.UTF_8)))
                .file(new MockMultipartFile("foto", "foto.png", "image/png", salida.toByteArray()));
    }

    @AfterEach void limpiarCuentasPropias() {
        for (String email : emails) jdbc.update("DELETE FROM usuario WHERE email=?", email);
    }

    @Test void dniDuplicadoDevuelveConflictoSinCrearOtraCuenta() throws Exception {
        String dni = UUID.randomUUID().toString();
        mvc.perform(registro(dni, UUID.randomUUID() + "@fitzone.test")).andExpect(status().isCreated());
        String otroEmail = UUID.randomUUID() + "@fitzone.test";
        mvc.perform(registro(dni, otroEmail)).andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(0,
                jdbc.queryForObject("SELECT count(*) FROM usuario WHERE email=?", Integer.class, otroEmail));
    }

    @Test void emailDuplicadoConservaConflictoExistente() throws Exception {
        String email = UUID.randomUUID() + "@fitzone.test";
        mvc.perform(registro(UUID.randomUUID().toString(), email)).andExpect(status().isCreated());
        mvc.perform(registro(UUID.randomUUID().toString(), email)).andExpect(status().isConflict());
    }

    @Test void registroNormalPersistePerfilYFotoPrivada() throws Exception {
        String dni = UUID.randomUUID().toString(), email = UUID.randomUUID() + "@fitzone.test";
        String cuerpo = mvc.perform(registro(dni, email)).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        var token = java.util.regex.Pattern.compile("\"token\"\\s*:\\s*\"([^\"]+)\"").matcher(cuerpo);
        org.junit.jupiter.api.Assertions.assertTrue(token.find());
        String bearer = "Bearer " + token.group(1);
        mvc.perform(get("/usuarios/me").header("Authorization", bearer)).andExpect(status().isOk())
                .andExpect(jsonPath("$.dni").value(dni)).andExpect(jsonPath("$.email").value(email));
        mvc.perform(get("/usuarios/me/foto").header("Authorization", bearer)).andExpect(status().isOk())
                .andExpect(content().contentType("image/png"));
        mvc.perform(get("/usuarios/me/foto")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/usuarios/me").header("Authorization", bearer).contentType("application/json")
                .content("{\"nombre\":\"Ana Nueva\",\"dni\":\"no-cambiar\",\"email\":\"otro@fitzone.test\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("Ana Nueva"))
                .andExpect(jsonPath("$.dni").value(dni)).andExpect(jsonPath("$.email").value(email));
        var nueva = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB), "jpeg", nueva);
        mvc.perform(multipart("/usuarios/me/foto").file(new MockMultipartFile("foto", "foto.jpg", "image/jpeg", nueva.toByteArray()))
                .with(req -> { req.setMethod("PUT"); return req; }).header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(get("/usuarios/me/foto").header("Authorization", bearer)).andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"));
        jdbc.update("DELETE FROM usuario_foto WHERE usuario_id=(SELECT id FROM usuario WHERE email=?)", email);
        jdbc.update("UPDATE usuario SET foto=NULL WHERE email=?", email);
        mvc.perform(get("/usuarios/me").header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(get("/usuarios/me/foto").header("Authorization", bearer)).andExpect(status().isNotFound());
    }
}
