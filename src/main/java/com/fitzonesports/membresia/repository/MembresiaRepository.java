package com.fitzonesports.membresia.repository;

import com.fitzonesports.membresia.model.Membresia;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembresiaRepository extends JpaRepository<Membresia,Integer> {
    Optional<Membresia> findByUsuarioId(Integer usuarioId);
    List<Membresia> findByRenovacionAutomatica(short habilitada);
}
