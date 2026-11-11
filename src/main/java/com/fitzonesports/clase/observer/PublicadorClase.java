package com.fitzonesports.clase.observer;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Component;

/**
 * Subject del patron Observer. Los observadores se suscriben solos al iniciar la aplicacion y reciben,
 * en el mismo hilo y la misma transaccion, cada evento publicado. Asi el lugar liberado se ofrece antes de
 * que alguien mas pueda tomarlo.
 */
@Component
public class PublicadorClase {

    // Lista que tolera suscripciones y publicaciones anidadas (un observador puede publicar otro evento).
    private final List<ObservadorClase> observadores = new CopyOnWriteArrayList<>();

    public void suscribir(ObservadorClase observador) {
        observadores.add(observador);
    }

    public void desuscribir(ObservadorClase observador) {
        observadores.remove(observador);
    }

    public void publicar(EventoClase evento) {
        for (ObservadorClase observador : observadores) {
            observador.actualizar(evento);
        }
    }
}
