# Augusto Vidoni — bitácora individual

## Período 2 — Semana 1

### 23/09/2026

- **[S1] Revisión del flujo de trabajo y estado actual del proyecto — 1.0 hs**
  - Revisó la organización actual del equipo, las tareas asignadas y el flujo definido para trabajo colaborativo, revisión y cierre de tareas.
  - Analizó el historial del repositorio para comprender el uso actual de ramas, commits, Pull Requests y archivos de bitácora.
  - Identificó el flujo acordado para futuras funcionalidades: rama por tarea, commits, Pull Request, revisión de otro integrante y posterior integración a `main`.

- **[S1] Revisión técnica de ADR-005 y ADR-006 — 1.5 hs**
  - Revisó los borradores correspondientes a Flyway y autenticación con JWT + Spring Security.
  - Contrastó las decisiones propuestas con los ADR ya normalizados y con el estado actual del backend.
  - Detectó inconsistencias entre algunos detalles de los borradores y la implementación existente, especialmente en el uso de JWT, roles, `@PreAuthorize` y evolución del esquema de base de datos.
  - Diferenció decisiones arquitectónicas de detalles de implementación que pueden definirse posteriormente.

- **[S1] Formalización de ADR-005 — Flyway — 0.75 hs**
  - Formalizó la decisión de utilizar Flyway para versionar y ejecutar las migraciones de PostgreSQL.
  - Definió contexto, decisión, consecuencias y alternativas consideradas siguiendo el formato utilizado por los ADR existentes.
  - Dejó fuera de la decisión arquitectónica detalles de implementación todavía no resueltos, como la estrategia de `baseline`, la transición de bases existentes y el tratamiento definitivo de `data.sql`.

- **[S1] Formalización de ADR-006 — JWT + Spring Security — 0.75 hs**
  - Formalizó Spring Security como infraestructura de autenticación y autorización y JWT como mecanismo de autenticación stateless.
  - Ajustó el alcance del ADR para no fijar detalles innecesarios como los claims definitivos del token, `userId` o decisiones específicas del frontend.
  - Aclaró la diferencia entre autenticación y autorización y documentó la autorización por roles como una capacidad a implementar progresivamente.

## Período 3 — Semana 1

### 01/10/2026

- **[S2] Construir estructura base React modular y navegación — 2.5 hs**
  - Revisó la estructura React modular existente, las rutas y la navegación con los actores simulados SOCIO, EXTERNO, RECEPCION y GERENTE.
  - Ajustó los destinos de mantenimiento y reportes con placeholders explícitos y el cierre del QR con retorno a canchas; eliminó un proveedor de sesión redundante.
  - Mejoró la coherencia de la experiencia de navegación con iconografía consistente, estado activo, foco visible y estilos compartidos; corrigió el foco del modal QR, las etiquetas y el contraste del botón del login y el desbordamiento de la tabla de comprobantes en ventanas angostas.
  - Retiró las dependencias instaladas del control de versiones y excluyó `node_modules/`, `dist/` y `.vite/`, conservando los archivos de declaración y bloqueo de dependencias.
  - Verificó la instalación con `npm ci`, el build de producción y las rutas en navegador, incluyendo navegación con teclado y vistas desktop y angostas.
  - Documentó en `frontend/README.md` la ejecución local, estructura, rutas, navegación y límites de los datos simulados y funcionalidades pendientes.

### 06/10/2026

- **Cierre de la tarjeta de contratos API/OpenAPI - 4 hs**
  - Consolidó en la rama `docs/openapi-contratos` el contrato de las 55 operaciones existentes de FitZone Sports.
  - Separó el estado de implementación (`implemented`/`stub`) de la madurez del contrato (`stable`/`draft`).
  - El resultado final comprende 10 operaciones implemented, 45 stub, 11 contratos stable y 44 draft.
  - Documentó en `docs/openapi/DECISIONES.md` las decisiones todavía no confirmadas para revisión del equipo, diferenciándolas de la evidencia del proyecto y las decisiones técnicas del contrato.
  - Validó OpenAPI con Redocly sin errores; quedaron únicamente las advertencias conocidas de licencia y servidor localhost.
  - No modificó backend, frontend, migraciones ni persistencia; el alcance se limitó al contrato, sus decisiones, los enlaces del README y esta bitácora.
  - Dejó el trabajo listo para revisión mediante Pull Request.

