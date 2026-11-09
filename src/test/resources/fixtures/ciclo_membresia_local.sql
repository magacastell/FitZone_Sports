-- EXCLUSIVAMENTE desarrollo local: escenarios temporales, sin cobros externos.
-- Crear una sola vez, con respaldo previo. Aborta si existe cualquier cuenta del lote.
-- Contraseña de estas cuentas ficticias: cliente123 (hash del seed dev existente).
-- No cambia usuarios, planes, sedes, períodos ni pagos preexistentes.
BEGIN;
DO $$
DECLARE
    caso text;
    correo text;
    titular integer;
    cuenta integer;
    pago integer;
    sede integer;
    plan record;
    ahora timestamp := clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires';
    inicio timestamp;
    fin timestamp;
    inicio_siguiente timestamp;
BEGIN
    IF current_database() <> 'fitzone' THEN
        RAISE EXCEPTION 'Fixture destinado únicamente a fitzone local';
    END IF;
    IF EXISTS (SELECT 1 FROM usuario WHERE email LIKE 'ciclo.%.20261030@fitzone.test') THEN
        RAISE EXCEPTION 'El lote ya existe: no se modifica ni se reinicia automáticamente';
    END IF;
    SELECT id INTO STRICT sede FROM sede ORDER BY id LIMIT 1;
    SELECT * INTO STRICT plan FROM plan_membresia WHERE activo AND duracion_meses=1 ORDER BY id LIMIT 1;
    FOREACH caso IN ARRAY ARRAY['cliente','alta','activo','proximo','cubierto','vencido','renovar','suspendido'] LOOP
        correo := 'ciclo.' || caso || '.20261030@fitzone.test';
        INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia,activo)
        VALUES ('FIX-CICLO-20261030-' || caso,correo,(SELECT id FROM rol WHERE nombre='USUARIO'),
            CASE WHEN caso IN ('cliente','alta') THEN NULL ELSE sede END,'Fixture',caso,
            '$2a$10$M5tR6bHYm8RE.0RXsZST7uyKo3lYPK5jQx9ofnk1G26UaqlOstpli',true)
        RETURNING id INTO titular;
        IF caso IN ('cliente','alta') THEN CONTINUE; END IF;
        fin := CASE WHEN caso IN ('vencido','renovar') THEN ahora-interval '10 days'
            WHEN caso IN ('proximo','cubierto') THEN ahora+interval '5 days'
            ELSE ahora+interval '20 days' END;
        inicio := fin-interval '1 month';
        INSERT INTO membresia(usuarioid,sedeid,plan_membresiaid,fecha_inicio,fecha_fin,estado,suspendida,renovacion_automatica)
        VALUES (titular,sede,plan.id,inicio,fin,
            CASE WHEN caso='suspendido' THEN 'SUSPENDIDA' WHEN fin<=ahora THEN 'VENCIDA' ELSE 'ACTIVA' END,
            caso='suspendido',0) RETURNING id INTO cuenta;
        INSERT INTO pago(monto,tipo_referencia,referencia_id,fecha_pago,usuarioid,estado,clave_idempotencia,referencia_externa,proveedor)
        VALUES (plan.precio,'MEMBRESIA',cuenta,inicio,titular,'APROBADO','fixture-ciclo:' || correo,'fixture-ciclo:' || correo,'FAKE_FIXTURE')
        RETURNING id INTO pago;
        INSERT INTO periodo_membresia(membresia_id,plan_id,nombre_plan,duracion_meses,precio,inicio,fin,pago_id,clave_operacion)
        VALUES (cuenta,plan.id,plan.nombre,plan.duracion_meses,plan.precio,inicio,fin,pago,'fixture-ciclo:' || correo);
        IF caso='cubierto' THEN
            inicio_siguiente := fin;
            fin := inicio_siguiente+interval '1 month';
            INSERT INTO pago(monto,tipo_referencia,referencia_id,fecha_pago,usuarioid,estado,clave_idempotencia,referencia_externa,proveedor)
            VALUES (plan.precio,'MEMBRESIA',cuenta,ahora,titular,'APROBADO','fixture-ciclo-futuro:' || correo,'fixture-ciclo-futuro:' || correo,'FAKE_FIXTURE')
            RETURNING id INTO pago;
            INSERT INTO periodo_membresia(membresia_id,plan_id,nombre_plan,duracion_meses,precio,inicio,fin,pago_id,clave_operacion)
            VALUES (cuenta,plan.id,plan.nombre,plan.duracion_meses,plan.precio,inicio_siguiente,fin,pago,'fixture-ciclo-futuro:' || correo);
            UPDATE membresia SET fecha_fin=fin WHERE id=cuenta;
        END IF;
    END LOOP;
END $$;
COMMIT;
