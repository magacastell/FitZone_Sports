package com.fitzonesports.reserva.controller;

import com.fitzonesports.reserva.dto.CanchaDtos.*;
import com.fitzonesports.reserva.service.CanchaService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
public class TarifaCanchaController {
    private final CanchaService canchas;
    @GetMapping("/tipos-cancha") @PreAuthorize("hasAnyRole('USUARIO','RECEPCIONISTA','GERENTE')")
    public List<TipoResponse> tipos(){return canchas.tipos();}
    @PostMapping("/tipos-cancha") @ResponseStatus(org.springframework.http.HttpStatus.CREATED) @PreAuthorize("hasRole('GERENTE')")
    public TipoResponse crear(Authentication auth,@Valid @RequestBody TipoRequest req){return canchas.guardarTipo(auth.getName(),null,req);}
    @PutMapping("/tipos-cancha/{id}") @PreAuthorize("hasRole('GERENTE')")
    public TipoResponse actualizar(Authentication auth,@PathVariable Integer id,@Valid @RequestBody TipoRequest req){return canchas.guardarTipo(auth.getName(),id,req);}
    @PutMapping("/sedes/{sedeId}/recargo-pico") @PreAuthorize("hasRole('GERENTE')")
    public TarifaRequest recargo(Authentication auth,@PathVariable Integer sedeId,@Valid @RequestBody TarifaRequest req){return canchas.tarifaPico(auth.getName(),sedeId,req);}
}