### 12/10/2026

- **Revisión final del contrato contra main actualizado**
  - Integró `origin/main` en `docs/openapi-contratos` sin conflictos y revisó la implementación nueva de planes de membresía.
  - Alineó GET/POST/PATCH/DELETE de planes con sus DTO, precio decimal en ARS, duraciones 1/3/12, permisos, validaciones, filtro de inactivos y baja/reactivación lógica.
  - Recalculó la cobertura: 56 operaciones, 14 implemented, 42 stub, 15 stable y 41 draft; conservó las decisiones funcionales todavía pendientes.
  - Verificó YAML sin claves duplicadas, referencias resolubles, operationId únicos, cobertura de controllers, trece DTO y seguridad; Redocly terminó sin errores y con las dos advertencias conocidas.
  - Ejecutó las pruebas: 12 aprobadas y 7 de persistencia omitidas por no configurar una base PostgreSQL vacía y descartable; sin fallos ni errores.
  - Limitó las correcciones a OpenAPI, decisiones, README y esta bitácora; no modificó código funcional, migraciones ni configuración.

### 29/10/2026

- **[S4] Integración frontend de perfil y membresía — 2.0 hs aproximadamente**
  - Integró el frontend de M1 con los endpoints reales de perfil, membresía y planes, reemplazando la información simulada e incorporando contratación y renovación manual.
  - Trabajó el manejo de errores y la idempotencia para evitar operaciones duplicadas, conservando la intención de renovación mediante `sessionStorage` frente a recargas.
  - Compartió el estado real de membresía con la navegación y ajustó Mi QR para que dependa de una membresía `ACTIVA`, no únicamente del rol del usuario.
  - Verificó el comportamiento con pruebas aisladas temporales, build frontend y revisión manual básica. No pudo completar manualmente la contratación contra PostgreSQL porque no había planes activos ni una UI administrativa de planes disponible; las pruebas aisladas utilizaron servicios simulados.
  - Durante la revisión manual detectó problemas generales de navegación, datos simulados y coherencia entre módulos, que quedaron fuera de esta tarea para abordarlos por separado.
  - Commits funcionales: `65e1d54`, `9617656`, `117a6f0`, `05c312c`, `355ec45` y `7802bac`.

### 30/10/2026

- **Integración final — revisión de dominio Cliente/Socio, Canchas y comprobantes**
  - Separó autoridad estable USUARIO de la condición Socio derivada de membresía; documentó decisión en ADR-007 y verificó migración V7, JWT y permisos sin mutar rol al contratar/vencer.
  - Conservó contratación/renovación M1/M5 fake, idempotencia y validación QR M2; diferenció catálogo Cliente y Portal Socio con datos reales.
  - Auditó Canchas/Clases: continúan stub; ocultó capacidades no integradas y mantuvo pantallas honestas sin tarifas/descuentos ni reservas ficticias.
  - Integró comprobantes de períodos reales con descarga autorizada, cards, importes argentinos, estados recuperables y feedback temporal. Mejoró nuevas emisiones PDF preservando documentos existentes y snapshots; explicitó límites del listado y de pagos antiguos sin PDF.
  - Ejecutó 56 tests backend (37 con PostgreSQL aislado), 77 verificaciones frontend de dominio/portal/comprobantes, 16 de Planes y 12 de transporte; builds frontend/backend correctos.
  - Repitió contratación y renovación fake por UI, descarga PDF real y revisión responsive. La auditoría previa quedó sin commit, push ni merge. El cierre fue aprobado para dos commits locales según la sección T de docs/refactor-actores-verificacion.md, con integración conjunta a la rama paraguas y sin push ni merge a main.

