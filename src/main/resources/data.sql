-- Seed de roles y usuarios de prueba para FitZone Sports.
-- Password en texto plano de cada uno (para probar /auth/login), ya hasheadas abajo con BCrypt:
--   socio@fitzone.com      -> socio123
--   cliente@fitzone.com    -> cliente123
--   recepcion@fitzone.com  -> recepcion123
--   gerente@fitzone.com    -> gerente123

INSERT INTO roles (nombre) VALUES
    ('SOCIO_ACTIVO'),
    ('CLIENTE_EXTERNO'),
    ('RECEPCIONISTA'),
    ('GERENTE')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (nombre, email, password, rol_id) VALUES
    ('Socio de Prueba', 'socio@fitzone.com', '$2a$10$75n8QtbAtOrpHErvqvhvQuzWH28xrixZFMlzL0Xh7SFucuWcrjUvu', (SELECT id FROM roles WHERE nombre = 'SOCIO_ACTIVO')),
    ('Cliente Externo de Prueba', 'cliente@fitzone.com', '$2a$10$M5tR6bHYm8RE.0RXsZST7uyKo3lYPK5jQx9ofnk1G26UaqlOstpli', (SELECT id FROM roles WHERE nombre = 'CLIENTE_EXTERNO')),
    ('Recepcionista de Prueba', 'recepcion@fitzone.com', '$2a$10$0VpjDq6zoF2SNrnc5Vr7QO4m4BbfZnVa.KQ8CVWXo9ry3QzX34DYG', (SELECT id FROM roles WHERE nombre = 'RECEPCIONISTA')),
    ('Gerente de Prueba', 'gerente@fitzone.com', '$2a$10$hb0HDKgm0mO.JLIsmt5Z6u9ZFoBoz1aJfKslXPUKfDQb/7PEuEH0O', (SELECT id FROM roles WHERE nombre = 'GERENTE'))
ON CONFLICT (email) DO NOTHING;
