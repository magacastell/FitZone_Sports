-- Una foto por usuario; las cuentas históricas sin foto permanecen válidas.
CREATE TABLE usuario_foto (
    usuario_id integer PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
    contenido bytea NOT NULL CHECK (octet_length(contenido) BETWEEN 1 AND 2097152),
    tipo varchar(10) NOT NULL CHECK (tipo IN ('image/jpeg', 'image/png')),
    version varchar(36) NOT NULL
);
