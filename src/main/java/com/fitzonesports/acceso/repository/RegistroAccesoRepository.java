package com.fitzonesports.acceso.repository;

import com.fitzonesports.acceso.model.RegistroAcceso;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegistroAccesoRepository extends JpaRepository<RegistroAcceso, Integer> {

    boolean existsByUsuarioIdAndFechaHoraSalidaIsNull(Integer usuarioId);

    Optional<RegistroAcceso> findByUsuarioIdAndFechaHoraSalidaIsNull(Integer usuarioId);

    /** Aforo actual: personas con ingreso abierto en la sede. */
    long countBySedeIdAndFechaHoraSalidaIsNull(Integer sedeId);

    /** Cierra de una vez todos los ingresos sin salida; devuelve cuántos cerró. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update RegistroAcceso r set r.fechaHoraSalida = :cierre where r.fechaHoraSalida is null")
    int cerrarAbiertos(@Param("cierre") LocalDateTime cierre);
}
