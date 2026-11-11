package com.fitzonesports.clase.dto;

import com.fitzonesports.clase.model.EstadoOferta;
import java.time.OffsetDateTime;

/** reserva solo viene cuando la oferta fue aceptada. */
public record OfertaClaseResponse(
        Integer id,
        Integer claseId,
        Integer usuarioId,
        OffsetDateTime creadaEn,
        OffsetDateTime venceEn,
        EstadoOferta estado,
        ReservaClaseResponse reserva) {
}
