package com.fitzonesports.reserva.config;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;

@Component
public record ReglasCancha(
        @Value("${canchas.retencion-minutos:10}") int retencionMinutos,
        @Value("${canchas.duracion-turno-minutos:60}") int duracionTurnoMinutos) {
    public ReglasCancha {
        if(retencionMinutos<1 || retencionMinutos>1440 || duracionTurnoMinutos<1 || duracionTurnoMinutos>720)
            throw new IllegalArgumentException("Configuracion de duracion o retencion de canchas fuera de rango");
    }
}
