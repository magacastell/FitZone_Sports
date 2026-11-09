# Refactor Cliente/Socio — informe de implementación y verificación

Fecha: 30/10/2026. Rama: `refactor/dominio-actores-membresia`.
Base de la auditoría: `615849597b8c87c68b3e6842536fe5e1650a2893`.

Las secciones A–U conservan evidencia de las revisiones previas al cierre; sus notas
de árbol pendiente/sin commit describen esas etapas. La aprobación y el cierre
autorizado del 30/10/2026 se registran en V; el historial Git identifica ambos commits.

## A. Diagnóstico

Dos autoridades comerciales pretendían identificar actores temporales, pero registro,
clases/sidebar y M1/M2 no compartían semántica. La compra no mutaba rol; vencer tampoco.
La auditoría cubrió todas sus referencias ejecutables, JWT, seeds, controladores, SQL,
M1/M2/M5, stubs M3/M4, contratos, documentación y tests disponibles en el checkout.
No se encontró C4 ni especificación adicional del TP en este checkout: no se inventan
precios, descuentos o restricciones pendientes para suplirla. La matriz está en ADR-007.

## B. Modelo

USUARIO es autoridad de cuenta estable. ACTIVA determina actor funcional Socio;
sin vigencia, Cliente conserva su identidad y, si existe, historial con badge
VENCIDA/SUSPENDIDA. RECEPCIONISTA y GERENTE no dependen de membresía propia.
La sede habitual es independiente; ingreso multisede valida vigencia M1/M2.

## C. Alternativas

Se descarta mutar rol al pagar/vencer por duplicación temporal y JWT obsoleto;
se descartan aliases permanentes. ADR-007 detalla decisión, matriz y consecuencias.

## D. Cliente → Socio

Registro/login USUARIO → GET membresía 404 → catálogo GET /planes activo real →
selección explícita → confirmación → POST /membresias con clave → DTO confirmado →
actualizar contexto compartido → etiqueta Socio, portal, QR y comprobantes.
No se necesita logout/login. Errores de consulta no equivalen a ausencia de membresía.

## E. Pago

POST /membresias y POST /membresias/{id}/renovaciones llaman al caso de uso M1,
CobroMembresiaService y PasarelaPagoFake existentes. No se agrega otro pago/frontend.
El PDF se persiste al emitir y se descarga desde GET /pagos/{pagoId}/comprobante,
con control de titularidad. Se usan pagoId y snapshots del historial; el listado de
pagos general sigue 501 y no se usa ni se presenta como implementado.

## F. Integridad

Rechazo 402 revierte SQL y no concede vigencia. La misma clave y payload no crean
otro período/cobro. Reintentos inciertos conservan intento; 409 reconcilia contra GET.
Renovación mantiene pendiente por usuario/membresía en sessionStorage. Se preservan
bloqueos, snapshots de plan/precio/duración, [inicio,fin), máximo fin no cancelado,
meses calendario y trigger antisolapamiento. No se modifica el algoritmo comercial.
Una pasarela externa futura necesita registro durable/reconciliación, no promesa de
atomicidad distribuida por rollback SQL. La fake actual no hace llamadas remotas.

## G. Backend

Registro y controladores migran a USUARIO. JwtService contrasta claim con autoridades
actuales cargadas desde BD. MembresiaService expone consulta de vigencia por email
para los guards de beneficios de clases; su operación permanece stub. No se reescriben
M2, cobros, reembolsos ni períodos. PDF sólo cambia su presentación de emisión;
mantiene el documento original persistido. Usuarios internos conservan privilegios.

## H. Frontend

Auth descarta tokens antiguos/desconocidos. Layout/Perfil usan nombreActor y estado
compartido, no rol de socio. ContratacionMembresia contiene flujo S4; CatalogoPlanes
sólo presentación v0 con datos reales. MembresiaUsuario conserva portal aprobado.
Sin cuenta no hay credencial, renovación, recibos ni demos como capacidades.
HistorialComprobante ofrece PDF real por período pagado; pagosService usa fetchAPI,
que conserva JSON/204/401/status/data y añade respuesta blob opcional.
M3/M4 muestran placeholders honestos, sin descuentos ficticios por rol.

## I. Base de datos

V7 añade USUARIO, reasigna ambos roles comerciales y elimina los legados. No modifica
IDs, hashes, membresías, sedes, pagos ni PDFs. V1–V6 intactas. Test de upgrade desde
V6 compara filas históricas completas y bytes PDF antes/después, además de usuarios.
La recarga del backend dev aplicó V7 a la BD local. No se editaron migraciones previas.
La BD local ya está en V7: no hay downgrade automático para volver a ejecutar una rama
anterior con roles legados sobre la misma BD. Usar una BD separada para comparar esa base.

## J. Sesiones

