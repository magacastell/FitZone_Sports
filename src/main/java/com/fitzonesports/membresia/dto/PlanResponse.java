package com.fitzonesports.membresia.dto;

import com.fitzonesports.membresia.model.PlanMembresia;
import java.math.BigDecimal;

/** Los precios se expresan en ARS. */
public record PlanResponse(Integer id, String nombre, Integer duracionMeses, BigDecimal precio, boolean activo) {
    public static PlanResponse from(PlanMembresia plan) {
        return new PlanResponse(plan.getId(), plan.getNombre(), plan.getDuracionMeses(), plan.getPrecio(), plan.isActivo());
    }
}
