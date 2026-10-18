package com.fitzonesports.membresia.repository;

import com.fitzonesports.membresia.model.PeriodoMembresia;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PeriodoMembresiaRepository extends JpaRepository<PeriodoMembresia,Integer> {
    List<PeriodoMembresia> findByMembresiaIdOrderByInicioAsc(Integer membresiaId);
    Optional<PeriodoMembresia> findByClaveOperacion(String clave);
}
