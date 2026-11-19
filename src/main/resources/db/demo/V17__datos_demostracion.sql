-- Carga versionada exclusiva de dev. No incluir db/demo en staging ni produccion.
-- Flyway ejecuta V17 una sola vez; no actualiza ni elimina registros existentes.
DO $guard$
BEGIN
    IF NOT ('dev' = ANY(regexp_split_to_array(btrim('${demoProfiles}'), '[[:space:]]*,[[:space:]]*')))
       OR regexp_split_to_array(btrim('${demoProfiles}'), '[[:space:]]*,[[:space:]]*') && ARRAY['prod', 'staging'] THEN
        RAISE EXCEPTION 'V17 demo requiere dev y no admite prod ni staging';
    END IF;
END $guard$;
-- Password en texto plano de cada uno (para probar /auth/login), ya hasheadas abajo con BCrypt:
--   socio@fitzone.com      -> socio123
--   cliente@fitzone.com    -> cliente123
--   recepcion@fitzone.com  -> recepcion123
--   gerente@fitzone.com    -> gerente123

INSERT INTO sede (nombre, direccion, capacidad_maxima)
SELECT 'Sede Central', 'Av. Principal 123', 200
WHERE NOT EXISTS (SELECT 1 FROM sede);

INSERT INTO usuario (dni, email, rolid, sedeid, nombre, apellido, foto, contrasenia, activo) VALUES
    ('10000001', 'socio@fitzone.com', (SELECT id FROM rol WHERE nombre = 'USUARIO'), (SELECT id FROM sede ORDER BY (nombre = 'Sede Central') DESC, id LIMIT 1), 'Socio', 'de Prueba', NULL, '$2a$10$75n8QtbAtOrpHErvqvhvQuzWH28xrixZFMlzL0Xh7SFucuWcrjUvu', TRUE),
    ('10000002', 'cliente@fitzone.com', (SELECT id FROM rol WHERE nombre = 'USUARIO'), (SELECT id FROM sede ORDER BY (nombre = 'Sede Central') DESC, id LIMIT 1), 'Cliente Externo', 'de Prueba', NULL, '$2a$10$M5tR6bHYm8RE.0RXsZST7uyKo3lYPK5jQx9ofnk1G26UaqlOstpli', TRUE),
    ('10000003', 'recepcion@fitzone.com', (SELECT id FROM rol WHERE nombre = 'RECEPCIONISTA'), (SELECT id FROM sede ORDER BY (nombre = 'Sede Central') DESC, id LIMIT 1), 'Recepcionista', 'de Prueba', NULL, '$2a$10$0VpjDq6zoF2SNrnc5Vr7QO4m4BbfZnVa.KQ8CVWXo9ry3QzX34DYG', TRUE),
    ('10000004', 'gerente@fitzone.com', (SELECT id FROM rol WHERE nombre = 'GERENTE'), (SELECT id FROM sede ORDER BY (nombre = 'Sede Central') DESC, id LIMIT 1), 'Gerente', 'de Prueba', NULL, '$2a$10$hb0HDKgm0mO.JLIsmt5Z6u9ZFoBoz1aJfKslXPUKfDQb/7PEuEH0O', TRUE)
ON CONFLICT DO NOTHING;

-- Cuenta adicional para demostrar mora sin modificar la vigencia del socio activo.
INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia,activo)
SELECT '10000005','vencido@fitzone.com',(SELECT id FROM rol WHERE nombre='USUARIO'),
    (SELECT id FROM sede ORDER BY (nombre = 'Sede Central') DESC, id LIMIT 1),'Socio Vencido','de Prueba',
    '$2a$10$75n8QtbAtOrpHErvqvhvQuzWH28xrixZFMlzL0Xh7SFucuWcrjUvu',true
ON CONFLICT DO NOTHING;

-- M3 (dev): tipos de clase e instructores de ejemplo para poder crear clases desde la aplicacion.
INSERT INTO tipo_clase (nombre) VALUES ('Spinning'), ('Yoga'), ('Funcional'), ('Pilates')
ON CONFLICT ((lower(btrim(nombre)))) DO NOTHING;

