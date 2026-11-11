package com.fitzonesports.clase.dto;

import com.fitzonesports.clase.model.TipoClase;

public record TipoClaseResponse(Integer id, String nombre) {

    public static TipoClaseResponse from(TipoClase tipo) {
        return new TipoClaseResponse(tipo.getId(), tipo.getNombre());
    }
}
