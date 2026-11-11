-- M4: importes decimales, retenciones y garantia de una sola ocupacion activa por turno.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
ALTER TABLE detalle_facturacion ALTER COLUMN concepto TYPE text;
ALTER TABLE tipo_cancha ADD COLUMN precio_hora numeric(21,2);
UPDATE tipo_cancha t SET precio_hora = (SELECT min(c.costo_base_hora) FROM cancha c WHERE c.tipo_canchaid=t.id);
ALTER TABLE tipo_cancha ADD CONSTRAINT ck_tipo_cancha_precio CHECK (precio_hora > 0);
CREATE UNIQUE INDEX uk_tipo_cancha_nombre ON tipo_cancha(lower(btrim(nombre)));
ALTER TABLE sede ADD COLUMN recargo_pico numeric(5,2) NOT NULL DEFAULT 20 CHECK (recargo_pico BETWEEN 0 AND 100);
ALTER TABLE cancha ALTER COLUMN costo_base_hora TYPE numeric(21,2);
ALTER TABLE cancha ADD CONSTRAINT ck_cancha_activa CHECK (activa IN (0,1));
CREATE UNIQUE INDEX uk_cancha_nombre_sede ON cancha(sedeid,lower(btrim(nombre)));
CREATE INDEX ix_cancha_sede ON cancha(sedeid);
ALTER TABLE turno_cancha ADD CONSTRAINT ck_turno_horas CHECK (hora_fin > hora_inicio);
ALTER TABLE turno_cancha ADD CONSTRAINT ex_turnos_superpuestos EXCLUDE USING gist
    (canchaid WITH =, tsrange(fecha+hora_inicio,fecha+hora_fin,'[)') WITH &&);
ALTER TABLE reserva_cancha ALTER COLUMN precio_aplicado TYPE numeric(21,2);
ALTER TABLE reserva_cancha ADD COLUMN creada_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE reserva_cancha ADD COLUMN vence_en timestamp;
ALTER TABLE reserva_cancha ADD COLUMN clave_operacion varchar(255) UNIQUE;
ALTER TABLE reserva_cancha ADD COLUMN detalle_precio jsonb;
ALTER TABLE reserva_cancha ADD COLUMN cancelada_en timestamp;
ALTER TABLE reserva_cancha ADD COLUMN cancelada_por integer REFERENCES usuario(id);
ALTER TABLE reserva_cancha ADD COLUMN porcentaje_reembolso numeric(5,2);
ALTER TABLE reserva_cancha ADD COLUMN cancha_nombre varchar(255);
ALTER TABLE reserva_cancha ADD COLUMN sede_nombre varchar(255);
ALTER TABLE reserva_cancha ADD COLUMN tipo_nombre varchar(255);
ALTER TABLE reserva_cancha ADD COLUMN inicio timestamp;
ALTER TABLE reserva_cancha ADD COLUMN fin timestamp;
UPDATE reserva_cancha r SET cancha_nombre=c.nombre,sede_nombre=s.nombre,tipo_nombre=tc.nombre,
    inicio=t.fecha+t.hora_inicio,fin=t.fecha+t.hora_fin FROM turno_cancha t JOIN cancha c ON c.id=t.canchaid
    JOIN sede s ON s.id=c.sedeid JOIN tipo_cancha tc ON tc.id=c.tipo_canchaid WHERE t.id=r.turno_canchaid;
-- No interpretar estados historicos ambiguos como nuevas retenciones.
DO $$ BEGIN
    IF EXISTS(SELECT 1 FROM reserva_cancha WHERE estado NOT IN ('CONFIRMADA','CANCELADA','RECHAZADA','EXPIRADA','CUMPLIDA')) THEN
        RAISE EXCEPTION 'V16: revisar reservas historicas pendientes antes de migrar';
    END IF;
END $$;
ALTER TABLE reserva_cancha ADD CONSTRAINT ck_reserva_cancha_estado CHECK
    (estado IN ('PENDIENTE_PAGO','CONFIRMADA','CANCELADA','RECHAZADA','EXPIRADA','CUMPLIDA'));
