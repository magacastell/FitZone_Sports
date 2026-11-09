# RF-01/RF-02 — cierre local para revisión

> Los cortes del 07/11 y el seguimiento B/C son históricos. A/D quedan resueltos por
> el cierre autorizado del 09/11 documentado al final; sus propuestas anteriores no
> son el contrato vigente.

Fecha: 07/11/2026. Rama `feat/m1-experiencia-membresias`, base `03f904e`.
Commit funcional local: `cc8b5aa` — `feat(m1): completar perfil con foto y experiencia de membresías`.
El presente commit documental completa el cierre autorizado. Sin push, merge ni
cambios a la referencia de integración o main.

## Cambios y decisiones

- RF-01: nombre/apellido editables, DNI/email obligatorios e inmutables. Foto
  obligatoria en nuevos registros públicos y reemplazable desde Perfil, sin compra.
- Foto: PNG/JPEG hasta 2 MB, 4096 px por lado y 8 megapíxeles. Se comprueba contenido,
  no sólo extensión/MIME; se reescriben píxeles para descartar metadatos y contenido
  agregado. V10 crea una fila binaria por usuario, con FK y límite en PostgreSQL.
  Se eligió la BD existente para evitar servicios externos, carpetas de uploads,
  volúmenes adicionales y archivos huérfanos. V1–V9 permanecen inmutables.
- El alta multipart confirma usuario y foto en una transacción. GET/PUT de foto
  usan exclusivamente al titular del JWT. No se reciben IDs ajenos ni URLs externas;
  no-store/nosniff en la lectura. AvatarCircle reutiliza el transporte autenticado,
  revoca sus URLs blob y conserva iniciales para cuentas históricas o fallos de carga.
- El registro JSON anterior cambia a multipart con partes datos JSON y foto. Los
  consumidores deben adoptar el contrato actualizado; no se publica aún esta rama.
- RF-02 conserva las reglas de negocio y la idempotencia existentes. La UI evita
  nuevas ofertas prematuras o contradictorias, permite elegir el siguiente plan y
  mantiene visible el vigente. La preferencia automática usa el PUT existente.
- El refinamiento visual aprobado se conserva: identidad móvil, automática compacta,
  comprobantes con ancho de lectura y descarga roja/blanca, sin cambiar el PDF.

Las reglas y contratos se mantienen en membresias.md y openapi/openapi.yaml; no se
repiten aquí. No se creó un ADR nuevo: se usa la persistencia/transacción existentes.
Las decisiones RF-01 y la ubicación de bitácora están expresamente aprobadas por el
responsable. Se consultó también la transcripción local de Lineamientos; los PDFs
originales no estuvieron accesibles como archivos adjuntos en este checkout.

## Pruebas ejecutadas

| Evidencia | Resultado / alcance |
|---|---|
| frontend/scripts/test-dominio.mjs | 181 aprobadas: regresiones RF-01/RF-02, validación de foto, registro obligatorio, reemplazo y avatar autenticado con fallback/cleanup |
| frontend/scripts/test-api.mjs | 17 aprobadas: JSON/PDF/multipart, JWT y boundary delegado al navegador |
| FotoPerfilServiceTest + MembresiaControllerTest | 6 tests Java aprobados, sin errores/omitidos, ejecutados con JDK 21 en contenedor; validación real PNG/JPEG, tamaños/dimensiones, reescritura y DTO/HTTP |
| API real por Vite → Spring → PostgreSQL | 21 verificaciones aprobadas; no son mocks de persistencia ni del job |
| Persistencia tras reinicio | JPEG con el mismo hash SHA-256 después de reiniciar el contenedor Spring |
| Navegador con backend real | Registro desde selector de archivo, edición, reemplazo PNG→JPEG, recarga y foto cargada en perfil/encabezado |
| Recuperación con fallo de transporte real | Un proxy temporal descartó la respuesta 201 luego del cobro real fake; F5 y retry conservaron plan/UUID. BD: exactamente 2 períodos y 2 pagos, sin duplicado |
| Responsive | Registro y perfil con foto: 360/390/430/768/1440 px sin overflow. Las pantallas RF-02/comprobantes ya se verificaron en esos anchos en el refinamiento previo |
| Build Vite y git diff --check | Correctos; no existe script lint. No se afirma ejecución de suites completas |
| Contrato OpenAPI | YAML válido, sin claves/operationId duplicados y referencias locales resueltas (59 operaciones) |

