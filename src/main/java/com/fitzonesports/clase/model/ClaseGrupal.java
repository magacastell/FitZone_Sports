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

@Entity
@Table(name = "clase_grupal")
@Getter
@Setter
@NoArgsConstructor
public class ClaseGrupal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "horario", nullable = false)
    private LocalDateTime inicio;

    @Column(nullable = false)
    private LocalDateTime fin;

    @Column(name = "tipo_claseid", nullable = false)
    private Integer tipoClaseId;

    @Column(name = "instructorid", nullable = false)
    private Integer instructorId;

    @Column(name = "capacidad_maxima", nullable = false)
    private Integer capacidadMaxima;

    // Id plano: la sede es de otro modulo y M3 no navega sus entidades.
    @Column(name = "sedeid", nullable = false)
    private Integer sedeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoClase estado = EstadoClase.PROGRAMADA;

    @Column(name = "motivo_cancelacion")
    private String motivoCancelacion;

    @Column(name = "cancelada_en")
    private LocalDateTime canceladaEn;
}