- **Recepción — composición v0 e integración M2 (pendiente de revisión manual)**
  - Auditó relación de usuario/sede, JWT y permisos; conservó sede única y restricciones backend, sin nueva decisión de arquitectura ni cambios a permisos.
  - Portó scanner, Ingreso/Salida, resultado y aforo al sistema visual existente, con servicio M2, bloqueo inmediato, cleanup y refresco sin optimismo.
  - Omitió movimientos ficticios y módulos 501; conservó Perfil, identidad real y selección existente de Gerente sin rediseñarlo.
  - Ejecutó 62 tests backend (43 PostgreSQL), 97 verificaciones de dominio/portal/Recepción, 16 de Planes y 13 de transporte; builds correctos. Probó un ingreso/salida real y aforo 0→1→0, teclado y responsive.
  - Documentó contrato y limitaciones en docs/m2-recepcion.md. Sin tiempo estimado, commit, push ni merge.


- **Sede habitual durante primera contratación — pendiente de revisión manual**
  - Eliminó sede hardcodeada del registro; perfil nullable, elección real al contratar y origen histórico de membresía, sin restringir multisede.
  - Agregó V8/V9 preservando datos/FK y sede obligatoria del personal; documentó corrección forward-only por aplicación automática inicial de DevTools, sin repair ni downgrade.
  - Conservó transacción M1/M5, rollback de pago, idempotencia plan+sede, recuperación por sesión y renovación sin reasignación; reutilizó lectura autenticada de sedes.
  - Verificó 69 tests backend (50 PostgreSQL), 111 de dominio/portal/Recepción, 16 de Planes y 14 de transporte; builds correctos. E2E con nueva cuenta, contratación fake, QR, PDF y F5; segunda cuenta Cliente para revisión.
  - Actualizó P12, OpenAPI, membresías e informe de integración. Sin tiempo/hash/PR inventados; sin commit, push ni merge.

- **Ciclo Cliente/Socio — pendiente de revisión final**
  - Auditó vencimiento derivado, sincronización existente, suspensión administrativa y renovación max(último fin, ahora); conservó backend, V1–V9, sede, multisede e idempotencia.
  - Diferenció Cliente nuevo, ACTIVA, VENCIDA y SUSPENDIDA; recuperó plan/vigencia histórica y agregó aviso visual <=7 días sin falsa urgencia cuando hay continuidad programada.
  - Ejecutó 73 tests backend (54 PostgreSQL aislado), 119 frontend de dominio/portal/Recepción, 16 Planes y 14 transporte; builds correctos y diff sin errores de whitespace.
  - Probó contratación, renovación anticipada/vencida, QR real, perfil, comprobantes y F5 por UI/HTTP; replay sin duplicados. Revisó responsive 390/768/1024/1280/1440.
  - Conservó cuentas locales de fixture identificadas para revisión; respaldo previo, sin alterar datos anteriores. Eliminó sólo PostgreSQL temporal de tests y su volumen exclusivo. Documentó preparación y límites en docs/ciclo-vida-membresia-verificacion.md.
  - Sin commit, push ni merge; sin tiempo, hash o PR nuevos inventados.

- **Cierre Cliente/Socio aprobado**
  - Revisión funcional y visual aprobada por el responsable. Separación autorizada en backend/DB y experiencia frontend/documentación, con integración conjunta a la rama paraguas.
  - Las entradas previas conservan los resultados y el estado histórico anterior al cierre. No se agregan funciones ni cambios cosméticos; sin push ni integración a main.