INSERT INTO instructor (nombre, apellido)
SELECT v.nombre, v.apellido FROM (VALUES ('Lucía', 'Fernández'), ('Martín', 'Gómez')) AS v(nombre, apellido)
WHERE NOT EXISTS (SELECT 1 FROM instructor i WHERE i.nombre = v.nombre AND i.apellido = v.apellido);

-- M4/M5: datos ficticios reproducibles, exclusivamente dev.
-- rechazo@fitzone.com usa cliente123; todos sus cobros se rechazan por DNI 99999999.
INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia,activo)
SELECT '99999999','rechazo@fitzone.com',(SELECT id FROM rol WHERE nombre='USUARIO'),
    (SELECT id FROM sede ORDER BY (nombre = 'Sede Central') DESC, id LIMIT 1),'Pago Rechazado','de Prueba',
    '$2a$10$M5tR6bHYm8RE.0RXsZST7uyKo3lYPK5jQx9ofnk1G26UaqlOstpli',true
ON CONFLICT DO NOTHING;
INSERT INTO sede(nombre,direccion,capacidad_maxima)
SELECT 'Sede Demo ' || lpad(n::text,2,'0'),'Direccion de prueba ' || n,100
FROM generate_series(2,25+(SELECT count(*)::int FROM sede)) n
WHERE NOT EXISTS(SELECT 1 FROM sede WHERE nombre='Sede Demo ' || lpad(n::text,2,'0'))
ORDER BY n LIMIT greatest(25-(SELECT count(*) FROM sede),0);
INSERT INTO tipo_cancha(nombre,precio_hora) VALUES ('PADEL',12000.00),('FUTBOL5',20000.00)
ON CONFLICT ((lower(btrim(nombre)))) DO NOTHING;
INSERT INTO cancha(nombre,costo_base_hora,activa,sedeid,tipo_canchaid)
SELECT CASE WHEN lower(btrim(t.nombre))='padel' THEN 'Padel 1' ELSE 'Futbol 5 - 1' END,t.precio_hora,1,s.id,t.id
FROM sede s CROSS JOIN tipo_cancha t WHERE NOT EXISTS(SELECT 1 FROM cancha existente WHERE existente.sedeid=s.id)
AND lower(btrim(t.nombre)) IN ('padel','futbol5') AND t.precio_hora > 0
AND NOT EXISTS(SELECT 1 FROM cancha c WHERE c.sedeid=s.id AND lower(btrim(c.nombre))=lower(CASE WHEN lower(btrim(t.nombre))='padel' THEN 'Padel 1' ELSE 'Futbol 5 - 1' END));

-- Dos alternativas por cancha (normal y pico), no miles de turnos.
-- Fechas relativas a la primera aplicacion, en la misma zona que el dominio.
INSERT INTO turno_cancha(fecha,hora_inicio,hora_fin,canchaid)
SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+4,
    time '00:00'+h*interval '1 hour',time '00:00'+(h+1)*interval '1 hour',c.id
