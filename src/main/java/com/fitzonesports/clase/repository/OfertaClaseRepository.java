package com.fitzonesports.clase.repository;

import com.fitzonesports.clase.model.EstadoOferta;
import com.fitzonesports.clase.model.OfertaClase;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OfertaClaseRepository extends JpaRepository<OfertaClase, Integer> {

    long countByClaseIdAndEstado(Integer claseId, EstadoOferta estado);

    Optional<OfertaClase> findByIdAndClaseId(Integer id, Integer claseId);

    Optional<OfertaClase> findByInscripcionIdAndEstado(Integer inscripcionId, EstadoOferta estado);

    List<OfertaClase> findByClaseIdAndEstado(Integer claseId, EstadoOferta estado);

    List<OfertaClase> findByUsuarioIdAndEstadoOrderByIdDesc(Integer usuarioId, EstadoOferta estado);

    @Query("select o.claseId as claseId, count(o) as total from OfertaClase o "
            + "where o.claseId in :ids and o.estado = :estado group by o.claseId")
    List<ConteoClase> contarPorClase(@Param("ids") Collection<Integer> ids, @Param("estado") EstadoOferta estado);

    @Query("select o.id from OfertaClase o where o.estado = :estado and o.venceEn <= :ahora order by o.id")
    List<Integer> idsVencidas(@Param("estado") EstadoOferta estado, @Param("ahora") LocalDateTime ahora);

    @Query("select o.claseId from OfertaClase o where o.id = :id")
    Optional<Integer> claseIdDe(@Param("id") Integer id);

    default long contarPendientes(Integer claseId) {
        return countByClaseIdAndEstado(claseId, EstadoOferta.PENDIENTE);
    }

    default List<ConteoClase> contarPendientesPorClase(Collection<Integer> ids) {
        return contarPorClase(ids, EstadoOferta.PENDIENTE);
    }

    default List<Integer> idsVencidas(LocalDateTime ahora) {
        return idsVencidas(EstadoOferta.PENDIENTE, ahora);
    }
}
