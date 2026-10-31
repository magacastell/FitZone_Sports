# Sede habitual en la primera contratación

30/10/2026. Rama feat/sede-habitual-contratacion, base limpia b68e998ce5e15253ccfb7f0b7f0c68070c8e5730.
Implementado; revisión funcional y visual aprobada para cierre. Las referencias a
cambios pendientes y sin commit de este informe describen el corte de implementación
previo al cierre; ver ciclo-vida-membresia-verificacion.md.

## Decisión y contrato

- Usuario.sedeId: habitual para USUARIO; puede ser null antes de contratar. Para
  RECEPCIONISTA sigue siendo sede operativa obligatoria. GERENTE conserva su sede
  obligatoria anterior, aunque su operación M2 global usa selección explícita.
- Membresia.sedeId: origen histórico del alta, obligatorio; no sigue futuros cambios
  de habitual ni limita acceso/beneficios. Ningún endpoint de traslado en este bloque.
- Registro sólo recibe nombre, apellido, DNI, email y password; asigna USUARIO sin
  sede. El viejo campo JSON sedeId, si lo envía un consumidor anterior, no se aplica.
  No crea membresía ni abre GET /sedes al público.
- UsuarioResponse conserva sedeId y sedeNombre presentes, ambos null cuando no hay
  asignación. Perfil comercial muestra «Sede habitual: Sin asignar».
- POST /membresias: {planId,sedeId}, JWT e Idempotency-Key UUID en header, no en body.
  Sin habitual exige sede (400 si falta); inexistente 404. Con habitual, omitir o
  enviar la misma la conserva; enviar otra devuelve 409. No es cambio encubierto.
  Una sola cuenta por usuario: alta posterior 409; nuevos períodos por renovación.
- Replay de alta: misma clave + plan/sede devuelve la cuenta actual sin nuevo cobro;
  otro plan o sede explícitos 409. La sede original se obtiene de la membresía,
  inmutable en este flujo, sin otra tabla/columna de intenciones. Omitida en replay
  conserva ese origen. Renovación no recibe sede ni cambia su lógica.

## Transacción, seguridad y recuperación

Se reutilizan bloqueo SQL por titular, períodos, cobro fake y emisión PDF de M1/M5.
Validación de sede y plan precede al pago. El alta prepara la membresía, cobra y
emite con la estrategia existente; después asigna habitual dentro de la misma
transacción. Nada se confirma antes del commit. Rechazo de pago revierte sede,
membresía/período/pago, manteniendo null si no había asignación. No hay PATCH previo
al pago ni una nueva integración de pasarela. El límite de una pasarela remota sigue
pendiente: rollback SQL no revierte por sí mismo cobros externos.

V8 permite null sólo comercial y conserva FK. Triggers rechazan personal sin sede,
también al cambiar autoridad o renombrar el rol comercial. UsuarioResponse y los
controles sobre titulares sin sede evitan NPE. Recepción no lista como propios los
clientes sin asignación y recibe 403 si intenta consultar/modificar uno ajeno.
M2 conserva sede del operador para ingreso/aforo y vigencia del titular para acceso;
no compara habitual/origen con sede visitada.

UI: catálogo real, sede con nombre/dirección disponibles y resumen plan/importe/sede.
Sin elección no hay confirmación ni fallback a la primera. Habitual previa se muestra
conservada. GET /sedes no posee activo/inactivo: se usan sus filas reales, sin filtros
inventados. sedesService centraliza la lectura y M2 conserva su export anterior.

Antes de POST se guarda por email en sessionStorage versión, planId, sedeId y UUID.
Ref bloquea doble envío; plan y sede quedan congelados. Red/5xx/F5 permiten la misma
operación incluso con catálogo inaccesible, sin POST automático ni otra clave.
GET de membresía confirmada reconcilia y limpia intento sin afirmar autoría del alta.
Se conservan recuperación 409 y tratamiento 400/403/404/402 del flujo anterior.
Nueva intención sólo por acción explícita; catálogo desactualizado exige refrescar
planes y sedes antes de descartar. Storage inválido bloquea y no se borra en silencio;
si no se puede escribir no se envía pago. Guard de sesión y cleanup evitan respuestas
tardías en otra cuenta. Renovación conserva su almacenamiento y payload anteriores.
Tras éxito se publica el DTO compartido y se recarga perfil sin relogin.