Las 21 verificaciones HTTP incluyen: fotos ausente/inválida/SVG/excesiva; nombre
obligatorio; alta sin privilegios/sede arbitrarios; foto privada; rechazo de URL en
PATCH; DNI/email/rol inmutables; reemplazo JPEG; cuenta histórica sin foto; estados
ACTIVA/VENCIDA/SUSPENDIDA y continuidad; cambio trimestral futuro; replay y 409 con
otra intención; bytes PDF históricos iguales; vencida sin cobro retroactivo;
suspendida sin renovación; preferencia automática sin mover períodos; y ejecución
real del job que renovó una vencida una sola vez. Se desactivaron las automáticas
habilitadas por estas pruebas al terminar.

Backend Maven: imagen target build del Dockerfile, comando focalizado
`./mvnw -q -Dtest=FotoPerfilServiceTest,MembresiaControllerTest test`. Los dos tests
existentes de registro en MembresiaIntegrationTest se adaptaron a multipart para
mantener compilación y contrato, pero esa suite completa no se ejecutó.

## Entorno y datos

- React/Vite: http://127.0.0.1:5173. Spring Java 21: http://127.0.0.1:3000/api/v1.
- Contenedores exclusivos fitzone-notebook-backend y fitzone-notebook-postgres;
  puerto PG 55432, BD fitzone, volumen fitzone_notebook_rf_pgdata. V10 aplicada allí.
  No se tocaron otras bases, contenedores o volúmenes existentes.
- Respaldo SQL previo a V10, reportes, scripts de verificación, proxy y capturas
  permanecen fuera del checkout. El proxy de fallo se detuvo al terminar.
- Fotos viven en PostgreSQL y sus respaldos/volumen existentes; no requieren
  configuración de filesystem. Multipart: máximo archivo 2 MB y petición 3 MB.
- Dockerfile normaliza mvnw CRLF/permisos al construir para funcionar desde Windows.
  No se instaló JDK global ni se agregaron dependencias de aplicación.
- Se crearon cuentas ficticias para las pruebas, incluidas variantes del fixture
  de ciclo con sufijos cierre-rf01 y cierre-ui. Se preservaron los fixtures originales.
- Bitácora única: docs/bitacoras/LOG-vidoni.md. LOGs/Vidoni-LOG.md es sólo un enlace
  de compatibilidad. No se reescribió el historial ni el trabajo de compañeros.

## Archivos del alcance

- Backend RF-01: AuthController, UsuarioController, UsuarioService, FotoPerfilService,
  FotoPerfil, FotoPerfilRepository, RegisterRequest y ActualizarPerfilRequest;
  application.properties, V10 y normalización del wrapper en Dockerfile.
- Frontend RF-01: RegisterPage, AuthContext, SelectorFoto, fotoPerfil.js,
  PerfilUsuario, AvatarCircle/FitZoneUI, Layout, PortalSocioCards y transporte api/m1Service.
- RF-02 y visual previamente aprobados: RenovacionMembresia, MembresiaUsuario,
  PortalSocio.css e HistorialComprobante; sus cambios locales se conservaron.
- Tests: test-dominio.mjs, test-api.mjs, FotoPerfilServiceTest y adaptación de los
  dos registros de MembresiaIntegrationTest al contrato multipart.
- Documentación: membresias.md, este informe, OpenAPI, README y enlace de evolución
  en integracion-final-frontend.md; bitácora canónica y redirección de la ruta anterior.
  Sin cambios a backend M2/M3/M4/reportes ni a documentos de otros integrantes.

## Límites pendientes

- Conflicto de numeración: los Lineamientos oficiales reservan ADR-007 para
  sincronización offline; la rama de integración ya usa ese número para
  Cliente/Socio (`adr/0007-actores-y-membresia.md`). Debe resolverlo el equipo.
  No se renumeró ni se modificó unilateralmente ningún ADR.
- Confirmar en equipo el cambio de registro a multipart y la adopción conjunta de
  V10/código/frontend antes de integrar. No se ejecutó una suite completa ni una
  prueba de carga o de todos los formatos de cámara; HEIC/SVG/GIF no se aceptan.
- La validación del cliente comprueba tipo/tamaño; dimensiones y contenido se
  validan de nuevo en servidor. Los errores de upload no conceden registro ni foto.
