package com.fitzonesports.clase.repository;

import com.fitzonesports.clase.model.TipoClase;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TipoClaseRepository extends JpaRepository<TipoClase, Integer> {

    List<TipoClase> findAllByOrderByNombreAscIdAsc();

    boolean existsByNombreIgnoreCase(String nombre);
}