- **Cierre definitivo de la rama de integración frontend**
  - Partió de `65e0eff7da819f68d7c0c0eb5b4ca8830be86070` en `feature/integracion-final-frontend`, con índice vacío y doce archivos de Gerencia pendientes. Cerró ese bloque en `d5bb461`: Panel actual, Sedes, Usuarios/Membresías, Reportes preparados y separación del puesto de Recepción, sin backend nuevo.
  - Contrastó el aporte completo con la base de creación verificable `3ee92e88b2e66e4e25b43b5e5f6c597af175e201`. Preparó `docs/integracion-final-frontend.md` con decisiones, alcance por actor, trazabilidad y pendientes M3/M4/reportes, sin atribuirlos como terminados.
  - La limpieza se limitó a documentación: README actualizado, estados de cierre y evolución posterior de navegación aclarados en informes/guía/ADR. No cambió la decisión ADR-007 ni su conciliación histórica pendiente. No encontró una necesidad objetiva de borrar código o refactorizar componentes.
  - Ejecutó las cinco suites frontend existentes: 140 dominio/UI, 16 Planes, 14 transporte, 18 M3/M4 y 7 Gerencia; 195 aprobadas. Build frontend correcto; sin nuevos tests, dependencias o runners en este cierre.
  - Backend `mvnw.cmd verify`: 73 tests, cero fallos/errores/omitidos; 54 PostgreSQL reales (35 membresías/M2, 8 persistencia/migraciones, 11 pagos). Empaquetado/repackage correcto. Usó JDK 22.0.1 local con target 21 y zona America/Argentina/Buenos_Aires.
  - El primer empaquetado falló por el JAR abierto en Windows, después de pasar los tests. Detuvo únicamente el backend local, repitió verify completo y lo reinició con la misma zona horaria y seed desactivado. No hubo cambios funcionales para resolverlo.
  - Eliminó únicamente fitzone-cierre-test y su volumen anónimo, previa comprobación de exclusividad. Identidad/montaje de fitzone-postgres y fitzone_sports_fitzone_pgdata intactos; BD normal en V9 aceptando conexiones. No ejecutó fixtures ni pruebas contra la BD normal.

  - `git diff --check` correcto. Capturas, logs y respaldos locales permanecen ignorados; no se incluyen en Git. No agregó tiempo, PR ni hashes aún inexistentes. El pedido autoriza publicar sólo esta rama sin force push; no autoriza integrar a main.

### 07/11/2026 — cierre local de RF-01/RF-02

| Campo | Registro |
|---|---|
| Sprint y unidad | Cierre de integración M1 / testing e integración. Numeración de sprint/unidad pendiente de cotejar con la planificación del equipo. |
| Actividad | Implementé edición de nombre/apellido, foto obligatoria en el alta y reemplazo desde Perfil; completé la UX de renovación y el refinamiento visual aprobado. Conservé los cambios locales en una rama derivada de 03f904e. |
| Decisiones | Usé una tabla binaria en PostgreSQL para la foto, con V10 nueva, validación PNG/JPEG y lectura propia autenticada. Reutilicé DTO, servicios y componentes; conservé períodos, PDF e idempotencia. La foto no depende de contratar una membresía. |
| Problemas y soluciones | Resolví el nombre desactualizado del encabezado y el flujo multipart. Como faltaba JDK, compilé y ejecuté Spring Java 21 en Docker; normalicé CRLF/permisos de mvnw dentro de la imagen. Preparé PostgreSQL aislada y respaldo previo a V10. Probé una respuesta de pago perdida mediante un proxy temporal para verificar F5/reintento sin duplicar. |
| Pruebas | Pasaron 181 verificaciones frontend, 17 de transporte y 6 tests Java focalizados. Ejecuté 21 verificaciones HTTP contra Spring/PostgreSQL reales, incluido el job automático. Comprobé foto persistente tras reiniciar Spring, registro/edición/reemplazo por navegador y responsive en 360/390/430/768/1440. El reintento tras perder el 201 dejó exactamente dos períodos y dos pagos. Build y diff correctos; sin suites completas. Evidencia y límites en el informe RF-01/RF-02. |
| Pendientes | Revisar en equipo multipart/V10 antes de integrar y confirmar numeración de sprint/unidad. No inventé reglas para huecos entre períodos ni convertí planes de manera retroactiva. |
| Commits | `cc8b5aa` — `feat(m1): completar perfil con foto y experiencia de membresías`. Consolidé documentación y bitácora en el presente commit documental, con autorización para ambos commits locales. No hice push, merge ni rebase; no modifiqué las referencias de integración/main. |
| Horas | Aproximadamente 3 horas efectivas, confirmadas por mí como responsable al responder en esta sesión; no reconstruí horarios ni modifiqué fechas históricas. |

