# Defensa de M1 y M2 online

Cierre del 09/11/2026. Guía para recorrer el código; resultados reproducibles en
[pruebas.md](pruebas.md). No describe offline, reservas ni un gateway de pagos real.

## 1. Del formulario a PostgreSQL

[PerfilUsuario](../frontend/src/modules/m1-usuarios/PerfilUsuario.jsx) usa los servicios
HTTP de M1; el servidor recibe el JWT y el DTO en
[UsuarioController](../src/main/java/com/fitzonesports/usuario/controller/UsuarioController.java).
`actualizarPerfil` delega en
[UsuarioService](../src/main/java/com/fitzonesports/usuario/service/UsuarioService.java):
sólo cambia nombre/apellido, conserva DNI/email y devuelve el estado confirmado.
El controller traduce HTTP; el service coordina el caso de uso; el repository obtiene
entidades persistentes. React no accede a tablas ni decide permisos.

En [AuthController.register](../src/main/java/com/fitzonesports/auth/controller/AuthController.java),
el alta recibe `datos` JSON y `foto` multipart. `UsuarioService.registrarCliente`
valida y persiste el usuario con su imagen en la misma transacción. La unicidad
DNI/email la garantiza PostgreSQL: una consulta previa sola tendría una carrera.
La traducción a 409 reconoce únicamente restricciones de identidad conocidas;
un error SQL desconocido no debe disfrazarse de identidad duplicada.

**Pregunta posible:** ¿por qué usar DTO en vez de recibir directamente Usuario?
Porque el contrato autoriza campos concretos; no permite asignar rol, identidad o
estado interno desde cualquier formulario.

## 2. Spring, objetos y persistencia

`@RestController`, `@Service` y los repositories permiten que Spring construya y
conecte objetos. En
[AccesoService](../src/main/java/com/fitzonesports/acceso/service/AccesoService.java),
`@RequiredArgsConstructor` genera el constructor de las dependencias `final`.
Spring las inyecta: el servicio no crea sus propios repositories con `new`.
Es composición; una interfaz como
[FotoPerfilRepository](../src/main/java/com/fitzonesports/usuario/repository/FotoPerfilRepository.java)
se implementa mediante Spring Data. Un test puede sustituir esa dependencia.

JPA describe el mapeo de entidades; Hibernate realiza el seguimiento y genera SQL.
`@Transactional` permite confirmar o revertir el caso de uso completo, incluso
cambios sobre entidades cargadas sin un `save` adicional. No reemplaza restricciones
SQL ni convierte varias peticiones HTTP en una única transacción. Flyway versiona
el esquema: V1–V10 se conservaron, sin editarlas para este cierre.

**Pregunta posible:** ¿por qué no alcanza con ocultar un botón de Recepción?
Porque una petición directa evita la UI. `@PreAuthorize` controla roles en el
controller y el service comprueba la sede operativa obtenida de la cuenta en BD.

## 3. Membresía, períodos e idempotencia

[RenovacionMembresia](../frontend/src/modules/m1-usuarios/RenovacionMembresia.jsx)
conserva `planId` y UUID al recuperar una respuesta incierta. En
[MembresiaService.renovar](../src/main/java/com/fitzonesports/membresia/service/MembresiaService.java),
`bloquearUsuario` usa `SELECT ... FOR UPDATE` y refresca la entidad después de esperar.
Se comprueban titular, repetición y plan antes de agregar un período.
Reenviar la misma intención devuelve el resultado; reutilizar la clave con otro
plan produce conflicto. Dos intenciones diferentes no se convierten en una sola.

`agregarPeriodo` toma el final pagado más lejano o el momento actual si ya venció.
Guarda nombre, duración y precio del plan como snapshot: cambiar al trimestral no
reescribe el mensual anterior ni cobra el tiempo sin cobertura. Pago simulado,
período y comprobante participan en el flujo existente.
`procesarAutomatica` usa el mismo bloqueo y sólo renueva al agotarse la cobertura,
si la preferencia sigue activa y la membresía no está suspendida.

