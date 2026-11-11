package com.fitzonesports.reserva.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;

@Entity @Table(name="cancha") @Getter @Setter @NoArgsConstructor
public class Cancha {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Integer id;
    @Column(nullable=false) private String nombre;
    @Column(name="costo_base_hora",nullable=false,precision=21,scale=2) private BigDecimal costoBaseHora;
    @Column(nullable=false) private short activa;
    @Column(name="sedeid",nullable=false) private Integer sedeId;
    @Column(name="tipo_canchaid",nullable=false) private Integer tipoId;
}