Conservé las entradas históricas anteriores tal como estaban; no completé hashes, horas ni decisiones que no pudiera verificar. La ubicación canónica pasa a docs/bitacoras/LOG-vidoni.md; la ruta anterior sólo redirige a ella.


### 09/11/2026 — cierre focalizado M1 y compatibilidad M2 online

| Campo | Registro |
|---|---|
| Sprint y unidad | Numeración pendiente de confirmar con la planificación. Corrección y pruebas de integración M1/M2 online. |
| Actividad | Verifiqué repositorio, fetch y ausencia de cambios superpuestos. Creé fix/cierre-m1-m2-online desde 08ecb29. Corregí el 401 tardío y la traducción de DNI duplicado; actualicé sólo OpenAPI y el informe existente. |
| Decisión | Conservé la restricción única SQL y traduje sólo unicidad conocida de DNI/email. Dejé foto del titular en Recepción y campo administrativo pendientes de aprobación porque afectan contratos compartidos. No modifiqué M2 ni su política de sede. |
| Problema y solución | Una respuesta 401 antigua borraba el token nuevo: agregué comparación con la sesión actual. DNI duplicado escapaba como excepción de integridad: lo reproduje antes de corregir contra PG aislada. Ambos tests de regresión fallaron antes de las correcciones. |
| Pruebas | Pasaron 18 de transporte, 181 dominio/UI, build Vite y 22 tests Java seleccionados sin fallos, errores ni omitidos. Spring/MockMvc contra PG 18 nueva en tmpfs y Java 21 en Docker. Ver detalle y límites en docs/rf01-rf02-experiencia-verificacion.md. Sin suite completa ni nuevo ensayo navegador/proxy de respuesta perdida. |
| Commits | `975a827` — `fix(m1): preservar la sesión y traducir conflictos de registro`. El cierre documental se registra en el segundo commit local autorizado. Verifiqué la agrupación antes de cada commit; sin push, PR, merge ni rebase. |
| Horas efectivas | Pendientes de confirmación; no reutilicé las aproximadamente 3 horas de la sesión anterior. |


### 09/11/2026 — auditoría y depuración de pruebas automatizadas

| Campo | Registro |
|---|---|
| Sprint y unidad | Numeración de sprint pendiente de confirmar; testing e integración, sin asignar una unidad numérica no cotejada con la planificación. |
| Actividad | Audité las cinco suites frontend y las trece clases backend desde e4fe538. Reparé el doble AvatarCircle de Planes, retiré cinco helpers y un import sin usos y una variante de datos idéntica. Conservé todos los callbacks y los 81 métodos JUnit. Dejé opcional la exportación visual PDF/PNG, manteniendo las aserciones de contenido y paginación. |
| Decisiones | Agregué npm test con propagación de fallos, runner Java 21/PG 18 aislado y JaCoCo sin exclusiones artificiales ni umbral inventado. Conservé el test largo de PDF y pospuse la reescritura de los harness VM. Documenté inventario, matriz RF/RN/RNF y selección de suites en docs/pruebas.md, sin cerrar ADR-008. |
| Problemas y soluciones | Planes tenía 13 casos aprobados y tres fallidos porque el mock no exportaba AvatarCircle. Tras repararlo pasaron los 16. El fallo anterior de comillas entre PowerShell, Docker y sh no era un defecto backend: lo evité enviando el cuerpo del runner por stdin. La suite backend inicial y final pasó completa. |
| Pruebas y evidencia | Backend: 81 tests, cero fallos, errores u omitidos, con PG descartable y Java 21. Comparé los nombres de los casos antes/después: se conservaron los 81. Frontend: 18 transporte, 181 callbacks de dominio/UI, 16 Planes, 18 contratos M3/M4 y 7 verificaciones Gerencia, todos correctos; no los equiparé a assertions ni E2E. Build correcto. JaCoCo: 748/886 líneas (84,42 %) y 281/378 ramas (74,34 %). Reportes generados bajo target, sin versionarlos. No había porcentaje anterior comparable ni medí cobertura JS. |
| Cierre | Revisé la cadena de integración y reutilicé los resultados aplicables. La publicación a main está autorizada por el responsable, con verificación del HEAD remoto como condición. No se implementaron A/D, offline, M3/M4 ni funciones nuevas; A/D siguen sujetos a coordinación. |
| Commits | eb85ed2 — test: corregir el mock de Planes y separar la exportación visual; 1e4afc5 — test: unificar ejecución y generar cobertura reproducible. Esta entrada completa el registro documental de la tarea. |
| Horas efectivas | Pendientes de confirmación. No imputé horas estimadas ni reutilicé las tres horas del trabajo anterior. |

