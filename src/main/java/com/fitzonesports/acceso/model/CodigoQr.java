package com.fitzonesports.acceso.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Ultimo QR emitido para un usuario. Solo lectura: se escribe con CodigoQrRepository.guardar (upsert atomico). */
@Entity
@Table(name = "codigo_qr")
@Getter
@NoArgsConstructor
public class CodigoQr {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String token;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    // Id plano y no @ManyToOne: M2 no navega entidades de M1.
    @Column(name = "usuarioid", nullable = false, unique = true)
    private Integer usuarioId;
}
