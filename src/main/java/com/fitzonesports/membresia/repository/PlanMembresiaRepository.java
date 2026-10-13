package com.fitzonesports.membresia.repository;

import com.fitzonesports.membresia.model.PlanMembresia;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanMembresiaRepository extends JpaRepository<PlanMembresia, Integer> {
    Optional<PlanMembresia> findByNombreIgnoreCase(String nombre);
    List<PlanMembresia> findAllByOrderByDuracionMesesAscNombreAsc();
    List<PlanMembresia> findByActivoTrueOrderByDuracionMesesAscNombreAsc();
}
