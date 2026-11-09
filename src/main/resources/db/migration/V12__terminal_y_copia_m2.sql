CREATE TABLE acceso_terminal (
    id uuid PRIMARY KEY,
    sede_id integer NOT NULL UNIQUE REFERENCES sede(id),
    operador_id integer NOT NULL REFERENCES usuario(id),
    habilitado boolean NOT NULL DEFAULT true
);
CREATE TABLE acceso_copia_offline (
    id uuid PRIMARY KEY,
    terminal_id uuid NOT NULL REFERENCES acceso_terminal(id),
    evidencia text NOT NULL,
    hasta timestamptz NOT NULL
);