ALTER TABLE reserva_cancha ADD CONSTRAINT ck_reserva_retencion CHECK (estado <> 'PENDIENTE_PAGO' OR vence_en IS NOT NULL);
CREATE UNIQUE INDEX uk_reserva_cancha_ocupante ON reserva_cancha(turno_canchaid)
    WHERE estado IN ('PENDIENTE_PAGO','CONFIRMADA');
CREATE INDEX ix_reserva_cancha_usuario ON reserva_cancha(usuarioid,creada_en DESC);
CREATE INDEX ix_reserva_cancha_vencimiento ON reserva_cancha(vence_en) WHERE estado='PENDIENTE_PAGO';
ALTER TABLE bloqueo_mantenimiento ADD COLUMN creado_por integer REFERENCES usuario(id);
ALTER TABLE bloqueo_mantenimiento ADD COLUMN activo boolean NOT NULL DEFAULT true;
ALTER TABLE bloqueo_mantenimiento ADD CONSTRAINT ck_mantenimiento_fechas CHECK (fecha_fin IS NULL OR fecha_fin > fecha_inicio);
CREATE INDEX ix_mantenimiento_cancha ON bloqueo_mantenimiento(canchaid,fecha_inicio,fecha_fin) WHERE activo;
-- Todo escritor, tambien SQL directo, coordina mantenimiento/reservas sobre la misma cancha.
CREATE FUNCTION validar_ocupacion_cancha() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cancha_id integer; inicio_turno timestamp; fin_turno timestamp;
BEGIN
    IF TG_TABLE_NAME='reserva_cancha' THEN
        SELECT t.canchaid,t.fecha+t.hora_inicio,t.fecha+t.hora_fin INTO cancha_id,inicio_turno,fin_turno
            FROM turno_cancha t WHERE t.id=NEW.turno_canchaid;
        PERFORM id FROM cancha WHERE id=cancha_id FOR UPDATE;
        IF NEW.estado IN ('PENDIENTE_PAGO','CONFIRMADA') AND EXISTS(SELECT 1 FROM bloqueo_mantenimiento b
            WHERE b.canchaid=cancha_id AND b.activo AND b.fecha_inicio<fin_turno
            AND (b.fecha_fin IS NULL OR b.fecha_fin>inicio_turno)) THEN
            RAISE EXCEPTION 'Turno en mantenimiento' USING ERRCODE='23514';
        END IF;
    ELSE
        PERFORM id FROM cancha WHERE id=NEW.canchaid FOR UPDATE;
        IF NEW.activo AND EXISTS(SELECT 1 FROM reserva_cancha r JOIN turno_cancha t ON t.id=r.turno_canchaid
            WHERE t.canchaid=NEW.canchaid AND r.estado IN ('PENDIENTE_PAGO','CONFIRMADA')
            AND t.fecha+t.hora_fin>NEW.fecha_inicio AND (NEW.fecha_fin IS NULL OR t.fecha+t.hora_inicio<NEW.fecha_fin)) THEN
            RAISE EXCEPTION 'Mantenimiento incompatible con reservas existentes' USING ERRCODE='23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
DO $$ BEGIN
    EXECUTE format('ALTER FUNCTION %I.validar_ocupacion_cancha() SET search_path = %I, public',current_schema(),current_schema());
END $$;
CREATE TRIGGER validar_reserva_cancha BEFORE INSERT OR UPDATE ON reserva_cancha
    FOR EACH ROW EXECUTE FUNCTION validar_ocupacion_cancha();
CREATE TRIGGER validar_mantenimiento_cancha BEFORE INSERT OR UPDATE ON bloqueo_mantenimiento
    FOR EACH ROW EXECUTE FUNCTION validar_ocupacion_cancha();
CREATE UNIQUE INDEX uk_pago_reserva_cancha ON pago(referencia_id) WHERE tipo_referencia='RESERVA_CANCHA';
-- Los snapshots de comprobantes distinguen membresia y cancha sin alterar PDFs ya emitidos.
ALTER TABLE reembolso_pago ADD COLUMN porcentaje numeric(5,2) NOT NULL DEFAULT 100 CHECK (porcentaje > 0 AND porcentaje <= 100);
