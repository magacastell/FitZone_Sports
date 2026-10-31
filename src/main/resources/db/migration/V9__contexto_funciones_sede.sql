-- Las funciones resuelven rol/usuario en el mismo esquema en que Flyway las crea.
-- Correccion hacia adelante: V8 ya fue aplicada por DevTools en desarrollo.
ALTER FUNCTION validar_sede_de_personal() SET search_path FROM CURRENT;
ALTER FUNCTION validar_rol_con_usuarios_sin_sede() SET search_path FROM CURRENT;
