package com.fitzonesports.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@Profile(SwaggerUiConfig.DEVELOPMENT_PROFILE)
public class SwaggerUiConfig implements WebMvcConfigurer {

    public static final String DEVELOPMENT_PROFILE = "dev & !staging & !prod";

    private final String webjarVersion;

    public SwaggerUiConfig(@Value("${fitzone.openapi.swagger-ui-version}") String webjarVersion) {
        this.webjarVersion = webjarVersion;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/swagger-ui/**")
                .addResourceLocations("classpath:/fitzone-api-docs/");
        registry.addResourceHandler("/swagger-ui/assets/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/swagger-ui/" + webjarVersion + "/");
    }
}
