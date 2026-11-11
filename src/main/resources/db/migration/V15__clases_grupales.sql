-- M3 Clases grupales: reservas, lista de espera y ofertas de lugar.
-- Hasta ahora ninguna funcion escribia en estas tablas, asi que los cambios no migran datos reales.

DO $$
BEGIN
    IF EXISTS (SELECT lower(btrim(nombre)) FROM tipo_clase GROUP BY lower(btrim(nombre)) HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Hay tipos de clase con nombre duplicado: unificarlos antes de aplicar V15';
    END IF;
END $$;

-- Clase programada: se agrega fin y estado; la fecha repetia el dia de horario (que sigue siendo el inicio).
ALTER TABLE clase_grupal ADD COLUMN fin timestamp;
UPDATE clase_grupal SET fin = horario + interval '1 hour';
ALTER TABLE clase_grupal ALTER COLUMN fin SET NOT NULL;
ALTER TABLE clase_grupal ADD COLUMN estado varchar(20) NOT NULL DEFAULT 'PROGRAMADA';
ALTER TABLE clase_grupal ADD COLUMN motivo_cancelacion varchar(255);
ALTER TABLE clase_grupal ADD COLUMN cancelada_en timestamp;
ALTER TABLE clase_grupal DROP COLUMN fecha;
ALTER TABLE clase_grupal ADD CONSTRAINT ck_clase_grupal_horario CHECK (fin > horario);
ALTER TABLE clase_grupal ADD CONSTRAINT ck_clase_grupal_cupo CHECK (capacidad_maxima > 0);
ALTER TABLE clase_grupal ADD CONSTRAINT ck_clase_grupal_estado CHECK (estado IN ('PROGRAMADA', 'CANCELADA', 'FINALIZADA'));
CREATE INDEX ix_clase_grupal_sede_horario ON clase_grupal (sedeid, horario);
CREATE INDEX ix_clase_grupal_instructor_horario ON clase_grupal (instructorid, horario);

CREATE UNIQUE INDEX uk_tipo_clase_nombre ON tipo_clase (lower(btrim(nombre)));

-- Reserva: una persona no puede tener dos reservas confirmadas de la misma clase, ni con pedidos simultaneos.
ALTER TABLE reserva_clase ADD COLUMN cancelada_en timestamp;
ALTER TABLE reserva_clase ADD CONSTRAINT ck_reserva_clase_estado
    CHECK (estado_reserva IN ('CONFIRMADA', 'CANCELADA', 'CANCELADA_TARDIA', 'CANCELADA_POR_ADMIN'));
ALTER TABLE reserva_clase ADD CONSTRAINT ck_reserva_clase_asistencia
    CHECK (estado_asistencia IN ('PENDIENTE', 'ASISTIO', 'AUSENTE', 'NO_APLICA'));
CREATE UNIQUE INDEX uk_reserva_clase_confirmada ON reserva_clase (clase_grupalid, usuarioid) WHERE estado_reserva = 'CONFIRMADA';
CREATE INDEX ix_reserva_clase_usuario ON reserva_clase (usuarioid, estado_reserva);
CREATE INDEX ix_reserva_clase_clase ON reserva_clase (clase_grupalid, estado_reserva);

-- Lista de espera: orden de llegada por clase (posicion) y una sola entrada activa por persona.
ALTER TABLE inscripcion_espera ADD COLUMN estado varchar(20) NOT NULL DEFAULT 'EN_ESPERA';
ALTER TABLE inscripcion_espera ADD COLUMN inscripta_en timestamp NOT NULL DEFAULT now();
ALTER TABLE inscripcion_espera ALTER COLUMN inscripta_en DROP DEFAULT;
ALTER TABLE inscripcion_espera ADD CONSTRAINT ck_inscripcion_espera_estado
    CHECK (estado IN ('EN_ESPERA', 'OFERTADA', 'ACEPTADA', 'RETIRADA', 'VENCIDA'));
CREATE UNIQUE INDEX uk_inscripcion_espera_posicion ON inscripcion_espera (clase_grupalid, posicion);
CREATE UNIQUE INDEX uk_inscripcion_espera_activa ON inscripcion_espera (clase_grupalid, usuarioid)
    WHERE estado IN ('EN_ESPERA', 'OFERTADA');
CREATE INDEX ix_inscripcion_espera_fila ON inscripcion_espera (clase_grupalid, estado, posicion);

-- Oferta de un lugar liberado al primero de la fila. Mientras esta PENDIENTE, el lugar queda reservado para esa persona.
CREATE TABLE oferta_clase (
    id SERIAL NOT NULL,
    clase_grupalid int4 NOT NULL,
    usuarioid int4 NOT NULL,
    inscripcion_esperaid int4 NOT NULL,
    creada_en timestamp NOT NULL,
    vence_en timestamp NOT NULL,
    estado varchar(20) NOT NULL DEFAULT 'PENDIENTE',
    respondida_en timestamp,
    reserva_claseid int4,
    PRIMARY KEY (id),
    CONSTRAINT ck_oferta_clase_estado CHECK (estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'VENCIDA')),
    CONSTRAINT ck_oferta_clase_vigencia CHECK (vence_en > creada_en),
    CONSTRAINT fk_oferta_clase_clase FOREIGN KEY (clase_grupalid) REFERENCES clase_grupal (id),
    CONSTRAINT fk_oferta_clase_usuario FOREIGN KEY (usuarioid) REFERENCES usuario (id),
    CONSTRAINT fk_oferta_clase_inscripcion FOREIGN KEY (inscripcion_esperaid) REFERENCES inscripcion_espera (id),
    CONSTRAINT fk_oferta_clase_reserva FOREIGN KEY (reserva_claseid) REFERENCES reserva_clase (id)
);
CREATE UNIQUE INDEX uk_oferta_clase_pendiente ON oferta_clase (inscripcion_esperaid) WHERE estado = 'PENDIENTE';
CREATE INDEX ix_oferta_clase_usuario ON oferta_clase (usuarioid, estado);
CREATE INDEX ix_oferta_clase_vencimiento ON oferta_clase (estado, vence_en);
CREATE INDEX ix_oferta_clase_clase ON oferta_clase (clase_grupalid, estado);
