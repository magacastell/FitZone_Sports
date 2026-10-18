package com.fitzonesports.membresia.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "membresia")
@Getter @Setter
public class Membresia {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(name="usuarioid", nullable=false) private Integer usuarioId;
    @Column(name="sedeid", nullable=false) private Integer sedeId;
    @Column(name="plan_membresiaid", nullable=false) private Integer planId;
    @Column(name="fecha_inicio", nullable=false) private LocalDateTime fechaInicio;
    @Column(name="fecha_fin", nullable=false) private LocalDateTime fechaFin;
    @Column(nullable=false) private String estado;
    @Column(nullable=false) private boolean suspendida;
    @Column(name="renovacion_automatica", nullable=false) private short renovacionAutomatica;
    @Column(name="token_renovacion") private String tokenRenovacion;
}
