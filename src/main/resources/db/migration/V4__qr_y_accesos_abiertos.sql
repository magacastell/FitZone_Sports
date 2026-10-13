-- Un unico QR vigente por usuario: cada renovacion reemplaza la fila anterior (upsert).
ALTER TABLE codigo_qr ADD CONSTRAINT uk_codigo_qr_usuario UNIQUE (usuarioid);

-- RN-01: una persona no puede tener dos ingresos abiertos al mismo tiempo, en ninguna sede.
-- La app lo valida antes de insertar; el indice es el arbitro final ante pedidos simultaneos.
CREATE UNIQUE INDEX uk_registro_acceso_abierto ON registro_acceso (usuarioid) WHERE fecha_hora_salida IS NULL;
