package com.fitzonesports.clase.dto;

import jakarta.validation.constraints.NotNull;

public record ResponderOfertaRequest(@NotNull Respuesta respuesta) {

    public enum Respuesta {
        ACEPTAR, RECHAZAR
    }
}
