package com.fitzonesports.acceso.dto;

import java.time.OffsetDateTime;

public record QrAccesoResponse(String token, OffsetDateTime venceEn, Integer usuarioId) {
}
