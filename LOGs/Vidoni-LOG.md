# Augusto Vidoni

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
