-- Seed exclusivo de desarrollo: sede y usuarios de prueba para FitZone Sports.
-- Password en texto plano de cada uno (para probar /auth/login), ya hasheadas abajo con BCrypt:
--   socio@fitzone.com      -> socio123
--   cliente@fitzone.com    -> cliente123
--   recepcion@fitzone.com  -> recepcion123
--   gerente@fitzone.com    -> gerente123

INSERT INTO sede (nombre, direccion, capacidad_maxima)
SELECT 'Sede Central', 'Av. Principal 123', 200
WHERE NOT EXISTS (SELECT 1 FROM sede WHERE nombre = 'Sede Central');

INSERT INTO usuario (dni, email, rolid, sedeid, nombre, apellido, foto, contrasenia, activo) VALUES
    ('10000001', 'socio@fitzone.com', (SELECT id FROM rol WHERE nombre = 'USUARIO'), (SELECT id FROM sede WHERE nombre = 'Sede Central' ORDER BY id LIMIT 1), 'Socio', 'de Prueba', NULL, '$2a$10$75n8QtbAtOrpHErvqvhvQuzWH28xrixZFMlzL0Xh7SFucuWcrjUvu', TRUE),
    ('10000002', 'cliente@fitzone.com', (SELECT id FROM rol WHERE nombre = 'USUARIO'), (SELECT id FROM sede WHERE nombre = 'Sede Central' ORDER BY id LIMIT 1), 'Cliente Externo', 'de Prueba', NULL, '$2a$10$M5tR6bHYm8RE.0RXsZST7uyKo3lYPK5jQx9ofnk1G26UaqlOstpli', TRUE),
    ('10000003', 'recepcion@fitzone.com', (SELECT id FROM rol WHERE nombre = 'RECEPCIONISTA'), (SELECT id FROM sede WHERE nombre = 'Sede Central' ORDER BY id LIMIT 1), 'Recepcionista', 'de Prueba', NULL, '$2a$10$0VpjDq6zoF2SNrnc5Vr7QO4m4BbfZnVa.KQ8CVWXo9ry3QzX34DYG', TRUE),
    ('10000004', 'gerente@fitzone.com', (SELECT id FROM rol WHERE nombre = 'GERENTE'), (SELECT id FROM sede WHERE nombre = 'Sede Central' ORDER BY id LIMIT 1), 'Gerente', 'de Prueba', NULL, '$2a$10$hb0HDKgm0mO.JLIsmt5Z6u9ZFoBoz1aJfKslXPUKfDQb/7PEuEH0O', TRUE)
ON CONFLICT (email) DO NOTHING;

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
    (SELECT id FROM sede WHERE nombre='Sede Central' ORDER BY id LIMIT 1),'Pago Rechazado','de Prueba',
    '$2a$10$M5tR6bHYm8RE.0RXsZST7uyKo3lYPK5jQx9ofnk1G26UaqlOstpli',true
WHERE NOT EXISTS(SELECT 1 FROM usuario WHERE email='rechazo@fitzone.com' OR dni='99999999');
INSERT INTO sede(nombre,direccion,capacidad_maxima)
SELECT 'Sede Demo ' || lpad(n::text,2,'0'),'Direccion de prueba ' || n,100
FROM generate_series(2,25) n WHERE NOT EXISTS(SELECT 1 FROM sede WHERE nombre='Sede Demo ' || lpad(n::text,2,'0'));
INSERT INTO tipo_cancha(nombre,precio_hora) VALUES ('PADEL',12000.00),('FUTBOL5',20000.00)
ON CONFLICT ((lower(btrim(nombre)))) DO NOTHING;
INSERT INTO cancha(nombre,costo_base_hora,activa,sedeid,tipo_canchaid)
SELECT CASE WHEN t.nombre='PADEL' THEN 'Padel 1' ELSE 'Futbol 5 - 1' END,t.precio_hora,1,s.id,t.id
FROM sede s CROSS JOIN tipo_cancha t WHERE (s.nombre='Sede Central' OR s.nombre LIKE 'Sede Demo %') AND t.nombre IN ('PADEL','FUTBOL5')
AND NOT EXISTS(SELECT 1 FROM cancha c WHERE c.sedeid=s.id AND lower(btrim(c.nombre))=lower(CASE WHEN t.nombre='PADEL' THEN 'Padel 1' ELSE 'Futbol 5 - 1' END));
INSERT INTO turno_cancha(fecha,hora_inicio,hora_fin,canchaid)
SELECT CURRENT_DATE+d,time '00:00'+h*interval '1 hour',time '00:00'+(h+1)*interval '1 hour',c.id
FROM cancha c JOIN sede s ON s.id=c.sedeid CROSS JOIN generate_series(1,7) d CROSS JOIN generate_series(10,21) h
WHERE (s.nombre='Sede Central' OR s.nombre LIKE 'Sede Demo %')
AND NOT EXISTS(SELECT 1 FROM turno_cancha t WHERE t.canchaid=c.id AND t.fecha=CURRENT_DATE+d
    AND t.hora_inicio<time '00:00'+(h+1)*interval '1 hour' AND t.hora_fin>time '00:00'+h*interval '1 hour');
