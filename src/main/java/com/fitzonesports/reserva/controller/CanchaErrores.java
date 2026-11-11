package com.fitzonesports.reserva.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import com.fitzonesports.pago.controller.PagoController;

@RestControllerAdvice(assignableTypes={CanchaController.class,ReservaController.class,TarifaCanchaController.class,PagoController.class})
public class CanchaErrores extends ResponseEntityExceptionHandler {
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> conflicto(DataIntegrityViolationException ex) {
        return ResponseEntity.status(409).body(ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,"La operacion entra en conflicto con un turno, reserva, mantenimiento o nombre existente"));
    }
    @ExceptionHandler(org.springframework.dao.PessimisticLockingFailureException.class)
    public ResponseEntity<ProblemDetail> bloqueo(RuntimeException ex) {
        return ResponseEntity.status(409).body(ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,"El recurso esta siendo modificado; volve a consultar disponibilidad"));
    }
}
