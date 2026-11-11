package com.fitzonesports.clase.repository;

import com.fitzonesports.clase.model.EstadoInscripcion;
import com.fitzonesports.clase.model.InscripcionEspera;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InscripcionEsperaRepository extends JpaRepository<InscripcionEspera, Integer> {

    Optional<InscripcionEspera> findByClaseIdAndUsuarioIdAndEstadoIn(Integer claseId, Integer usuarioId,
            Collection<EstadoInscripcion> estados);

    Optional<InscripcionEspera> findFirstByClaseIdAndEstadoOrderByPosicionAsc(Integer claseId, EstadoInscripcion estado);

    List<InscripcionEspera> findByClaseIdAndEstadoIn(Integer claseId, Collection<EstadoInscripcion> estados);

    List<InscripcionEspera> findByUsuarioIdAndEstadoInOrderByIdDesc(Integer usuarioId,
            Collection<EstadoInscripcion> estados);

    @Query("select coalesce(max(i.posicion), 0) from InscripcionEspera i where i.claseId = :claseId")
    int ultimaPosicion(@Param("claseId") Integer claseId);
}