FROM cancha c JOIN sede s ON s.id=c.sedeid CROSS JOIN (VALUES (17),(19)) horas(h)
WHERE c.activa=1
AND NOT EXISTS(SELECT 1 FROM turno_cancha t WHERE t.canchaid=c.id
    AND t.fecha=(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+4
    AND t.hora_inicio<time '00:00'+(h+1)*interval '1 hour' AND t.hora_fin>time '00:00'+h*interval '1 hour');

DO $demo$
DECLARE
    ahora timestamp := CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires';
    fila record;
    plan_id integer;
    nombre_plan text;
    sufijo integer;
    usuario_id integer;
    membresia_id integer;
    pago_id integer;
    inicio timestamp;
    fin timestamp;
    instructor_id integer;
    tipo_id integer;
    ordinal integer := 0;
BEGIN
    -- Reutilizar un plan activo de cada duracion; no reactivar ni cambiar precios ajenos.
    FOR fila IN SELECT * FROM (VALUES (1,'Demo Mensual',15000.00),
            (3,'Demo Trimestral',40000.00),(12,'Demo Anual',150000.00)) v(meses,nombre,precio)
    LOOP
        IF NOT EXISTS(SELECT 1 FROM plan_membresia WHERE activo AND duracion_meses=fila.meses) THEN
            nombre_plan := fila.nombre;
            sufijo := 1;
            WHILE EXISTS(SELECT 1 FROM plan_membresia WHERE lower(nombre)=lower(nombre_plan)) LOOP
                sufijo := sufijo+1;
                nombre_plan := fila.nombre || ' ' || sufijo;
            END LOOP;
            INSERT INTO plan_membresia(nombre,duracion_meses,precio,activo)
            VALUES(nombre_plan,fila.meses,fila.precio,true);
        END IF;
    END LOOP;

    -- Solo completar cuentas ficticias identificadas por email Y DNI, activas y sin membresia.
    -- No se renueva ni se altera una membresia preexistente aunque ya este vencida.
    FOR fila IN SELECT * FROM (VALUES ('socio@fitzone.com','10000001',12,true),
            ('vencido@fitzone.com','10000005',1,false)) v(email,dni,meses,vigente)
    LOOP
        SELECT u.id INTO usuario_id FROM usuario u JOIN rol r ON r.id=u.rolid
        WHERE u.email=fila.email AND u.dni=fila.dni AND u.activo AND r.nombre='USUARIO';
        IF usuario_id IS NULL OR EXISTS(SELECT 1 FROM membresia WHERE usuarioid=usuario_id) THEN
            CONTINUE;
        END IF;
        SELECT id INTO plan_id FROM plan_membresia WHERE activo AND duracion_meses=fila.meses ORDER BY id LIMIT 1;
        inicio := CASE WHEN fila.vigente THEN ahora-interval '1 day' ELSE ahora-interval '2 months' END;
        fin := inicio+make_interval(months => fila.meses);
        INSERT INTO membresia(fecha_inicio,fecha_fin,estado,renovacion_automatica,usuarioid,plan_membresiaid,sedeid)
        SELECT inicio,fin,CASE WHEN fila.vigente THEN 'ACTIVA' ELSE 'VENCIDA' END,0,usuario_id,plan_id,u.sedeid
        FROM usuario u WHERE u.id=usuario_id RETURNING id INTO membresia_id;
        INSERT INTO pago(monto,tipo_referencia,referencia_id,fecha_pago,usuarioid,estado,
                clave_idempotencia,referencia_externa,proveedor)
        SELECT p.precio,'MEMBRESIA',membresia_id,inicio,usuario_id,'APROBADO',
            'demo-v17:' || fila.email,'demo-v17-fake:' || fila.email,'FAKE'
        FROM plan_membresia p WHERE p.id=plan_id RETURNING id INTO pago_id;
        INSERT INTO periodo_membresia(membresia_id,plan_id,nombre_plan,duracion_meses,precio,inicio,fin,pago_id,clave_operacion)
        SELECT membresia_id,p.id,p.nombre,p.duracion_meses,p.precio,inicio,fin,pago_id,'demo-v17:' || fila.email
        FROM plan_membresia p WHERE p.id=plan_id;
    END LOOP;

    -- Una clase por sede. Se reutiliza el catalogo; no se solapan instructores entre sedes.
    SELECT id INTO instructor_id FROM instructor ORDER BY id LIMIT 1;
    SELECT id INTO tipo_id FROM tipo_clase ORDER BY id LIMIT 1;
    FOR fila IN SELECT id FROM sede ORDER BY id
    LOOP
        ordinal := ordinal+1;
        IF EXISTS(SELECT 1 FROM clase_grupal WHERE sedeid=fila.id AND estado='PROGRAMADA'
                AND horario>ahora+interval '48 hours') THEN CONTINUE; END IF;
        inicio := ahora::date+4+(ordinal-1)/8+time '10:00'+((ordinal-1)%8)*interval '1 hour';
        WHILE EXISTS(SELECT 1 FROM clase_grupal c WHERE c.instructorid=instructor_id AND c.estado<>'CANCELADA'
                AND c.horario<inicio+interval '1 hour' AND c.fin>inicio) LOOP
            inicio := inicio+interval '1 day';
        END LOOP;
        INSERT INTO clase_grupal(horario,fin,tipo_claseid,instructorid,capacidad_maxima,sedeid,estado)
        VALUES(inicio,inicio+interval '1 hour',tipo_id,instructor_id,12,fila.id,'PROGRAMADA');
    END LOOP;
END $demo$;

-- No se precargan reservas ni accesos: quedan cupos y turnos libres para demostrar los flujos.
-- Los dos pagos historicos ficticios respaldan los periodos y sus PDF se emiten al descargarlos.
