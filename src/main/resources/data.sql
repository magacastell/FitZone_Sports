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
    ('10000001', 'socio@fitzone.com', (SELECT id FROM rol WHERE nombre = 'SOCIO_ACTIVO'), (SELECT id FROM sede WHERE nombre = 'Sede Central' ORDER BY id LIMIT 1), 'Socio', 'de Prueba', NULL, '$2a$10$75n8QtbAtOrpHErvqvhvQuzWH28xrixZFMlzL0Xh7SFucuWcrjUvu', TRUE),
    ('10000002', 'cliente@fitzone.com', (SELECT id FROM rol WHERE nombre = 'CLIENTE_EXTERNO'), (SELECT id FROM sede WHERE nombre = 'Sede Central' ORDER BY id LIMIT 1), 'Cliente Externo', 'de Prueba', NULL, '$2a$10$M5tR6bHYm8RE.0RXsZST7uyKo3lYPK5jQx9ofnk1G26UaqlOstpli', TRUE),
    ('10000003', 'recepcion@fitzone.com', (SELECT id FROM rol WHERE nombre = 'RECEPCIONISTA'), (SELECT id FROM sede WHERE nombre = 'Sede Central' ORDER BY id LIMIT 1), 'Recepcionista', 'de Prueba', NULL, '$2a$10$0VpjDq6zoF2SNrnc5Vr7QO4m4BbfZnVa.KQ8CVWXo9ry3QzX34DYG', TRUE),
    ('10000004', 'gerente@fitzone.com', (SELECT id FROM rol WHERE nombre = 'GERENTE'), (SELECT id FROM sede WHERE nombre = 'Sede Central' ORDER BY id LIMIT 1), 'Gerente', 'de Prueba', NULL, '$2a$10$hb0HDKgm0mO.JLIsmt5Z6u9ZFoBoz1aJfKslXPUKfDQb/7PEuEH0O', TRUE)
ON CONFLICT (email) DO NOTHING;
