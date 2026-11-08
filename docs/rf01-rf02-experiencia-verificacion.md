# RF-01/RF-02 — cierre local para revisión

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
- El conflicto de DNI duplicado sigue dependiendo de la restricción SQL, como ya
  indicaba OpenAPI; no se agregó una nueva política de identidad.
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
