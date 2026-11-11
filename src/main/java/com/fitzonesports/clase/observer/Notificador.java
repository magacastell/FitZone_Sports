package com.fitzonesports.clase.observer;

/** Puerto de salida de los avisos de M3. Hoy hay una implementacion simulada; un mail real seria otra. */
public interface Notificador {

    void enviar(Notificacion notificacion);
}
