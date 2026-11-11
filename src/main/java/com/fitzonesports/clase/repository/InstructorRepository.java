package com.fitzonesports.clase.repository;

import com.fitzonesports.clase.model.Instructor;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InstructorRepository extends JpaRepository<Instructor, Integer> {

    List<Instructor> findAllByOrderByApellidoAscNombreAscIdAsc();

    /** Bloquea al instructor mientras se comprueba que no se superponga con otra clase suya. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Instructor i where i.id = :id")
    Optional<Instructor> bloquearPorId(@Param("id") Integer id);
}
