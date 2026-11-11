package com.fitzonesports.clase.repository;

/** Resultado de un "count ... group by clase": cuantos registros tiene cada clase. */
public interface ConteoClase {

    Integer getClaseId();

    long getTotal();
}
