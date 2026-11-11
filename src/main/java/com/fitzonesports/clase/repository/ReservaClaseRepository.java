package com.fitzonesports.clase.repository;

import com.fitzonesports.clase.model.EstadoClase;
import com.fitzonesports.clase.model.EstadoReserva;
import com.fitzonesports.clase.model.ReservaClase;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservaClaseRepository extends JpaRepository<ReservaClase, Integer> {

    long countByClaseIdAndEstadoReserva(Integer claseId, EstadoReserva estado);

    boolean existsByClaseIdAndUsuarioIdAndEstadoReserva(Integer claseId, Integer usuarioId, EstadoReserva estado);

    Optional<ReservaClase> findByIdAndClaseId(Integer id, Integer claseId);

    List<ReservaClase> findByClaseIdAndEstadoReserva(Integer claseId, EstadoReserva estado);

    List<ReservaClase> findByUsuarioIdAndEstadoReservaOrderByIdDesc(Integer usuarioId, EstadoReserva estado);

    Page<ReservaClase> findByClaseId(Integer claseId, Pageable pageable);

    @Query("select r.claseId as claseId, count(r) as total from ReservaClase r "
            + "where r.claseId in :ids and r.estadoReserva = :estado group by r.claseId")
    List<ConteoClase> contarPorClase(@Param("ids") Collection<Integer> ids, @Param("estado") EstadoReserva estado);

    @Query("select count(r) > 0 from ReservaClase r, ClaseGrupal c where r.claseId = c.id and r.usuarioId = :usuarioId "
            + "and r.estadoReserva = :confirmada and c.estado = :programada and c.id <> :claseId "
            + "and c.inicio < :fin and c.fin > :inicio")
    boolean haySolapamientoDeUsuario(@Param("usuarioId") Integer usuarioId, @Param("claseId") Integer claseId,
            @Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin,
            @Param("confirmada") EstadoReserva confirmada, @Param("programada") EstadoClase programada);

    default boolean haySolapamientoDeUsuario(Integer usuarioId, Integer claseId, LocalDateTime inicio,
            LocalDateTime fin) {
        return haySolapamientoDeUsuario(usuarioId, claseId, inicio, fin, EstadoReserva.CONFIRMADA,
                EstadoClase.PROGRAMADA);
    }

    default long contarConfirmadas(Integer claseId) {
        return countByClaseIdAndEstadoReserva(claseId, EstadoReserva.CONFIRMADA);
    }

    default List<ConteoClase> contarConfirmadasPorClase(Collection<Integer> ids) {
        return contarPorClase(ids, EstadoReserva.CONFIRMADA);
    }
}
