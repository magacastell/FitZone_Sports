package com.fitzonesports.clase.dto;

import com.fitzonesports.clase.model.EstadoInscripcion;
import java.time.OffsetDateTime;

public record EntradaListaEsperaResponse(
        Integer id,
        Integer claseId,
        Integer usuarioId,
        OffsetDateTime inscriptaEn,
        Integer posicion,
        EstadoInscripcion estado) {
}