## Migraciones y entorno local

V1–V7 intactas. V8__sede_habitual_en_contratacion.sql no actualiza ninguna fila ni
modifica membresia.sedeid; sólo nullable de usuario y guards de personal.
V9__contexto_funciones_sede.sql fija search_path de esas funciones al esquema de
Flyway, también para pruebas de upgrade con esquemas aislados.

Incidente del entorno: DevTools del backend previamente abierto aplicó la primera
V8 durante la edición. Agregar después SET search_path a ese archivo generó un
checksum distinto y detuvo su reinicio. Se detuvo el proceso, se restauró exactamente
la V8 aplicada y la corrección se llevó hacia adelante a V9. No hubo repair, cambio
manual de historial, downgrade ni reescritura de V1–V7. Integración se recreó sólo
en el recurso descartable y repitió V1→V9, V4→V9 y V7→V9.

La BD normal fitzone quedó en V9, con el mismo fitzone-postgres y volumen
fitzone_sports_fitzone_pgdata. Sus siete usuarios anteriores conservan sede 1;
ninguna asignación se borró o reinterpretó. No se puede saber cuáles se eligieron
frente a las que provenían del default antiguo. Respaldo local ignorado por Git:
target/sede-respaldo-antes-v9.sql. Backend manual corre desde el JAR empaquetado,
sin hot reload de DevTools, con -Duser.timezone=America/Argentina/Buenos_Aires.

## Verificación

- Base: frontend build y backend package correctos antes de crear rama.
- Backend verify: 69 tests, 0 fallos/errores/omitidos; 50 con PostgreSQL real.
  MembresiaIntegrationTest 31, PlanPersistenceTest 8, PagosIntegrationTest 11.
- Siete regresiones nuevas: alta HTTP sin sede incluso con campo legado, perfil null,
  sede faltante/inexistente, pago+asignación+origen+replay, no cambio de habitual previa,
  rechazo con rollback real, guards SQL de personal y migración preservando datos/FK.
  Se mantienen concurrencia, multisede, renovación, QR, salida/aforo y pagos/PDF.
- Frontend: 111 dominio/portal/Recepción, 16 Planes, 14 transporte. Incluyen registro
  sin default, perfil sin sede, selección explícita, carga/error/empty de sedes,
  402/red/5xx/F5 y payload inmutable, storage inválido/no escribible, cambio de sesión,
  respuestas tardías y retry accesible aunque falle catálogo. Tests aislados con VM,
  sin nuevas dependencias ni afirmación de navegador real para esa suite.
- E2E manual con cuenta nueva sede.socio.20261030@fitzone.test: registro sin sede,
  perfil «Sin asignar», logout/login, catálogo, elección explícita Central, pago fake,
  Socio sin relogin, sede real, QR dinámico, comprobante y descarga PDF. F5 conserva
  todo. SQL: una cuenta, un período, un pago y un comprobante; usuario/origen sede 1.
- Cuenta adicional sede.cliente.20261030@fitzone.test para revisión sin contratar:
  perfil sin sede y catálogo/selección abiertos. Ambas usan SedePrueba123; DNI de prueba
  claramente identificable, sin datos personales reales. No se crearon sedes/planes.
- BD dev sólo tiene Central. Múltiples sedes y uso fuera de habitual se comprueban
  en integración, sin crear sedes permanentes de relleno.
- Recepción y Gerente: login, perfil/sede, aforo y catálogo administrativo verificados
  por HTTP real; reglas ingreso/salida/aislamiento y UI por suites de regresión.
- Builds frontend/backend y git diff --check correctos.

