package com.fitzonesports.membresia.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor
public class RenovacionAutomaticaJob {
    private static final Logger log = LoggerFactory.getLogger(RenovacionAutomaticaJob.class);
    private final MembresiaService service;

    @Scheduled(fixedDelayString="${membresias.renovacion.intervalo-ms:60000}", initialDelayString="${membresias.renovacion.inicio-ms:60000}")
    public void procesar() {
        service.actualizarVencimientos();
        for (Integer id : service.renovacionesAutomaticas()) {
            try { service.procesarAutomatica(id); }
            catch (RuntimeException e) { log.error("No se pudo renovar automaticamente la membresia {}",id,e); }
        }
    }
}
