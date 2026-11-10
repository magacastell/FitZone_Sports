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
@Table(name = "reserva_clase")
@Getter
@Setter
@NoArgsConstructor
public class ReservaClase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "fecha_reserva", nullable = false)
    private LocalDateTime creadaEn;

    @Column(name = "cancelada_en")
    private LocalDateTime canceladaEn;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_reserva", nullable = false, length = 255)
    private EstadoReserva estadoReserva = EstadoReserva.CONFIRMADA;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_asistencia", nullable = false, length = 255)
    private EstadoAsistencia estadoAsistencia = EstadoAsistencia.PENDIENTE;

    @Column(name = "clase_grupalid", nullable = false)
    private Integer claseId;

    @Column(name = "usuarioid", nullable = false)
    private Integer usuarioId;
}
