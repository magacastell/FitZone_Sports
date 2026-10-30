-- Identidad comercial estable. No cambia usuarios, sedes, períodos ni pagos.
INSERT INTO rol(nombre) VALUES ('USUARIO') ON CONFLICT (nombre) DO NOTHING;
UPDATE usuario SET rolid = (SELECT id FROM rol WHERE nombre='USUARIO')
WHERE rolid IN (SELECT id FROM rol WHERE nombre IN ('CLIENTE_EXTERNO','SOCIO_ACTIVO'));
DELETE FROM rol WHERE nombre IN ('CLIENTE_EXTERNO','SOCIO_ACTIVO');
