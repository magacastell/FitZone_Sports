package com.fitzonesports.membresia.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "plan_membresia")
@Getter
@Setter
@NoArgsConstructor
public class PlanMembresia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(nullable = false, length = 255)
    private String nombre;
    @Column(name = "duracion_meses", nullable = false)
    private Integer duracionMeses;
    @Column(nullable = false, precision = 21, scale = 2)
    private BigDecimal precio;
    @Column(nullable = false)
    private boolean activo = true;
}
