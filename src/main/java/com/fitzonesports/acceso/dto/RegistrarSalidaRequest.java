package com.fitzonesports.acceso.dto;

/** Se identifica el acceso por su id o volviendo a escanear el QR del titular: uno solo de los dos. */
public record RegistrarSalidaRequest(Integer accesoId, String qrToken) {
}
