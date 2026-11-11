package com.fitzonesports.reserva.controller;

import com.fitzonesports.reserva.dto.CanchaDtos.ReservaResponse;
import com.fitzonesports.reserva.service.ReservaCanchaService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/reservas") @RequiredArgsConstructor
public class ReservaController {
    private final ReservaCanchaService reservas;
    @GetMapping("/me") @PreAuthorize("hasAnyRole('USUARIO','GERENTE')")
    public List<ReservaResponse> listarMisReservas(Authentication auth,@RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size) {return reservas.listar(auth.getName(),true,null,page,size);}
    @GetMapping @PreAuthorize("hasAnyRole('RECEPCIONISTA','GERENTE')")
    public List<ReservaResponse> listarReservas(Authentication auth,@RequestParam(required=false) Integer sedeId,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return reservas.listar(auth.getName(),false,sedeId,page,size);
    }
    @GetMapping("/{reservaId}") @PreAuthorize("hasAnyRole('USUARIO','RECEPCIONISTA','GERENTE')")
    public ReservaResponse consultar(Authentication auth,@PathVariable Integer reservaId) {
        return reservas.consultar(auth.getName(),reservaId);
    }
}
