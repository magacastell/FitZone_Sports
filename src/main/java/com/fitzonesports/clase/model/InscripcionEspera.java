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
@Table(name = "inscripcion_espera")
@Getter
@Setter
@NoArgsConstructor
public class InscripcionEspera {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Orden de llegada dentro de la clase; el primero tiene la posicion mas baja.
    @Column(nullable = false)
    private Integer posicion;

    // 1 cuando ya se le ofrecio un lugar.
    @Column(nullable = false)
    private Short notificado = 0;

    @Column(name = "usuarioid", nullable = false)
    private Integer usuarioId;

    @Column(name = "clase_grupalid", nullable = false)
    private Integer claseId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoInscripcion estado = EstadoInscripcion.EN_ESPERA;

    @Column(name = "inscripta_en", nullable = false)
    private LocalDateTime inscriptaEn;
}
