package com.fitzonesports.config;

import com.fitzonesports.auth.security.JwtAuthenticationFilter;
import com.fitzonesports.auth.security.SecurityConfig;
import com.fitzonesports.auth.service.CustomUserDetailsService;
import com.fitzonesports.auth.service.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.PropertySource;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SwaggerUiTest {

    @Test
    void sirveInterfazRecursosYContratoEnDesarrollo() throws Exception {
        try (var context = iniciarMvc("dev")) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

            mvc.perform(get("/api/v1/swagger-ui/index.html").contextPath("/api/v1"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(containsString("Swagger UI")));
            mvc.perform(get("/api/v1/swagger-ui/initializer.js").contextPath("/api/v1"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(containsString("./swagger.json")));
            mvc.perform(get("/api/v1/swagger-ui/assets/swagger-ui-bundle.js").contextPath("/api/v1"))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/v1/swagger-ui/assets/swagger-ui.css").contextPath("/api/v1"))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/v1/swagger-ui/swagger.json").contextPath("/api/v1"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentTypeCompatibleWith("application/json"))
                    .andExpect(jsonPath("$.servers[0].url").value("/api/v1"))
                    .andExpect(jsonPath("$.components.securitySchemes.BearerAuth.scheme").value("bearer"));
            mvc.perform(get("/api/v1/usuarios/me").contextPath("/api/v1"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"staging", "prod"})
    void noPublicaLaInterfazFueraDeDesarrollo(String perfil) throws Exception {
        try (var context = iniciarMvc(perfil)) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

            mvc.perform(get("/api/v1/swagger-ui/index.html").contextPath("/api/v1"))
                    .andExpect(status().isUnauthorized());
            mvc.perform(get("/api/v1/swagger-ui/swagger.json").contextPath("/api/v1"))
                    .andExpect(status().isUnauthorized());
        }
    }

    private AnnotationConfigWebApplicationContext iniciarMvc(String perfil) {
        var context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.getEnvironment().setActiveProfiles(perfil);
        context.register(ConfiguracionMvc.class);
        context.refresh();
        return context;
    }

    @TestConfiguration
    @EnableWebMvc
    @Import({SecurityConfig.class, SwaggerUiConfig.class})
    @PropertySource("classpath:application-dev.properties")
    static class ConfiguracionMvc {

        @Bean
        CustomUserDetailsService userDetailsService() {
            return mock(CustomUserDetailsService.class);
        }

        @Bean
        JwtAuthenticationFilter jwtAuthenticationFilter(CustomUserDetailsService userDetailsService) {
            return new JwtAuthenticationFilter(mock(JwtService.class), userDetailsService);
        }
    }
}