Un JWT comercial legado deja de servir tras V7: se requiere nuevo login. Los tokens
USUARIO siguen vigentes al comprar/vencer/suspender, porque no llevan condición comercial.
Cambios administrativos de autoridad invalidan su claim anterior. Backend valida firma,
expiración, cuenta habilitada y autoridad actual; ocultar botones nunca sustituye seguridad.

## K. Automatización ejecutada

- Maven: 56 tests, 0 fallos, 0 errores, 0 omitidos. 37 usan PostgreSQL real; 19 son
  unitarios/contratos/autorización. Incluye migración, registro/login, token legado,
  períodos futuros consecutivos/replay, límite exacto, snapshots, rollback de rechazo,
  PDF/reembolso, permisos y entrada multisede/salida tras vencer/aforo.
- Node VM + esbuild existente: 77 verificaciones de dominio/portal/comprobantes, 16 de Planes y
  12 de fetchAPI/JSON/errores/PDF. Son verificaciones aisladas con hooks/servicios
  controlados; no se confunden con integración SQL ni con pruebas DOM de React.
- Build frontend correcto. Sin nuevas dependencias ni cambios en package/lock.
- La primera ejecución PostgreSQL falló por alias horario de Java; se corrigió el
  entorno con JAVA_TOOL_OPTIONS=-Duser.timezone=America/Argentina/Buenos_Aires.

Reproducir desde frontend: `node --experimental-vm-modules scripts/test-dominio.mjs`,
`node --experimental-vm-modules scripts/test-planes.mjs`,
`node --experimental-vm-modules scripts/test-api.mjs`, `npm run build`.
Backend: PLAN_TEST_DB_URL a BD vacía descartable con postgres sin contraseña;
JAVA_TOOL_OPTIONS con zona argentina; ejecutar `./mvnw.cmd test`.
Se utilizó contenedor dedicado `fitzone-domain-test`, puerto local 55432, no la BD dev.

## L. E2E manual real

- Cuenta nueva: registro HTTP, catálogo, selección y contratación: correcto; transición
  inmediata Cliente → Socio, sin renovar sesión. Una contratación fake, sin cargos reales.
- PDF descargado por UI, 1294 bytes, cabecera %PDF-1.6; datos de M5 persistidos.
- Renovación de la cuenta E2E: período consecutivo, persistencia tras F5 y QR real.
  Comprobación SQL: autoridad USUARIO, 2 períodos, 2 pagos y 2 comprobantes.
- Gerente: login y catálogo administrativo operativo, sin contaminar estado comercial.
- Recepción: login, lector y aforo real 0/200; sin membresía personal ni estado previo.
- Cambio de cuentas y F5: correctos.
- Rechazo de pago: integración con gateway controlado, no forzado en dev porque la
  fake productiva aprueba solicitudes válidas. Sin vigencia accidental ni duplicación.
- VENCIDA/SUSPENDIDA y escenarios extra: tests, sin alterar membresías ajenas.

Cuentas de revisión creadas mediante registro, contraseña de prueba `DominioPrueba123`:
`catalogo.20261030@fitzone.test` sin membresía/pagos;
`dominio.20261030@fitzone.test` con contratación y renovación fake.
Los nombres de las cuentas demo antiguas no garantizan condición comercial.

## M. Responsive/accesibilidad

Catálogo y portal probados en 390/768/1280/1440; ancho del documento no supera viewport.
Botones/labels, selección explícita aria-pressed, foco y mensajes status/alert;
no se usa sólo color. Perfil permanece accesible por header para los tres roles.

## N. Documentación

ADR-007, README, membresías, guía frontend y OpenAPI actualizan fuente de verdad.
DECISIONES conserva antecedentes históricos con aviso de sustitución por ADR-007.

## O. Límites pendientes

No se implementan reservas/descuentos/política financiera M3/M4 ni reportes.
No se define máximo de anticipación. No se agrega pasarela remota ni su reconciliación.
No se integra listado financiero general; los PDFs son de membresías con pagoId real.
Evolución posterior: el bloque de sede habitual elimina la asignación silenciosa del registro y elige sede al contratar; ver [verificación](sede-habitual-verificacion.md). El resto de este informe describe su corte original. Los períodos migrados sin pago identificado no anuncian comprobante inexistente.

## P. Diff

Sólo dominio de actores, autorización, migración/seed, flujo comercial/PDF, pruebas y
documentación afectada. Sin cambios de dependencias, bitácoras o migraciones V1–V6.
No se implementa Gerencia nueva ni se altera su CRUD de Planes.

## Q. Git

Rama `refactor/dominio-actores-membresia` desde paraguas integrada en 6158495.
Sin commit nuevo, sin push, sin merge a main. Los cambios quedan pendientes de revisión.

## R. Cortes de commit sugeridos (aún no ejecutados)

1. Autoridades/migración/JWT/controladores + tests backend y ADR: deben viajar juntos.
2. Experiencia comercial/PDF y sesión frontend + sus tests/guía/contratos relacionados.
Revisar el conjunto completo; no desplegar ambos cortes por separado durante la migración.

