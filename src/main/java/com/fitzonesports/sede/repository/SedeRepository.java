package com.fitzonesports.sede.repository;

import com.fitzonesports.sede.model.Sede;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SedeRepository extends JpaRepository<Sede, Integer> {

    Optional<Sede> findByNombreIgnoreCase(String nombre);
}