**Pregunta posible:** si se pierde el 201, ¿por qué no generar otro UUID?
Porque se perdería la identidad de la operación y podría crearse otro pago/período.
La recuperación repite la intención original; no presupone éxito ni fracaso.

## 4. QR, RN-01 y egreso

[QrTokenService](../src/main/java/com/fitzonesports/acceso/service/QrTokenService.java)
emite tokens de 60 segundos con tipo QR y una clave derivada distinta de la de
login. El QR no sirve como Bearer de la API. `AccesoService.registrarIngreso`
verifica firma, vencimiento y último token persistido, cuenta y vigencia comercial.
La sede habitual del socio no restringe la sede visitada.

La consulta previa evita ingresos duplicados habituales; el índice parcial
`uk_registro_acceso_abierto` de
[V4](../src/main/resources/db/migration/V4__qr_y_accesos_abiertos.sql)
garantiza RN-01 ante dos transacciones concurrentes en distintas sedes.
El aforo cuenta accesos abiertos; su capacidad es informativa en este contrato.
`registrarSalida` admite QR vigente o número de ingreso. Por ID puede salir quien
ya está adentro aunque haya vencido su membresía; Recepción sigue limitada a su sede.
La UI expone ese contrato existente, sin agregar búsqueda ni listado de accesos.

**Pregunta posible:** ¿por qué una transacción por sí sola no impide doble presencia?
Dos transacciones pueden leer simultáneamente que no existe un ingreso. El índice
único es el árbitro final; el test concurrente exige una confirmación y un 409.

## 5. Una foto canónica, asociada al movimiento autorizado

[FotoPerfilService.validar](../src/main/java/com/fitzonesports/usuario/service/FotoPerfilService.java)
comprueba PNG/JPEG, bytes, dimensiones y contenido; reescribe píxeles y descarta
metadatos. `usuario_foto` contiene el archivo; `usuario.foto` es sólo una referencia
versionada. El PATCH administrativo acepta foto omitida/null y rechaza texto con
400 mediante `@Null`: no puede introducir una segunda fuente de imagen.

Tras autorizar el ingreso/egreso, `AccesoService.titularValidado` consulta los bytes
del titular del registro y devuelve una Data URI en `titular.foto`. No utiliza la
foto del operador ni descarga URLs antiguas. Sin archivo devuelve null.
[LectorAcceso](../frontend/src/modules/m2-acceso/LectorAcceso.jsx) sólo muestra PNG/JPEG
inline y limpia la imagen ante error, nuevo intento o cambio de modo.
El controller devuelve `Cache-Control: no-store`.

Se eligió reutilizar la respuesta autorizada en vez de abrir
`GET /accesos/{id}/foto-titular`: evita otra política temporal y una segunda consulta
HTTP, y muestra la foto también al salir. El costo aceptado es un JSON mayor:
hasta aproximadamente 2,8 MB de base64 para una imagen de 2 MB. No es un endpoint
público ni una autorización para consultar fotos por usuario arbitrario.

**Pregunta posible:** ¿por qué no usar `/usuarios/me/foto` en Recepción?
Porque `me` es el operador autenticado. La identidad del socio debe salir del
movimiento que el backend acaba de validar.

## 6. Qué demuestran las pruebas

[MembresiaIntegrationTest](../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java)
usa Spring y PostgreSQL real. Sus tests existentes cubren estados, períodos,
idempotencia, QR y aforo; el nuevo concurrente usa dos transacciones para RN-01.
El nuevo test de foto usa servidor en puerto aleatorio y `HttpClient`: atraviesa
HTTP real, filtros, permisos, serialización y BD con operador distinto del socio.
Los PATCH administrativos se verifican con MockMvc sobre Spring/PG, sin socket.

Los tests unitarios de foto usan imágenes reales y repositories dobles. Las suites
frontend verifican transporte y lógica mediante VM/mocks, sin React DOM/navegador.
El build comprueba compilación; JaCoCo mide líneas/ramas backend, no cumplimiento de
RF. En este cierre no se repitió la revisión visual ni el ensayo de respuesta
monetaria perdida del trabajo anterior: permanecen como evidencia histórica.