El inventario completo actualizado está en los manifiestos de la sección T.

## S. Cierre Canchas / Comprobantes / PDF (30/10/2026)

### Canchas y Clases: evidencia y decisión

- Revisados AppRoutes, Layout, GrillaCanchas, AgendaClases, CanchaController,
  ReservaController, ClaseController, OpenAPI, decisiones, README y V1.
- No hay servicio real de reserva/precios en el paquete reserva. V1 sólo tiene
  costo_base_hora, precio_aplicado, tipos, turnos y reservas; no ejecuta una tarifa.
- README incluye Socio y Cliente en consulta/reserva; OpenAPI M4 es draft/stub y
  P07 deja fórmula, descuentos y precios pico pendientes. El porcentaje del antiguo
  prototipo no constituye una regla. No se encontró texto íntegro del TP en checkout
  ni en sources del espejo local; no se atribuyen citas/requisitos no leídos.
- La intención de dominio confirmada en este pedido admite a ambos: Cliente con
  tarifa externa; Socio con beneficio según membresía y reglas futuras de M4.
  La tarifa final no está implementada: no hay porcentaje o importe confirmado.
- USUARIO sirve a ambos estados. Canchas no exige ACTIVA para autorizar la futura
  reserva; cambiar roles no quitó acceso conceptual al Cliente. Regresión HTTP:
  consulta/reserva propia devuelve 501 antes y después de contratar con el mismo JWT;
  anónimo 401 y Recepción no reserva como cliente (403). No se convierte el 501 en éxito.
- Clases difiere: los guards de beneficios consultan vigencia M1; sus operaciones
  siguen 501. Cancelación/recuperación no se bloquea sólo por vencimiento.
- Menú: Canchas/Clases ocultos para Cliente y Socio. Rutas directas con pantalla
  honesta de no disponibilidad, sin precios, disponibilidad ni reservas mock.
  No se modifica M4 ni se introduce QR de reservas. No hace falta otro guard de rol.

### Qué puede hacer cada actor hoy

Cliente sin cuenta: Perfil real, catálogo activo real, selección y contratación fake.
No tiene QR, renovación ni Comprobantes en menú. URL personal de comprobantes vuelve
al catálogo después de verificar ausencia (404); un error no se transforma en ausencia.
Socio: portal aprobado, períodos/snapshots, renovación permitida por M1, QR real y
PDF por pago registrado. Si vence/se suspende conserva identidad, historial/PDF y las
acciones que M1 permita; pierde QR según DTO/backend, no según fechas de presentación.
Recepción/Gerencia: autoridad estable, perfil sin membresía propia, operación real de
su rol. La UI personal de Comprobantes informa no disponibilidad a personal interno;
el permiso backend de Gerencia para descargar PDF ajeno se conserva.

### Contrato real de comprobantes (sin ampliar API)

| Información | Fuente disponible | Presentación |
|---|---|---|
| ID/número de comprobante | No viene en MembresiaResponse; número dentro del PDF | No se fabrica FZ-P desde pagoId en JSX |
| Emisión / fecha pago | Dentro del PDF; no en lista de períodos | No se muestran como fechas del período |
| Estado de pago | No expuesto por listado real; GET /pagos y /pagos/me /{id} siguen 501 | No se agrega badge APROBADO/REEMBOLSADO |
| Plan | Periodo.nombrePlan snapshot | Heading de card |
| Inicio/fin | Periodo.inicio/fin OffsetDateTime | Zona argentina |
| Importe | Periodo.precio snapshot, ARS documentado | Moneda es-AR, dos decimales |
| Estado período | Periodo.estado | CANCELADA = Período cancelado, no reembolso inferido |
| Referencia pago | Periodo.pagoId | Referencia de pago #ID, no número de comprobante |
| Titular | usuarios/me para perfil; capturado en PDF | No se duplica ni adivina en listado |
| Reembolso | POST /pagos/{id}/reembolsos devuelve estado/monto/moneda/fecha/referencia | Es mutación; no llamarlo para consultar |
| PDF | GET /pagos/{id}/comprobante | JWT, bytes PDF, attachment, no-store |

Listado limitado a períodos con pagoId, mismo helper/origen que card del portal.
No es historial financiero general (reservas siguen pendientes). Orden descendente
por inicio del período, explícito en pantalla: no se presume orden ni cronología de
emisión ausentes en el DTO. No se muta la lista compartida. No hay pagos ficticios.

### UI y descarga

FitZoneUI/DataCard/StatusBadge/EmptyState y tokens existentes, sin librerías nuevas.
Cards con plan, referencia, período e importe destacado. Loading/error/empty separados;
error de consulta con reintento y sin detalles técnicos. Ausencia de cuenta redirige;
cuenta válida sin períodos pagados muestra empty. Download con bloqueo inmediato por ref,
ID real, blob y revocación URL; resultados tardíos no actualizan ni descargan tras unmount.
Feedback accesible en región viva «Descarga iniciada», desaparece a los 4 s y limpia timer.
403/404 con mensajes específicos; red/5xx con error comprensible y botón reintentable.
No promete que el navegador haya guardado un archivo. Botones con nombres únicos por
plan/período/pago, foco visible heredado, estado no basado sólo en color.

