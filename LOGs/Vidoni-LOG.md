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
