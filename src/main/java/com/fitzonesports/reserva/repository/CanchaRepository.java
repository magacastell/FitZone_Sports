package com.fitzonesports.reserva.repository;

import com.fitzonesports.reserva.model.Cancha;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CanchaRepository extends JpaRepository<Cancha,Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Cancha c where c.id=:id")
    Optional<Cancha> bloquear(@Param("id") Integer id);
}