### PDF y snapshots

- Nuevo layout PDFBox: márgenes A4, tipografías Helvetica normal/negrita, secciones,
  separadores, número, fechas, titular, DNI/email, plan/período, cantidad, total ARS
  argentino y aclaración académica/sin validez fiscal. Paginado para textos largos,
  símbolos no soportados normalizados; sin logos externos, imágenes ni dependencia nueva.
- DatosComprobante es un record interno que separa datos de dibujo, no un endpoint ni
  modelo comercial nuevo. Lienzo es estado privado de renderizado/paginación por llamada.
  La generación sigue en ComprobanteService/Renderer, no en controller.
- Emisión conserva número/fecha; snapshots plan/precio/período salen del período,
  identidad se captura en el PDF al emitir. Luego se retornan bytes existentes antes
  de consultar identidad actual. Test cambia nombre del titular y plan/precio maestro,
  verifica plan/identidad/importes originales y byte[] idéntico.
- Los PDF emitidos antes mantienen diseño anterior: no se regeneran por un rediseño.
- Reembolso conserva el original; backend cancela período, registra devolución y no
  duplica el reembolso. UI no afirma resultado financiero desde CANCELADA. No se agrega
  reembolso frontend. El PDF explica que no acredita vigencia ni estado actual del reembolso.
- Límite heredado: pagos antiguos sin bytes recuperan PDF con identidad actual y plan
  snapshot. No existe titular snapshot previo para reconstruirlo. No se inventa ni se
  agrega migración para llenar información desconocida.
- Titular A no puede descargar pago B cambiando ID (403), personal Recepción 403,
  anónimo 401, gerente conserva permiso. No se debilita control por ocultamiento frontend.

### Verificación de cierre

- Maven completo: 56 tests, cero fallos/errores/omitidos. PostgreSQL real: 18 membresía,
  8 persistencia/migraciones y 11 pagos = 37; restantes 19 unitarios/contratos/seguridad.
- Renderer: formato, campos, acentos, total y aclaración fiscal; contenido largo pagina.
  Imagen target/comprobante-ejemplo.png inspeccionada visualmente sin recortes/solapamientos.
- M5: propiedad, reembolso/replay, PDF inmutable, renovación con comprobante propio y
  replay de misma clave sin más pagos/documentos. M1: rechazo 402 rollback, token estable,
  límites [inicio,fin), múltiple anticipación; M2: QR/ingreso multisede/salida/aforo real.
- Frontend aislado: dominio/portal/comprobantes 77; Gestión Planes 16; transporte 12.
  Se agregan sólo pruebas del comportamiento nuevo: URL directa, estados, orden, ARS,
  descarga por ID, bloqueo, errores, aviso temporal y cleanup/unmount. Sin dependencias.
- Builds: npm run build y mvnw.cmd -DskipTests package correctos, con timezone argentino.
- Cuenta E2E adicional creada por registro: cierre.20261030@fitzone.test / DominioPrueba123.
  Contratación real fake, transición inmediata sin logout/login, PDF FZ-P-7 descargado;
  renovación con período futuro 30/11 a 30/12, segundo PDF FZ-P-8. Ambos de 16.000,75 ARS,
  identidad correcta, declaración académica y fechas reales. Descargas en Downloads,
  no en repositorio. El evento de seguimiento de descarga Chrome expiró; los archivos
  reales se verificaron en disco y su contenido con pypdf, sin caracteres de reemplazo.
- No se ensució dev para fabricar rechazo/vencimiento/suspensión/reembolso: esas ramas
  usan integración PostgreSQL aislada y servicios controlados. Sólo cuenta y dos compras
  fake E2E por flujo público; no hay cargos externos ni cambios a usuarios ajenos.
- Regresión Gerencia: login y listado real manual; CRUD, baja/reactivación, edición,
  activos visibles e inactivos no contratables por pruebas frontend y backend completas.
  No rediseño ni modificación de GestiónPlanes.
- Recepción: login/lector/aforo manual; ingreso/salida y multisede por integración real,
  sin afirmar uso de un lector físico. Cambio de sesión cubierto por UI y pruebas.
- Responsive de catálogo/portal/comprobantes: 390/768/1280/1440; sin overflow horizontal,
  botones PDF de al menos 44 px y texto legible. Headings/labels, foco, alert/status y
  nombre accesible único de descarga. Teclado: controles nativos y foco visible.

### Búsqueda de roles y USUARIO

Búsqueda global `rg -n 'CLIENTE_EXTERNO|SOCIO_ACTIVO'` excluyendo artefactos ignorados:

