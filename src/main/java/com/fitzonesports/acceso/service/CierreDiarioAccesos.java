package com.fitzonesports.acceso.service;

import com.fitzonesports.acceso.config.AccesoConfig;
import com.fitzonesports.acceso.repository.RegistroAccesoRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Al final del día cierra los ingresos que nadie registró como salida, "por las dudas": el aforo de todas
 * las sedes vuelve a 0 y nadie queda bloqueado por RN-01 al día siguiente.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CierreDiarioAccesos {

    private final RegistroAccesoRepository registroAccesoRepository;
    private final Clock clock;

    // Todos los días a las 23:59:00 (segundo, minuto, hora, día, mes, día de la semana).
    @Scheduled(cron = "0 59 23 * * *", zone = AccesoConfig.ZONA_HORARIA)
    @Transactional
    public void cerrarIngresosAbiertos() {
        int cerrados = registroAccesoRepository.cerrarAbiertos(LocalDateTime.now(clock));
        log.info("Cierre diario de accesos: {} ingresos abiertos cerrados", cerrados);
    }
}
