ALTER TABLE registro_acceso ADD COLUMN offline_visita uuid UNIQUE;
ALTER TABLE registro_acceso ADD COLUMN offline_terminal uuid REFERENCES acceso_terminal(id);
CREATE TABLE acceso_evento_offline (
    id uuid PRIMARY KEY,
    terminal_id uuid NOT NULL REFERENCES acceso_terminal(id),
    visita_id varchar(64) NOT NULL,
    usuario_id integer NOT NULL,
    tipo varchar(10) NOT NULL,
    captura timestamptz NOT NULL,
    payload text NOT NULL,
    estado varchar(20) NOT NULL,
    detalle varchar(300) NOT NULL DEFAULT '',
    acceso_id integer REFERENCES registro_acceso(id),
    qr_jti varchar(100)
);
CREATE INDEX ix_evento_offline_pendiente ON acceso_evento_offline(terminal_id,estado);
CREATE INDEX ix_evento_offline_qr ON acceso_evento_offline(qr_jti);
CREATE TABLE acceso_intento_incompatible (
    evento_id uuid NOT NULL REFERENCES acceso_evento_offline(id),
    huella varchar(32) NOT NULL,
    payload text NOT NULL,
    recibido timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(evento_id,huella)
);
