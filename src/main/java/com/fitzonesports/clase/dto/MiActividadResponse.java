package com.fitzonesports.clase.dto;

import java.util.List;

/** Lo que el usuario autenticado tiene en curso en clases: reservas vigentes, lista de espera y ofertas pendientes. */
public record MiActividadResponse(
        List<ReservaConClase> reservas,
        List<EsperaConClase> listaEspera,
        List<OfertaConClase> ofertas) {

    public record ReservaConClase(ReservaClaseResponse reserva, ClaseResponse clase) {
    }

    public record EsperaConClase(EntradaListaEsperaResponse entrada, ClaseResponse clase) {
    }

    public record OfertaConClase(OfertaClaseResponse oferta, ClaseResponse clase) {
    }
}
