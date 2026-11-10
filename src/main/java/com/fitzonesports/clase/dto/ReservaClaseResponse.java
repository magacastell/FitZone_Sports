package com.fitzonesports.clase.dto;

import java.time.OffsetDateTime;

/**
 * estado: CONFIRMADA o CANCELADA (ASISTIDA y AUSENTE quedan reservados para el registro de asistencia).
 * tipoCancelacion: A_TIEMPO si faltaban 2 h o mas, TARDIA si faltaba menos; NO_APLICA si no se cancelo por la persona.
 */
public record ReservaClaseResponse(
        Integer id,
        Integer claseId,
        Integer usuarioId,
        Integer sedeId,
        String estado,
        OffsetDateTime creadaEn,
        OffsetDateTime canceladaEn,
        String tipoCancelacion,
        boolean cuentaComoFalta,
        Titular titular) {

    /** Solo se completa en el listado de asistentes que ven recepcion y gerente. */
    public record Titular(String nombre, String apellido) {
    }
}
