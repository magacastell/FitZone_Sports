package com.fitzonesports.acceso.repository;

import com.fitzonesports.acceso.model.CodigoQr;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CodigoQrRepository extends JpaRepository<CodigoQr, Integer> {

    Optional<CodigoQr> findByUsuarioId(Integer usuarioId);

    /**
     * Upsert atomico: dos pedidos simultaneos del mismo usuario no chocan con la restriccion unica.
     * Solo reemplaza si el nuevo QR vence igual o despues, asi un pedido atrasado no pisa al mas reciente.
     */
    @Modifying(clearAutomatically = true)
    @Query(value = "INSERT INTO codigo_qr (usuarioid, token, expira_en) VALUES (:usuarioId, :token, :expiraEn) "
            + "ON CONFLICT (usuarioid) DO UPDATE SET token = EXCLUDED.token, expira_en = EXCLUDED.expira_en "
            + "WHERE codigo_qr.expira_en <= EXCLUDED.expira_en", nativeQuery = true)
    void guardar(@Param("usuarioId") Integer usuarioId, @Param("token") String token,
            @Param("expiraEn") LocalDateTime expiraEn);
}