### 09/11/2026 — cierre funcional de M1 y M2 online

| Campo | Registro |
|---|---|
| Sprint y unidad | Numeración pendiente de confirmar con la planificación; cierre funcional y pruebas de M1/M2 online. |
| Actividad | Partí de main f8c6c7f con working tree limpio y creé fix/cierre-definitivo-m1-m2-online. Resolví A: Recepción muestra la foto canónica del socio validado. Resolví D: el PATCH administrativo rechaza foto textual no nula. Expuse la salida por número de ingreso que ya admitía el backend y agregué regresiones focalizadas. |
| Decisiones | Reutilicé titular.foto en la respuesta autorizada de ingreso/egreso, PNG/JPEG inline y no-store, sin nueva consulta pública o por usuario arbitrario. Acepté el costo de base64 de hasta unos 2,8 MB por imagen de 2 MB. Conservé foto administrativa omitida/null, permisos por sede, ingreso multisede y migraciones inmutables. Documenté el cambio incompatible para quien escribía foto textual y preparé docs/defensa-m1-m2-online.md con referencias reales. |
| Problemas y soluciones | La UI no permitía egresar por ID tras vencer el QR: agregué ese modo al flujo existente, con validación y número en la confirmación. La primera corrida de cuatro tests backend tuvo dos errores de cleanup por filas de acceso confirmadas fuera de transacción; limpié sólo sus fixtures de acceso/QR. La nueva aserción frontend del ID falló por espacios introducidos por el harness al extraer JSX; ajusté esa comparación conservando el contrato enviado. |
| Pruebas y evidencia | Cuatro regresiones backend focalizadas aprobadas y luego suite completa con Java 21/PG 18 aislada: 85 tests, cero fallos, errores u omitidos. Foto del socio y egreso por HTTP real; PATCH administrativo por MockMvc/PG; RN-01 con dos transacciones concurrentes en distintas sedes. npm test: 18 API, 185 dominio/UI, 16 Planes, 18 Actividades y 7 Gerencia aprobados; build Vite correcto. JaCoCo: 774/892 líneas (86,77 %) y 287/376 ramas (76,33 %). Reportes locales y límites en docs/pruebas.md; diff --check correcto. |
| Alcance y pendientes | No implementé offline/sincronización, listados/corrección de accesos 501 ni módulos ajenos. No repetí revisión de navegador, proxy de respuesta perdida o reinicio de persistencia: son evidencias históricas. No renumeré ADR-007 ni definí reglas nuevas para huecos de períodos. El responsable autorizó integrar y publicar main tras validar referencias y ausencia de conflictos, sin rebase, squash, force push ni tag de entrega. |
| Commits | `d294674` — `fix(m1-m2): mostrar la foto del socio y completar el egreso online`. La documentación, esta entrada y la guía de defensa se consolidan en el commit documental posterior. |
| Horas efectivas | Pendientes de confirmación; no estimé una duración ni reutilicé las tres horas confirmadas del 07/11. |

### 09/11/2026 — implementación y demostración de M2 offline

