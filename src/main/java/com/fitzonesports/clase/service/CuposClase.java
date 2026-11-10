package com.fitzonesports.clase.service;

import com.fitzonesports.clase.model.ClaseGrupal;
import com.fitzonesports.clase.repository.ConteoClase;
import com.fitzonesports.clase.repository.OfertaClaseRepository;
import com.fitzonesports.clase.repository.ReservaClaseRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Cuenta los lugares ocupados de una clase: reservas confirmadas y ofertas pendientes (el lugar ofrecido
 * queda guardado para quien lo recibio). Para que el resultado sea confiable hay que llamarlo con la fila de
 * la clase bloqueada.
 */
@Component
@RequiredArgsConstructor
public class CuposClase {

    private final ReservaClaseRepository reservas;
    private final OfertaClaseRepository ofertas;

    public long ocupados(Integer claseId) {
        return reservas.contarConfirmadas(claseId) + ofertas.contarPendientes(claseId);
    }

    public long disponibles(ClaseGrupal clase) {
        return Math.max(0, clase.getCapacidadMaxima() - ocupados(clase.getId()));
    }

    /** Version para listados: dos consultas agrupadas en vez de dos por clase. */
    public Map<Integer, Long> ocupadosPorClase(Collection<Integer> claseIds) {
        Map<Integer, Long> total = new HashMap<>();
        if (claseIds.isEmpty()) {
            return total;
        }
        for (ConteoClase c : reservas.contarConfirmadasPorClase(claseIds)) {
            total.merge(c.getClaseId(), c.getTotal(), Long::sum);
        }
        for (ConteoClase c : ofertas.contarPendientesPorClase(claseIds)) {
            total.merge(c.getClaseId(), c.getTotal(), Long::sum);
        }
        return total;
    }
}