Reproducción: desde frontend, node --experimental-vm-modules scripts/test-dominio.mjs,
node --experimental-vm-modules scripts/test-planes.mjs, scripts/test-api.mjs con el
mismo flag y npm run build. Backend: PLAN_TEST_DB_URL exclusivamente al PostgreSQL
vacío/descartable, JAVA_TOOL_OPTIONS=-Duser.timezone=America/Argentina/Buenos_Aires,
y .\mvnw.cmd verify. Nunca apuntar las suites a fitzone normal.

Al terminar se eliminó únicamente fitzone-sede-test y su volumen anónimo con docker rm -v,
tras comprobar que no lo compartía ningún otro contenedor. PostgreSQL normal sigue
corriendo con su volumen original. Para reproducir: docker run --name fitzone-sede-test
-e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55432:5432 -d postgres:18.

## Búsqueda final y límites

No queda SEDE_ID_POR_DEFECTO ni sedeId: 1 en código productivo. IDs fijos en tests y
OpenAPI son ejemplos/fixtures; data.sql conserva lookup por nombre. La primera sede
que preselecciona el puesto de Gerente en M2 es su contexto operativo existente, no
asignación comercial. getSede() del titular ahora es null-safe; los accesos restantes
sobre solicitante interno están protegidos por rol y la invariancia de BD.

No M3/M4/Gerencia, nuevos roles, tablas N:N, cambio de sede ni nuevo ADR. P12 reemplaza
la propuesta de selección pública en registro. A futuro: clases/canchas pueden iniciar
en habitual y permitir otra sede; beneficios por membresía, reserva por sede del recurso.
Cliente y socio vencido usan tarifa externa de canchas según TP. No está implementado.
Quedan pendientes traslado posterior, responsable/autorización y gestión administrativa;
reportes deberán diferenciar habitual, origen del alta y sede de operación.

## Inventario del bloque

30 archivos pendientes, sin staging. La modificación de PagosIntegrationTest sólo adapta
el constructor de alta para mantener sus fixtures con sede existente. La exportación
de M2 pasa a sedesService sin cambiar ruta, permisos ni flujo de acceso.

- `LOGs/Vidoni-LOG.md`
- `README.md`
- `docs/m2-recepcion.md`
- `docs/membresias.md`
- `docs/openapi/DECISIONES.md`
- `docs/openapi/openapi.yaml`
- `docs/refactor-actores-verificacion.md`
- `docs/sede-habitual-verificacion.md`
- `frontend/scripts/test-api.mjs`
- `frontend/scripts/test-dominio.mjs`
- `frontend/scripts/test-planes.mjs`
- `frontend/src/modules/auth/RegisterPage.jsx`
- `frontend/src/modules/m1-usuarios/ContratacionMembresia.jsx`
- `frontend/src/modules/m1-usuarios/MembresiaUsuario.jsx`
- `frontend/src/modules/m1-usuarios/PortalSocio.css`
- `frontend/src/modules/m1-usuarios/PortalSocioCards.jsx`
- `frontend/src/services/m1Service.js`
- `frontend/src/services/m2Service.js`
- `frontend/src/services/sedesService.js`
- `src/main/java/com/fitzonesports/membresia/dto/CrearMembresiaRequest.java`
- `src/main/java/com/fitzonesports/membresia/service/MembresiaService.java`
- `src/main/java/com/fitzonesports/usuario/dto/RegisterRequest.java`
- `src/main/java/com/fitzonesports/usuario/dto/UsuarioResponse.java`
- `src/main/java/com/fitzonesports/usuario/model/Usuario.java`
- `src/main/java/com/fitzonesports/usuario/service/UsuarioService.java`
- `src/main/resources/db/migration/V8__sede_habitual_en_contratacion.sql`
- `src/main/resources/db/migration/V9__contexto_funciones_sede.sql`
- `src/test/java/com/fitzonesports/membresia/MembresiaControllerTest.java`
- `src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java`
- `src/test/java/com/fitzonesports/pago/PagosIntegrationTest.java`