- Las referencias históricas de foto que sólo eran texto no se descargan ni migran
  desde Internet. La cuenta conserva iniciales hasta cargar un archivo válido.
- No se definió cómo rellenar huecos entre períodos pagados ni exclusión global de
  intenciones distintas entre múltiples clientes. Se conserva el contrato existente.
- En el corte del 07/11 el conflicto de DNI no tenía traducción específica. La
  corrección local del 09/11 conserva la restricción SQL y responde 409; ver seguimiento debajo.
- Sprint/unidad numéricos de la entrada de cierre requieren cotejar planificación;
  no se inventaron. Horas: aproximadamente 3, confirmadas por el responsable.

## Qué tengo que entender para defender estos cambios

1. FotoPerfilService.validar: limita bytes y dimensiones antes de descomprimir,
   valida PNG/JPEG y reescribe la imagen. El nombre y MIME del archivo no bastan.
2. AuthController.register → UsuarioService.registrarCliente → FotoPerfilService
   → repositories: DTO validado, foto y usuario en la misma transacción JPA.
3. FotoPerfilService.reemplazar/consultar: titular del JWT, bytes en usuario_foto y
   referencia versionada; AvatarCircle descarga con JWT y revoca su URL temporal.
4. RenovacionMembresia.enviarRenovacion: el registro local conserva planId y UUID;
   MembresiaService.renovar bloquea al titular, comprueba replay y confirma período,
   pago y comprobante. La respuesta perdida se probó contra ese backend real.
5. cambiarAutomatica configura la preferencia; procesarAutomatica cobra al agotarse
   el último período pagado. Se probó el job existente, sin crear otro ni cobrar en React.

## Seguimiento focalizado — 09/11/2026

Rama fix/cierre-m1-m2-online, base 08ecb29; fetch sin novedades ni superposiciones.
Los resultados anteriores siguen siendo históricos. No se repitió una auditoría general.

- A, foto en Recepción: confirmado por código, sin reproducción nueva de navegador.
  Pendiente de aprobación porque requiere contrato de lectura del titular validado;
  la ruta /usuarios/me/foto no puede utilizarse como foto del socio desde otra sesión.
- B, 401 tardío: reproducido mediante respuesta diferida y corregido. Sólo se cierra
  sesión si el token actual coincide con el utilizado por la petición que recibió 401.
- C, DNI: reproducido con Spring/MockMvc y PostgreSQL 18 descartable; antes escapaba
  DataIntegrityViolationException por usuario_dni_key. Ahora devuelve 409 sin detalles SQL.
  Se conservan email 409 y errores de restricciones desconocidas. No cambian V1–V10.
- D, foto administrativa: el frontend actual no la escribe, pero PATCH /usuarios/{id}
  y ActualizarUsuarioRequest la conservan como contrato stable. No es código muerto.
  Pendiente de aprobación: rechazar nuevas referencias textuales manteniendo campos
  omitidos/null; actualizar DTO/OpenAPI y probar permisos y demás campos administrativos.

Verificación nueva: 18 transporte frontend, 181 dominio/UI y build Vite correctos.
Java 21 en imagen preexistente: 22 tests, 0 fallos, 0 errores y 0 omitidos:
RegistroIdentidadIntegrationTest (3), RegistroConflictosTest (1), FotoPerfilServiceTest (4),
MembresiaControllerTest (2), nueve métodos seleccionados de MembresiaIntegrationTest
(multisede, permisos, QR, doble presencia, aforo, replay, automática, continuidad,
renovación histórica y concurrencia de alta) y tres de PagosIntegrationTest (PDF,
autorización y comprobante de renovación). No es la suite completa.
Registro usa requests multipart reales de MockMvc sobre Spring y PG; no son llamadas
HTTP por socket. Se comprobaron alta normal, DNI/email duplicados, foto privada PNG,
reemplazo JPEG, perfil con DNI/email inmutables y cuenta sin foto; se limpian sólo las
cuentas generadas por ese test. La reproducción inicial falló por DNI antes de corregir.
La prueba frontend nueva también falló antes de corregir el interceptor.

Entorno exclusivo: fitzone-cierre-m1-pg, almacenamiento tmpfs, sin puertos publicados
ni volúmenes preexistentes; fitzone-cierre-m1-tests conserva los reportes de la última
corrida. Se reutilizó fitzone-notebook-tests:local (JDK 21) con src montado sólo lectura.
No se instalaron dependencias ni JDK global. No se iniciaron los contenedores previos.
La pérdida de respuesta monetaria y la persistencia tras reiniciar Spring conservan
la evidencia histórica del 07/11: no se volvieron a ensayar mediante navegador/proxy.

