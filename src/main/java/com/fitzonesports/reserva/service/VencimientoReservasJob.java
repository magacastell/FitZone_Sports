package com.fitzonesports.reserva.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor
public class VencimientoReservasJob {
    private final ReservaCanchaService reservas;
    @Scheduled(fixedDelayString="${canchas.vencimientos.intervalo-ms:30000}",initialDelayString="${canchas.vencimientos.inicio-ms:30000}")
    public void ejecutar(){reservas.vencer();}
}
