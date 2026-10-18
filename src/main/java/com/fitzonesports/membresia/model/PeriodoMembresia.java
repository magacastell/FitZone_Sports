package com.fitzonesports.membresia.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name="periodo_membresia")
@Getter @Setter
public class PeriodoMembresia {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @Column(name="membresia_id", nullable=false) private Integer membresiaId;
    @Column(name="plan_id", nullable=false) private Integer planId;
    @Column(name="nombre_plan", nullable=false) private String nombrePlan;
    @Column(name="duracion_meses", nullable=false) private Integer duracionMeses;
    @Column(nullable=false, precision=21, scale=2) private BigDecimal precio;
    @Column(nullable=false) private LocalDateTime inicio;
    @Column(nullable=false) private LocalDateTime fin;
    @Column(name="pago_id") private Integer pagoId;
    @Column(name="clave_operacion") private String claveOperacion;
    @Column(nullable=false) private boolean cancelado;
}
