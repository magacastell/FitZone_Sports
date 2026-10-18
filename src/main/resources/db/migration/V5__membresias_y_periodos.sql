-- Se conserva membresia como cuenta y se separan sus periodos historicos pagados.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM membresia GROUP BY usuarioid HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'V5: existen varias membresias por usuario; consolidarlas preservando su historial antes de migrar';
    END IF;
END $$;
ALTER TABLE membresia ADD COLUMN suspendida boolean NOT NULL DEFAULT false;
UPDATE membresia SET suspendida = upper(estado) = 'SUSPENDIDA';
ALTER TABLE membresia ADD COLUMN token_renovacion varchar(255);
ALTER TABLE membresia ADD CONSTRAINT uk_membresia_usuario UNIQUE(usuarioid);
ALTER TABLE membresia ADD CONSTRAINT ck_membresia_fechas CHECK(fecha_fin > fecha_inicio);
ALTER TABLE pago ALTER COLUMN monto TYPE numeric(21,2);
ALTER TABLE pago ADD COLUMN clave_idempotencia varchar(255);
ALTER TABLE pago ADD COLUMN referencia_externa varchar(255);
ALTER TABLE pago ADD COLUMN proveedor varchar(50);
CREATE UNIQUE INDEX uk_pago_idempotencia ON pago(clave_idempotencia) WHERE clave_idempotencia IS NOT NULL;
CREATE TABLE periodo_membresia (
    id serial PRIMARY KEY,
    membresia_id integer NOT NULL REFERENCES membresia(id),
    plan_id integer NOT NULL REFERENCES plan_membresia(id),
    nombre_plan varchar(255) NOT NULL,
    duracion_meses integer NOT NULL CHECK(duracion_meses IN (1,3,12)),
    precio numeric(21,2) NOT NULL CHECK(precio > 0),
    inicio timestamp NOT NULL,
    fin timestamp NOT NULL,
    pago_id integer UNIQUE REFERENCES pago(id),
    clave_operacion varchar(255) UNIQUE,
    cancelado boolean NOT NULL DEFAULT false,
    CHECK(fin > inicio)
);
CREATE INDEX ix_periodo_membresia_fechas ON periodo_membresia(membresia_id, inicio, fin);
-- El bloqueo de la cuenta serializa periodos incluso si otro escritor omite el servicio.
CREATE FUNCTION validar_periodo_membresia() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM id FROM membresia WHERE id=NEW.membresia_id FOR UPDATE;
    IF NOT NEW.cancelado AND EXISTS (SELECT 1 FROM periodo_membresia p WHERE p.membresia_id=NEW.membresia_id
            AND NOT p.cancelado AND p.id<>NEW.id AND p.inicio<NEW.fin AND p.fin>NEW.inicio) THEN
        RAISE EXCEPTION 'Periodos de membresia superpuestos' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER ck_periodos_sin_solapamiento BEFORE INSERT OR UPDATE ON periodo_membresia
FOR EACH ROW EXECUTE FUNCTION validar_periodo_membresia();
-- Los registros anteriores conservan vigencia y condiciones disponibles, sin inventar pagos.
INSERT INTO periodo_membresia(membresia_id,plan_id,nombre_plan,duracion_meses,precio,inicio,fin)
SELECT m.id,p.id,p.nombre,p.duracion_meses,p.precio,m.fecha_inicio,m.fecha_fin
FROM membresia m JOIN plan_membresia p ON p.id=m.plan_membresiaid;
CREATE TABLE auditoria_membresia (
    id serial PRIMARY KEY,
    membresia_id integer NOT NULL REFERENCES membresia(id),
    operador_id integer NOT NULL REFERENCES usuario(id),
    accion varchar(20) NOT NULL,
    motivo varchar(500) NOT NULL,
    fecha timestamp NOT NULL
);
