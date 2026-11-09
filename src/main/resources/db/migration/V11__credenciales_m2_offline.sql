-- Consentimiento por sede: no replica el padrón completo a Recepción.
CREATE TABLE acceso_credencial_offline (
    id uuid PRIMARY KEY,
    usuario_id integer NOT NULL REFERENCES usuario(id),
    sede_id integer NOT NULL REFERENCES sede(id),
    desde timestamptz NOT NULL,
    hasta timestamptz NOT NULL,
    CHECK(hasta > desde AND hasta <= desde + interval '2 hours'),
    UNIQUE(usuario_id,sede_id,desde)
);
CREATE INDEX ix_credencial_offline_sede ON acceso_credencial_offline(sede_id,hasta);
