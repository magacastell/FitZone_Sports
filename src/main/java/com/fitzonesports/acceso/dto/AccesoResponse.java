package com.fitzonesports.acceso.dto;

import com.fitzonesports.acceso.model.RegistroAcceso;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public record AccesoResponse(
        Integer id,
        Integer usuarioId,
        Integer sedeId,
        OffsetDateTime ingreso,
        OffsetDateTime salida,
        Titular titular) {

    /** Datos que recepcion necesita para el control visual al ingreso (nombre y foto). */
    public record Titular(String nombre, String apellido, String foto) {
    }

    public static AccesoResponse from(RegistroAcceso registro, Titular titular, ZoneId zona) {
        return new AccesoResponse(
                registro.getId(),
                registro.getUsuarioId(),
                registro.getSedeId(),
                registro.getFechaHoraIngreso().atZone(zona).toOffsetDateTime(),
                registro.getFechaHoraSalida() == null ? null
                        : registro.getFechaHoraSalida().atZone(zona).toOffsetDateTime(),
                titular);
    }
}
