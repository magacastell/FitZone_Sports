package com.fitzonesports.sede.dto;

import com.fitzonesports.sede.model.Sede;

public record SedeResponse(Integer id, String nombre, String direccion, Integer capacidadMaxima) {

    public static SedeResponse from(Sede sede) {
        return new SedeResponse(sede.getId(), sede.getNombre(), sede.getDireccion(), sede.getCapacidadMaxima());
    }
}