| Archivos con referencias restantes | Clasificación |
|---|---|
| V2__insertar_roles.sql | Migración histórica intacta |
| V7__autoridad_usuario_estable.sql | Conversión/eliminación explícita, no alias |
| MembresiaIntegrationTest.java | JWT legado que debe fallar |
| PlanPersistenceTest.java | Fixture V6 y aserciones de migración |
| frontend/scripts/test-dominio.mjs | Rechazo de tokens legados |
| docs/adr/0007-actores-y-membresia.md | Antecedente y decisión |
| docs/frontend-ui-guidelines.md | Auditoría anterior identificada como histórica |
| docs/openapi/DECISIONES.md | Antecedentes expresamente sustituidos por ADR-007 |
| LOGs/Cejas-LOG.md, LOGs/Orge-LOG.MD | Bitácoras históricas no modificadas |
| Este informe | Registro de búsqueda y clasificación |

Ningún uso activo en src/main/java o frontend/src como permiso/modelo vigente.
Sin aliases. Revisados todos los usos de USUARIO: registro, validación de claim,
perfil/capacidades personales y guards de controllers. No equivale a beneficio:
M2 exige vigencia, clases consulta M1; QR usa ACTIVA real. Canchas sigue stub y no
aplica descuento por rol; actor visual usa membresía compartida. Variables locales
llamadas esCliente identifican la sección de cuentas USUARIO, no conceden beneficios.

### Revisión integral, ADR y límites

ADR-007 releído y actualizado: implementación B coincide con matriz, JWT/migración,
M1/M2, sede, tarifas futuras y snapshots. Docs M1/M5 y guía UI incorporan contrato
real y patrón de cards/feedback. Bitácora resume sin inventar tiempo, hash ni PR.
No se modifican dependencias/lock, V1-V6, lógica de renovación/cobro/reembolso/M2,
ni módulos reales de Gerencia/Recepción. M3/M4 completos, listados financieros, pasarela
externa y snapshots previos inexistentes siguen pendientes. No nueva funcionalidad administrativa.

## T. Propuesta exacta de dos commits (NO ejecutados)

Se proponen exactamente dos cortes de revisión. Ambos forman una única migración
funcional: NO adoptar/desplegar por separado. No se propone tercero: el DTO interno,
renderer y sus tests de M5 cambian presentación/snapshots y encajan con la experiencia
Comprobantes, sin cambiar un contrato HTTP ni el algoritmo de cobros.

### Commit 1: refactor(dominio): separar autoridad y estado de membresía

Archivos completos:

- `docs/openapi/DECISIONES.md`
- `docs/openapi/openapi.yaml`
- `frontend/src/context/AuthContext.jsx`
- `src/main/java/com/fitzonesports/acceso/controller/AccesoController.java`
- `src/main/java/com/fitzonesports/auth/service/JwtService.java`
- `src/main/java/com/fitzonesports/clase/controller/ClaseController.java`
- `src/main/java/com/fitzonesports/membresia/controller/MembresiaController.java`
- `src/main/java/com/fitzonesports/membresia/controller/PlanController.java`
- `src/main/java/com/fitzonesports/membresia/service/MembresiaService.java`
- `src/main/java/com/fitzonesports/pago/controller/PagoController.java`
- `src/main/java/com/fitzonesports/reserva/controller/CanchaController.java`
- `src/main/java/com/fitzonesports/reserva/controller/ReservaController.java`
- `src/main/java/com/fitzonesports/sede/controller/SedeController.java`
- `src/main/java/com/fitzonesports/usuario/controller/UsuarioController.java`
- `src/main/java/com/fitzonesports/usuario/service/UsuarioService.java`
- `src/main/resources/data.sql`
- `src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java`
- `src/test/java/com/fitzonesports/membresia/PlanAuthorizationTest.java`
- `src/test/java/com/fitzonesports/membresia/PlanPersistenceTest.java`
- `docs/adr/0007-actores-y-membresia.md`
- `src/main/resources/db/migration/V7__autoridad_usuario_estable.sql`

Hunks compartidos que pertenecen al dominio:

- `README.md`: tabla/leyenda de autoridades y descripción de membresía independiente.
- `docs/membresias.md`: autoridades USUARIO, V7 y explicación de identidad estable.
- `src/test/java/com/fitzonesports/pago/PagosIntegrationTest.java`: fixtures migrados
  a USUARIO y regresión conceptual de autorización de Canchas (501 antes/después).

### Commit 2: refactor(frontend): integrar experiencia cliente y socio

Archivos completos:

