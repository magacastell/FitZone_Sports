package com.fitzonesports.clase.observer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Simulador sin red: deja el aviso en el log del servidor. */
@Component
@ConditionalOnProperty(name = "clases.notificador", havingValue = "log", matchIfMissing = true)
public class NotificadorLog implements Notificador {

    private static final Logger log = LoggerFactory.getLogger(NotificadorLog.class);

    @Override
    public void enviar(Notificacion notificacion) {
        log.info("Notificacion a {} <{}>: {} - {}", notificacion.usuarioId(), notificacion.email(),
                notificacion.asunto(), notificacion.mensaje());
    }
}
