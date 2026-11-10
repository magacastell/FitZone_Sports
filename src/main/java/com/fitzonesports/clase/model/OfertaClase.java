package com.fitzonesports.clase.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Lugar liberado ofrecido al primero de la lista de espera. Mientras esta PENDIENTE el lugar queda ocupado. */
@Entity
@Table(name = "oferta_clase")
@Getter
@Setter
@NoArgsConstructor
public class OfertaClase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "clase_grupalid", nullable = false)
    private Integer claseId;

    @Column(name = "usuarioid", nullable = false)
    private Integer usuarioId;

    @Column(name = "inscripcion_esperaid", nullable = false)
    private Integer inscripcionId;

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn;

    @Column(name = "vence_en", nullable = false)
    private LocalDateTime venceEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoOferta estado = EstadoOferta.PENDIENTE;

    @Column(name = "respondida_en")
    private LocalDateTime respondidaEn;

    @Column(name = "reserva_claseid")
    private Integer reservaId;
}