- `LOGs/Vidoni-LOG.md`
- `docs/frontend-ui-guidelines.md`
- `frontend/src/components/Layout.jsx`
- `frontend/src/modules/m1-usuarios/MembresiaUsuario.jsx`
- `frontend/src/modules/m1-usuarios/PerfilUsuario.jsx`
- `frontend/src/modules/m1-usuarios/PortalSocio.css`
- `frontend/src/modules/m1-usuarios/PortalSocioCards.jsx`
- `frontend/src/modules/m3-clases/AgendaClases.jsx`
- `frontend/src/modules/m4-canchas/GrillaCanchas.jsx`
- `frontend/src/modules/m5-pagos/HistorialComprobante.jsx`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/services/api.js`
- `src/main/java/com/fitzonesports/pago/service/ComprobantePdfRenderer.java`
- `src/main/java/com/fitzonesports/pago/service/ComprobanteService.java`
- `src/test/java/com/fitzonesports/pago/ComprobantePdfRendererTest.java`
- `docs/refactor-actores-verificacion.md`
- `frontend/scripts/test-api.mjs`
- `frontend/scripts/test-dominio.mjs`
- `frontend/scripts/test-planes.mjs`
- `frontend/src/modules/m1-usuarios/CatalogoPlanes.jsx`
- `frontend/src/modules/m1-usuarios/ContratacionMembresia.jsx`
- `frontend/src/modules/m1-usuarios/estadoCuenta.js`
- `frontend/src/services/pagosService.js`
- `src/main/java/com/fitzonesports/pago/dto/DatosComprobante.java`

Hunks restantes:

- `README.md`: flujo/descarga PDF, herramientas de verificación y comandos frontend.
- `docs/membresias.md`: integración/limitaciones M5 y sección Comprobantes personales y PDF.
- `src/test/java/com/fitzonesports/pago/PagosIntegrationTest.java`: datos originales
  en PDF, formato ARS, replay renovación sin duplicar pago/comprobante.

Al autorizar commits se separarán esos hunks explícitamente; no se ha hecho staging.
Todo archivo pendiente está asignado una vez o dividido por responsabilidad arriba.
No incluye package/lock, V1-V6, servicios M1, lógica de renovación, QR ni binarios de QA.
Los artefactos de pruebas/build quedan ignorados en target/dist o fuera del checkout.

Estado de cierre: rama original seleccionada, HEAD 615849597b8c87c68b3e6842536fe5e1650a2893,
índice vacío; 48 archivos pendientes (37 tracked modificados + 11 nuevos).
No commit, push, merge ni cambio de rama. Árbol listo para revisión manual.

Pantallas finales abiertas en Chrome para revisión: Cliente catalogo.20261030@fitzone.test
por http://localhost:5173/membresia; Socio cierre.20261030@fitzone.test por
http://127.0.0.1:5173/membresia y sus Comprobantes por /comprobantes. Se usan dos
orígenes locales para aislar localStorage entre Cliente/Socio; no es una funcionalidad
nueva de sesión. Contraseña de ambas cuentas: DominioPrueba123. Viewport restaurado.
La automatización Chrome requirió una pestaña fresca para continuar algunas acciones;
el logout funcionó en ella. No se alteró código de sesión para resolver el problema de
control de pestañas. El evento de descarga no fue la evidencia final: se verificaron
los archivos PDF reales en disco.

Cierre técnico: git diff --check devuelve 0; los 11 archivos nuevos fueron revisados
por whitespace y UTF-8. Dos líneas vacías con espacios de AppRoutes (70, 86) ya existen
en HEAD y se conservaron, sin limpieza ajena al alcance. Las advertencias LF/CRLF de Git
no son errores de whitespace. Contenedor PostgreSQL de tests detenido (retenido),
servicios dev conservados. Sin staging, commit, push, merge ni cambio de rama.

## U. Verificación final de ADR y PostgreSQL de integración (30/10/2026)

### Inventario de decisiones anteriores y corrección de numeración

La búsqueda se extendió a todos los archivos propios del checkout (incluidos README,
LOGs, docs, configuración y archivos ocultos), archivos versionados y el historial
local de todas las referencias Git disponibles. No se consultaron repositorios remotos
ni se incorporaron documentos históricos ausentes al working tree.

Hay **6 ADR anteriores con número explícito**, acreditados por README/bitácoras:

| ID | Decisión | Evidencia en checkout |
|---|---|---|
| ADR-001 | Monolito Modular | README.md, LOGs/LOG.md |
| ADR-002 | PostgreSQL | LOGs/LOG.md, LOGs/Orge-LOG.MD |
| ADR-003 | Spring Boot + Spring Data JPA | LOGs/LOG.md, LOGs/Martinez-LOG.md |
| ADR-004 | React | LOGs/LOG.md, LOGs/CastellZiegler-LOG.md |
| ADR-005 | Flyway | LOGs/Denis-LOG.md, LOGs/Vidoni-LOG.md, LOGs/Orge-LOG.MD |
| ADR-006 | JWT + Spring Security | LOGs/Denis-LOG.md, LOGs/Vidoni-LOG.md |

Además, LOGs/Martinez-LOG.md (28/09/2026) registra **2 redacciones adicionales**,
concurrencia y versionado/colaboración Git/GitHub, sin ID ni texto completo visible.
No se les inventan ADR-007/008 ni estado de aprobación. El siguiente número explícito
verificable en el repositorio después de 006 es 007; si el registro externo del equipo
asignó ese ID a los borradores sin número, habrá que conciliarlo antes de aprobar.
La búsqueda adicional en Trello conectado no devolvió tarjetas ADR abiertas o archivadas;
no permite inferir que esos documentos nunca existieron.

No hay archivos completos de esos seis ADR en el árbol actual ni docs/decisions o
otro directorio previo de arquitectura/ADR. Sí existe en el historial el documento
`0002-postgresql.md` de raíz, commit e44f3f15a26faff73eac869e26f4015126e34586;
se retiró en 2cb2b3ab9f5e03479b951dc61846f07025609b8e (subida errónea).
Se leyó con git show, sin restaurarlo ni modificarlo. La localización de raíz retirada
no se presenta como directorio canónico vigente.

Convención acreditada: identificador de título ADR-NNN, nombre histórico de archivo
NNNN-slug.md (0002-postgresql.md); secciones Estado, Fecha, Contexto, Decisión,
Consecuencias positivas, Consecuencias negativas y Alternativas consideradas.
Los originales ausentes no permiten asegurar su formato byte a byte.

El nuevo documento NO era el primer ADR. Se corrigió a
`docs/adr/0007-actores-y-membresia.md`, título ADR-007, con esas secciones y estado
Propuesta implementada para revisión manual. Se conserva docs/adr como única ubicación
actual, sin inventar una segunda serie/carpeta. Se actualizaron README, membresías,
guía UI, aviso OpenAPI, este informe/manifiestos y la entrada actual de Vidoni.
El ADR-001 de Monolito Modular en README y las bitácoras históricas permanecen intactos.

`docs/openapi/DECISIONES.md` es otro registro de decisiones técnicas, no una serie ADR:
11 puntos técnicos de contrato, 12 temas P01-P12 de propuestas y trazabilidad D1-D20.
No se cuentan sus propuestas como 12 ADR aceptados ni se renumeran.
Membresías y guía UI registran reglas/decisiones de implementación, sin otra serie ADR.

La nueva decisión sí merece ADR: cambia identidad/autorización de forma transversal,
claims JWT, migración de datos y coordinación backend/frontend. Documenta alternativas
(mutación de rol, autoridad estable, aliases), costes y consecuencias, y complementa
ADR-005/006; no sustituye la arquitectura Monolito Modular del ADR-001.

### Infraestructura PostgreSQL: normal vs tests

Inspección real con docker inspect, sin arrancar ni eliminar recursos:

| Concepto | Desarrollo normal | Integración descartable |
|---|---|---|
| Proyecto Compose | fitzone_sports | Ninguno (sin labels Compose) |
| Contenedor | fitzone-postgres | fitzone-domain-test |
| Imagen | postgres:18 | postgres:18 |
| BD/puerto host | fitzone / 5432 | postgres / 127.0.0.1:55432 |
| Datasource | dev: jdbc:postgresql://localhost:5432/fitzone, salvo DB_URL explícita | PLAN_TEST_DB_URL en anotaciones de tests |
| Volumen | fitzone_sports_fitzone_pgdata (nombrado, Compose) | dce8e93c3333240b7b301f86ec3b3f9461f50170318796419b2f2846502e2c5e (anónimo) |
| Runtime obligatorio | Sí, o PostgreSQL equivalente configurado | No |

El nombre fitzone_sports corresponde al proyecto Compose; el nombre real de la BD
dev configurada es fitzone. No se renombra ni se cambia la conexión normal.
El contenedor normal estaba detenido al realizar esta inspección (exit 255); no se
arrancó ni alteró. El de tests estaba detenido con exit 0.

fitzone-domain-test fue creado manualmente por el asistente el 30/10/2026 a las
00:22:33 de Argentina para la verificación previa. Ni Spring, ni Maven, ni Docker
Compose, ni Testcontainers lo crean automáticamente. Es un nombre operativo de QA,
no una dependencia hardcodeada ni un patrón requerido de despliegue.

Sirve a PlanPersistenceTest (8), MembresiaIntegrationTest (18) y PagosIntegrationTest
(11): 37 tests PostgreSQL reales. Los tres exigen PLAN_TEST_DB_URL; sin variable se
omiten y no redirigen la aplicación. Usan staging en contexto de test, usuario postgres,
password vacío, sin seed dev. La aplicación normal no usa PLAN_TEST_DB_URL.

**Sí hay almacenamiento persistente anónimo**: la imagen PostgreSQL 18 declara
/var/lib/postgresql y Docker creó ese volumen aunque docker run no recibiera -v.
Sobrevive a docker stop; docker rm sin -v puede dejarlo huérfano. Es independiente del
volumen normal y no contiene las cuentas/compras de revisión manual de desarrollo.
No es correcto describir este contenedor como sin volumen o almacenamiento efímero.

Reproducción mientras existe (PowerShell desde raíz, variables sólo del proceso):

```powershell
docker start fitzone-domain-test
$env:PLAN_TEST_DB_URL = 'jdbc:postgresql://localhost:55432/postgres'
$env:JAVA_TOOL_OPTIONS = '-Duser.timezone=America/Argentina/Buenos_Aires'
.\mvnw.cmd test
Remove-Item Env:PLAN_TEST_DB_URL
```

Si se elimina después del cierre, puede recrearse con el comando original:

```powershell
docker run --name fitzone-domain-test -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55432:5432 -d postgres:18
```

La confianza sin contraseña queda limitada al puerto loopback de ese recurso de tests.
No se asigna DB_URL ni se configura esta instancia como dependencia de la aplicación.
Flyway y los fixtures reproducen el esquema/datos de pruebas; no necesitan retener
su volumen como fuente única. Los tests deben apuntar siempre a una BD descartable.

Limpieza propuesta sólo después de cerrar el refactor y cuando no se esté ejecutando
la suite: `docker rm -v fitzone-domain-test`. Elimina el contenedor detenido y su
volumen anónimo asociado. No se ejecutó. Se conserva fitzone-postgres y, especialmente,
fitzone_sports_fitzone_pgdata. La imagen postgres:18 es compartida: no se propone borrarla.
Los logs/informes/artefactos de target y capturas QA son resultados regenerables,
no componentes requeridos del runtime. En esta revisión no se borró ningún recurso.

Este ajuste fue documental: renombrado/formato del ADR y referencias. No se modificó
código, conexiones, Compose, tests ni datos. No se reejecutaron suites de aplicación;
se verifican referencias, coherencia de manifiestos y git diff --check. Siguen 48
archivos pendientes, índice vacío, misma rama y HEAD, sin commit/push/merge.


## V. Cierre aprobado y corte de commits (30/10/2026)

La revisión funcional y conceptual fue aprobada por el usuario. Se autorizan los dos
commits de T y su integración conjunta por fast-forward a la rama paraguas, sin push
ni merge a main. No se introducen funcionalidades ni cambios cosméticos nuevos.

- Commit dominio: `b5a7e9ca861ec1275d749bcd8e394eb564fcfabe`,
  `refactor(dominio): separar autoridad y estado de membresía`.
  Incluye 24 archivos: los 21 completos y los tres parciales de T. El único archivo
  frontend de este corte es AuthContext, por la validación de autoridades del JWT.
- Segundo corte: `refactor(frontend): integrar experiencia cliente y socio`.
  Incluye los 24 archivos completos y tres hunks restantes de T (27 archivos).
  DatosComprobante, ComprobanteService, renderer y sus pruebas PDF permanecen juntos
  en este corte: presentación/snapshot de la experiencia, sin cambiar contrato HTTP
  ni dividir artificialmente el backend M5. El hash se obtiene del historial Git.
- Ambos son una única migración funcional: no adoptar/desplegar uno por separado.
- ADR-007 aceptado; conserva explícita la conciliación pendiente con los dos
  borradores históricos sin identificador recuperado. No se cambia su decisión.

Verificación previa a los commits ejecutada en este cierre:

| Verificación | Resultado |
|---|---|
| Rama, índice inicial y diff | Rama correcta, índice vacío, diff --check 0 |
| Backend `mvnw.cmd -q verify` | Build/paquete correcto; 56 tests, 0 fallos/errores/omitidos |
| PostgreSQL integración | 37 reales: membresías 18, persistencia/migración 8, pagos 11 |
| Dominio/portal/comprobantes frontend | 77 aprobadas |
| Planes frontend | 16 aprobadas |
| Transporte JSON/PDF | 12 aprobadas |
| `npm run build` | Correcto |

Cobertura mínima revisada: Cliente con catálogo real, sin QR/comprobantes y con
contratación; Socio con períodos, renovación, QR, comprobantes/PDF; destinos Gerente
→ Planes y Recepción → acceso; ingreso/salida/aforo y aislamiento por sede en M2.
Esta etapa repite automatización, no afirma una nueva prueba con lector físico ni
compras manuales. Conserva la revisión manual aprobada de las etapas anteriores.

La validación del conjunto se repetirá después de los dos commits; sólo tras pasar
se integrarán ambos a feature/integracion-final-frontend. La comprobación de igualdad
de árboles y estado limpio se realizará antes de eliminar el recurso temporal.
Los resultados posteriores y hashes finales se entregan al usuario en el cierre.

La limpieza autorizada se limita a fitzone-domain-test y su volumen anónimo: se
comprobarán identidad, mounts y exclusividad antes de docker rm -v. El PostgreSQL
normal y fitzone_sports_fitzone_pgdata no se arrancan, borran ni modifican. Su estado
y configuración iniciales se guardaron fuera del versionado para contrastarlos.
No se crea ni se desarrolla Gerencia/Recepción después de esta integración.
