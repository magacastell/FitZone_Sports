package com.fitzonesports.usuario.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "usuario_foto")
@Getter @Setter
public class FotoPerfil {
    @Id @Column(name = "usuario_id") private Integer usuarioId;
    @Column(nullable = false, columnDefinition = "bytea") private byte[] contenido;
    @Column(nullable = false, length = 10) private String tipo;
    @Column(nullable = false, length = 36) private String version;
}
