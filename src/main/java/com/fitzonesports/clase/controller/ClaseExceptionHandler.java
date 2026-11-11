package com.fitzonesports.clase.controller;

import java.util.Map;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Si la base no logra dar el bloqueo de la clase (competencia o deadlock) el pedido falla con 409 y se puede reintentar. */
@RestControllerAdvice(basePackageClasses = ClaseController.class)
public class ClaseExceptionHandler {

    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ResponseEntity<Map<String, Object>> bloqueoNoObtenido(PessimisticLockingFailureException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "status", 409,
                "error", "Conflict",
                "message", "La clase está siendo modificada por otra operación. Reintentá en unos segundos."));
    }
}
