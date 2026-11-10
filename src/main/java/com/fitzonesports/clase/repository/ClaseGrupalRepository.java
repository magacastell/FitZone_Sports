package com.fitzonesports.clase.repository;

import com.fitzonesports.clase.model.ClaseGrupal;
import com.fitzonesports.clase.model.EstadoClase;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public interface ClaseGrupalRepository extends JpaRepository<ClaseGrupal, Integer> {

    /** SELECT ... FOR UPDATE: serializa reservas, cancelaciones y cambios de una misma clase (cupo sin sobreventa). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ClaseGrupal c where c.id = :id")
    Optional<ClaseGrupal> bloquearPorId(@Param("id") Integer id);

    default ClaseGrupal bloquear(Integer id) {
        return bloquearPorId(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La clase no existe"));
    }

    Page<ClaseGrupal> findBySedeIdAndInicioGreaterThanEqualAndInicioLessThan(
            Integer sedeId, LocalDateTime desde, LocalDateTime hasta, Pageable pageable);

    Page<ClaseGrupal> findByInicioGreaterThanEqualAndInicioLessThan(
            LocalDateTime desde, LocalDateTime hasta, Pageable pageable);

    @Query("select count(c) > 0 from ClaseGrupal c where c.instructorId = :instructorId and c.estado <> :cancelada "
            + "and c.inicio < :fin and c.fin > :inicio and c.id <> :excluirId")
    boolean haySolapamientoDeInstructor(@Param("instructorId") Integer instructorId,
            @Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin,
            @Param("excluirId") Integer excluirId, @Param("cancelada") EstadoClase cancelada);

    default boolean haySolapamientoDeInstructor(Integer instructorId, LocalDateTime inicio, LocalDateTime fin,
            Integer excluirId) {
        return haySolapamientoDeInstructor(instructorId, inicio, fin, excluirId, EstadoClase.CANCELADA);
    }
}
