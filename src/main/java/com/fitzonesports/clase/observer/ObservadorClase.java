package com.fitzonesports.clase.observer;

/** Observer: recibe cada evento que publica PublicadorClase y decide si le corresponde actuar. */
public interface ObservadorClase {

    void actualizar(EventoClase evento);
}
