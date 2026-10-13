package com.fitzonesports.acceso.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Clase de configuración de Spring.
 *
 * Nadie la llama directamente: al arrancar, Spring busca las clases marcadas con @Configuration y ejecuta
 * sus métodos @Bean. Lo que devuelve cada método (acá, un Clock) queda guardado en el "contenedor" de Spring,
 * y cualquier clase que lo pida en su constructor lo recibe sola. Eso se llama inyección de dependencias.
 *
 * Acá se define el Clock, el reloj del sistema. Lo piden por constructor QrTokenService (fecha de emisión y
 * vencimiento del QR) y AccesoService (hora de ingreso, de salida y del aforo).
 *
 * Por qué no usar LocalDateTime.now() directo: Spring Boot no trae un Clock por defecto, y tener el reloj como
 * dependencia permite fijar la hora en una prueba, por ejemplo para simular que un QR ya venció sin esperar 60 s.
 *
 * Por qué la zona horaria fija: el servidor desplegado corre en UTC, y "el final del día" de la sede es el de
 * Argentina. Así las horas guardadas y el cierre diario de accesos no dependen de dónde corra la aplicación.
 *
 * @EnableScheduling activa las tareas programadas: los métodos marcados con @Scheduled (ver CierreDiarioAccesos)
 * se ejecutan solos a la hora indicada. Sin esta anotación Spring los ignora.
 */
@Configuration
@EnableScheduling
public class AccesoConfig {

    public static final String ZONA_HORARIA = "America/Argentina/Buenos_Aires";

    @Bean
    public Clock clock() {
        return Clock.system(ZoneId.of(ZONA_HORARIA));
    }
}
