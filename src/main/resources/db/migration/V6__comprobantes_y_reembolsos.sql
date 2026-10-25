-- No se eliminan comprobantes existentes para imponer unicidad.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM comprobante GROUP BY pagoid HAVING count(*) > 1)
       OR EXISTS (SELECT 1 FROM comprobante GROUP BY numero_comprobante HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'V6: revisar comprobantes duplicados por pago o numero antes de migrar';
    END IF;
END $$;
ALTER TABLE comprobante ADD CONSTRAINT uk_comprobante_pago UNIQUE (pagoid);
ALTER TABLE comprobante ADD CONSTRAINT uk_comprobante_numero UNIQUE (numero_comprobante);
-- Se almacena el documento original, sin depender de archivos locales del servidor.
ALTER TABLE comprobante ADD COLUMN contenido_pdf bytea;
ALTER TABLE detalle_facturacion ALTER COLUMN subtotal TYPE numeric(21,2);
ALTER TABLE detalle_facturacion ALTER COLUMN concepto TYPE varchar(512);
CREATE TABLE reembolso_pago (
    id serial PRIMARY KEY,
    pago_id integer NOT NULL UNIQUE REFERENCES pago(id),
    monto numeric(21,2) NOT NULL CHECK (monto > 0),
    fecha timestamp NOT NULL,
    referencia_externa varchar(255) NOT NULL UNIQUE,
    proveedor varchar(50) NOT NULL
);
