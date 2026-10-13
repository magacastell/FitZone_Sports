-- Validar datos existentes antes de modificar el esquema.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM plan_membresia WHERE duracion_meses NOT IN (1, 3, 12)
               OR precio <= 0 OR btrim(nombre) = '') THEN
        RAISE EXCEPTION 'Hay planes invalidos: revisar nombre, duracion y precio antes de aplicar V3';
    END IF;
    IF EXISTS (SELECT lower(btrim(nombre)) FROM plan_membresia
               GROUP BY lower(btrim(nombre)) HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Hay nombres de planes duplicados sin distinguir mayusculas';
    END IF;
END $$;

UPDATE plan_membresia SET nombre = btrim(nombre);
ALTER TABLE plan_membresia
    ADD COLUMN activo boolean NOT NULL DEFAULT true,
    ALTER COLUMN precio TYPE numeric(21, 2),
    ADD CONSTRAINT ck_plan_duracion CHECK (duracion_meses IN (1, 3, 12)),
    ADD CONSTRAINT ck_plan_precio CHECK (precio > 0),
    ADD CONSTRAINT ck_plan_nombre CHECK (btrim(nombre) <> '' AND nombre = btrim(nombre));
CREATE UNIQUE INDEX uk_plan_nombre_ignore_case ON plan_membresia (lower(nombre));