| Campo | Registro |
|---|---|
| Sprint y unidad | Numeración pendiente de confirmar con la planificación del grupo. M2 offline, pruebas e integración; no asigné un sprint ni una unidad numéricos no verificados. |
| Actividad | Hice fetch y creé feat/m2-offline desde origin/main e0056b1 limpio. Implementé por etapas QR preemitidos RS256, terminal principal por sede, copia acotada por preparación del socio, PWA/IndexedDB, registro transaccional local y reconciliación con PostgreSQL. Conservé M1/M2 online y no trabajé en otros módulos. |
| Decisiones | Ventana de dos horas aprobada para el MVP, reloj controlado con límite de 30 segundos sin extender exp/nbf, clave RSA persistente exclusiva del servidor, sin fotos/contraseñas en el snapshot. Elegí Dexie, jose y precaché Workbox compatibles con el stack. Descarté workbox-build por nuevas alertas en dependencias. Priorizamos admisión provisional y conflictos auditados; no prometí RN-01 global bajo partición. |
| Problemas y soluciones | Corregí imports de Jackson 3 y validación de DTO anidado al compilar. Las pruebas detectaron una lectura JPA que descartaba el egreso sin flush, el ID de caché sobrescrito por el lote y un guard booleano usado como ref: corregí código y mantuve expectativas. Un aborto nativo de Node 24.15.0 motivó un supervisor PowerShell que limpia incluso si Node no ejecuta finally; usé Node 24.22.1 disponible sin instalarlo globalmente. Mantuve la pérdida de respuesta de prueba hasta liberar el ACK porque Chrome podía reintentar automáticamente. |
| Pruebas y evidencia | Backend completo Java 21/PG 18 aislada: 94 tests, cero fallos, errores u omitidos; JaCoCo 943/1083 líneas (87,07 %) y 400/570 ramas (70,18 %). npm test, ahora con script offline, y build PWA correctos. Pruebas VM/fake-indexeddb distinguidas de MockMvc/PG y E2E real. La E2E final eec4c370-3ead-4fa4-967d-d954fcbbb9e3 preparó ambos clientes, pausó Spring y cortó red 65 s, probó rotación y rechazo del anterior, ingreso persistente, reapertura de Chrome sin conexión, egreso, reinicio de Spring, ACK perdido y replay: una visita cerrada, dos eventos y cero duplicados. Sin overflow a 390 px. XML, JSON y capturas locales bajo target; informe en docs/m2-offline.md y docs/pruebas.md. |
| Commits reales | 9439872 — credenciales QR; 84f0aab — preparación de terminal; 4a63b89 — movimientos locales; 27e2ce4 — sincronización; a35f790 — recuperación, clave persistente y controles finales. El runner reproducible y la documentación se consolidan en el commit de pruebas posterior. |
| Limitaciones y cierre | Un terminal/operador por sede, preparación previa, navegador administrado y suspensión desconocida hasta actualizar copia. Conflictos conservados para revisión, sin consola administrativa nueva. Advertencias npm preexistentes sin ampliar; no actualicé todo el stack. Documenté correspondencia con ADR-003/007 sin renumerar los del equipo. No hice merge, push ni tag y preservé main y las ramas anteriores. |
| Horas efectivas | Pendientes de confirmación; no inferí horas a partir de la duración del chat ni reutilicé las tres horas del 07/11. |

En la pasada final preservé la presencia local conflictiva al renovar la copia y
evité dejar un egreso esperando indefinidamente un ingreso ya rechazado; agregué
regresiones sin borrar la evidencia. La sonda de conexión reutiliza VITE_API_URL.
La ejecución final figura en UTC como 10/11 00:09, correspondiente al 09/11 21:09
local; mantuve la fecha local de esta actividad y los timestamps originales del runner.

### 09/11/2026 — revisión final e integración de M2 offline