Propuesta A para revisión conjunta: GET /accesos/{accesoId}/foto-titular autenticado,
resolviendo usuario desde el registro, no desde un usuarioId enviado por React.
Recepción sólo su sede operativa; Gerencia según permiso acordado. Limitar inicialmente
la lectura a accesos abiertos; sin foto 404 e iniciales, sin ampliar acceso a URLs
históricas externas. LectorAcceso usaría transporte autenticado y blob con cleanup,
sin modificar AccesoResponse. Esto no cubre foto después del egreso: habilitarla requiere
acordar explícitamente el alcance temporal. Alternativa compatible inmediata: iniciales,
pero no satisface visualizar la fotografía. Ninguna alternativa se aplicó.
Pruebas propuestas: titular distinto del operador y sede habitual distinta de visitada;
operador de sede ajena, usuario común y anónimo denegados; QR inválido/vencido sin
nuevo acceso; histórico sin foto; cierre del acceso y cleanup del blob.

No se modificaron M2, políticas compartidas ni DTO administrativos. A/D no se declaran
resueltos. OpenAPI sólo refleja la corrección de DNI/email 409 del contrato de registro.
Cierre local autorizado: commit funcional `975a827`; documentación en el segundo commit local.
Sin publicación, PR, merge ni rebase. Sprint/unidad y horas nuevas pendientes de confirmar.

Cierre de esta verificación: git diff --check correcto; YAML OpenAPI validado con
SnakeYAML en Java 21 (sin instalar paquetes). La base temporal quedó detenida; el
contenedor de tests está detenido y conserva sus XML. Las tres referencias base
permanecen en sus hashes originales y el índice está vacío.

## Cierre definitivo de M1 y M2 online — 09/11/2026

Base `f8c6c7f`, rama `fix/cierre-definitivo-m1-m2-online`. Sin reimplementar RF-01/02:
se completó A con la foto canónica del socio en el resultado de ingreso/egreso
autorizado, y D con rechazo 400 de foto administrativa textual no nula. Omitido/null
mantiene compatibilidad. La alternativa anterior de endpoint independiente no se
implementó: se reutilizó `titular.foto` con PNG/JPEG inline y no-store. Ver contratos
actualizados en [Recepción](m2-recepcion.md) y [membresías](membresias.md).

Se expuso la salida por número de ingreso que ya admitía el backend, porque la UI
sólo aceptaba QR y no permitía usar esa alternativa tras su vencimiento. No agrega
historial/búsqueda, cambia permisos ni modifica reglas de membresía.

Verificación nueva: npm test (18 transporte, 185 callbacks dominio/UI, 16 Planes,
18 contratos Actividades y 7 Gerencia), build Vite y backend completo: 85 tests,
sin fallos, errores ni omitidos. Java 21 y PostgreSQL 18 descartable, con migraciones
y contrato YAML incluidos. JaCoCo: 774/892 líneas (86,77 %) y 287/376 ramas (76,33 %).
La foto se verificó con HttpClient y servidor Spring en puerto aleatorio; D con
MockMvc/Spring/PG. La concurrencia RN-01 usa dos transacciones sobre la misma PG.
Las suites frontend siguen siendo VM/mocks, no navegador ni React DOM.

Las cuatro nuevas regresiones backend pasaron focalizadas y luego en la suite
completa. El primer intento focalizado falló por limpieza incompleta de fixtures
con accesos confirmados fuera de transacción; se corrigió sólo ese cleanup. La
prueba frontend del número de ingreso se ajustó por el espaciado del harness al
extraer texto JSX, manteniendo la comprobación del ID y del body enviados.

Resultados completos y ubicaciones de reportes: [pruebas.md](pruebas.md). No hubo
nueva revisión visual ni repetición del proxy/persistencia tras reiniciar Spring;
esas evidencias anteriores siguen identificadas como históricas. No se amplía la
garantía de idempotencia a intenciones diferentes ni se define cómo rellenar huecos
entre períodos. Offline y sincronización permanecen fuera de este cierre, al igual
que el conflicto grupal de numeración de ADR-007, que no se renumeró.
