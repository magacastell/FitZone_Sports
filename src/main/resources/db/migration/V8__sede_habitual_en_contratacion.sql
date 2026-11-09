-- USUARIO puede registrarse sin sede; se conservan todas las asignaciones anteriores.
-- membresia.sedeid sigue siendo el origen historico obligatorio del alta.
ALTER TABLE usuario ALTER COLUMN sedeid DROP NOT NULL;

CREATE FUNCTION validar_sede_de_personal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.sedeid IS NULL AND NOT EXISTS (SELECT 1 FROM rol WHERE id=NEW.rolid AND nombre='USUARIO') THEN
        RAISE EXCEPTION 'El personal requiere una sede asignada' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER ck_usuario_sede_personal BEFORE INSERT OR UPDATE OF rolid,sedeid ON usuario
FOR EACH ROW EXECUTE FUNCTION validar_sede_de_personal();

-- Renombrar una autoridad tampoco puede eludir la invariancia anterior.
CREATE FUNCTION validar_rol_con_usuarios_sin_sede() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.nombre <> 'USUARIO' AND EXISTS (SELECT 1 FROM usuario WHERE rolid=OLD.id AND sedeid IS NULL) THEN
        RAISE EXCEPTION 'La autoridad tiene usuarios sin sede' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER ck_rol_sede_personal BEFORE UPDATE OF nombre ON rol
FOR EACH ROW EXECUTE FUNCTION validar_rol_con_usuarios_sin_sede();