| Campo | Registro |
|---|---|
| Sprint y unidad | Numeración pendiente de confirmar; revisión de calidad, configuración e integración de M2. |
| Actividad | Verifiqué feat/m2-offline e5769c8, sus seis commits y el diff con origin/main e0056b1, sin cambios locales ajenos. Revisé autenticación/sede, idempotencia, conflictos, migraciones y evidencia E2E, sin otra auditoría general. |
| Decisiones | Reutilicé backend/E2E porque no cambió código funcional. Preparé .env.example y un generador explícito de JWT/RSA persistentes que no rota valores existentes; excluí secretos del contexto Docker y de Git. Documenté carga de variables por proceso y la dependencia exacta del futuro Compose backend/frontend, sin rediseñarlo. |
| Problema y solución | El porcentaje de ramas parecía una regresión: comparé XML por clases/métodos. Las anteriores conservan 287/376 (76,33 %); offline agrega 113/194 y el total es 400/570 (70,18 %). No borré casos ni agregué pruebas para subir la cifra. La clave dependía de instrucciones de entorno manuales: ahora existe una plantilla reproducible del proyecto y validación sin sobrescritura. |
| Pruebas y evidencia | Revalidé los XML de 94/94 y resultado.json/capturas de la E2E eec4c370-3ead-4fa4-967d-d954fcbbb9e3: caída, rotación, reapertura, reinicio, ACK perdido y replay. Repetí npm test (seis suites) y build, correctos. Probé RSA PKCS8 de 2048 bits, dos ejecuciones sin cambiar claves y rechazo de configuración inválida conservando el archivo. Diff correcto; sin tocar BD ni volúmenes de desarrollo. |
| Commits | e5769c8 cierra la implementación/pruebas previas. Esta entrada acompaña el commit de configuración y revisión posterior; no inventé su hash antes de crearlo. El responsable autorizó fast-forward o merge normal y publicación de main sólo tras verificar referencias y compatibilidad; sin squash, rebase, force push ni tag. |
| Pendientes | Docker Compose global, resolución operativa de conflictos y numeración grupal de ADR. Se conservan la ventana de dos horas y la limitación RN-01 durante partición. |
| Horas efectivas | Pendientes de confirmación; no deduje horas de la duración del chat ni reutilicé tiempos de otras tareas. |

### 10/11/2026 — QR automático y autorización multisede de M2

| Campo | Registro |
|---|---|
| Sprint y unidad | M2 — Gimnasio y Control de Acceso. Numeración académica pendiente de confirmación. |
| Actividad | Como responsable de M2, evolucioné el acceso offline en una rama nueva desde main 78caf99. Mi QR obtiene y guarda credenciales automáticamente; Recepción admite un socio nuevo sin descargar previamente su identidad y actualiza su copia mientras tiene conexión. |
| Decisiones | Reutilicé RS256, jose, Dexie, Workbox y la reconciliación existente, sin dependencias nuevas. Autorización multisede limitada a períodos pagados y dos horas, clave confiable aprovisionada al terminal, audiencia/kid y jti de un solo ingreso. Conservé los formatos anteriores y agregué V14 sin editar migraciones aplicadas. |
| Problema y solución | La copia por socio/sede impedía admitir altas posteriores al corte. La autorización comercial viaja firmada en el QR y el terminal aporta su sede/operador, bloqueos y presencia conocidos. V14 comparte la detección de reutilización entre lector online y sincronización. Se mantiene explícita la revocación diferida y la imposibilidad de garantizar RN-01 global durante una partición. |
| Verificaciones | Backend completo: 101/101, sin omitidas; seis suites frontend y build PWA correctos. E2E real Chrome/Spring/PG: alta posterior al corte, QR automático, admisión sin padrón, rotación, reapertura offline, ACK perdido, replay y actualización automática de la copia; dos visitas y cuatro eventos sin duplicados. Reportes, cobertura y fallos previos documentados en docs/pruebas.md. Contenedores temporales eliminados sin tocar volúmenes de desarrollo. |
| Commits | 4da0a00 — autorizaciones verificables y V14; 769cafc — QR automático y actualización del terminal. Pruebas E2E y documentación acompañan esta entrada en el commit de cierre. |
| Pendientes | Revisión antes de integrar/publicar. Reaprovisionar terminales a versión 2; mantener clave persistente y aplicar el procedimiento de rotación con pendientes conciliados. ADR-003/007 pendientes de preparación grupal, sin renumeración unilateral. |
| Horas efectivas | Pendientes de confirmación. |
