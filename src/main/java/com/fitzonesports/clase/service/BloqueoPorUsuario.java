package com.fitzonesports.clase.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

/**
 * Lock de PostgreSQL por usuario (advisory lock), vigente hasta el fin de la transaccion. Sirve para que dos
 * pedidos simultaneos del mismo usuario sobre clases distintas no pasen ambos el control de horarios superpuestos.
 */
@Component
public class BloqueoPorUsuario {

    private static final int ESPACIO_M3 = 3001;

    @PersistenceContext
    private EntityManager em;

    public void bloquear(Integer usuarioId) {
        em.createNativeQuery("select cast(pg_advisory_xact_lock(:espacio, :usuario) as varchar)")
                .setParameter("espacio", ESPACIO_M3)
                .setParameter("usuario", usuarioId)
                .getSingleResult();
    }
}
