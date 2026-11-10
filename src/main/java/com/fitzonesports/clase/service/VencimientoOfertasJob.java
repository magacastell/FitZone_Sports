package com.fitzonesports.clase.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Cada minuto vence las ofertas de lugar sin respuesta (8 h, o 1 h antes de la clase) y las pasa al siguiente. */
@Component
@RequiredArgsConstructor
public class VencimientoOfertasJob {

    private static final Logger log = LoggerFactory.getLogger(VencimientoOfertasJob.class);

    private final ListaEsperaService listaEspera;

    @Scheduled(fixedDelayString = "${clases.ofertas.intervalo-ms:60000}",
            initialDelayString = "${clases.ofertas.inicio-ms:60000}")
    public void vencerOfertas() {
        for (Integer id : listaEspera.ofertasVencidas()) {
            try {
                listaEspera.vencerOferta(id);
            } catch (RuntimeException e) {
                log.error("No se pudo vencer la oferta de clase {}", id, e);
            }
        }
    }
}
