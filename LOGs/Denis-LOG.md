# Ignacio Denis

## Período 2 — Semana 1

### 18/09/2026

* **[S1] Investigación sobre Concurrencia (RN-02)** — *1.5 hs*
  * Investigó estrategias para garantizar la consistencia estricta en las reservas de canchas y evitar la sobreventa (*double booking*).
  * Evaluó el uso de restricciones de unicidad (`UNIQUE`) en PostgreSQL combinadas con bloqueo pesimista (`PESSIMISTIC_WRITE` / `SELECT ... FOR UPDATE`) en la capa de persistencia con Spring Data JPA.

* **[S1] Redacción de ADRs Pendientes** — *2.0 hs*
  * Redactó y estructuró formalmente los **ADR-005: Herramienta de Versionado y Migración de Base de Datos** y **ADR-006: Autenticación y Autorización basada en JWT con Spring Security** siguiendo la plantilla solicitada por la cátedra.

* **[S1] Planificación de la Estrategia Design First** — *1.0 hs*
  * Planificó el enfoque *Design First* para el desarrollo y desacoplamiento entre el Frontend (React) y el Backend (Spring Boot).
  * Definió las pautas para estructurar contratos OpenAPI 3.0 (YAML) y el estándar unificado para el manejo de errores mediante RFC 7807 (Problem Details).

### 23/09/2026

* **[S1] Definición de Estrategia Design First y Criterios Comunes de API** — *2.5 hs*
  * criterios comunes de API: semántica HTTP (Nivel 2 de Richardson), respuestas de error unificadas bajo RFC 7807 / RFC 9457 (`ProblemDetail`) y cabeceras de idempotencia (`X-Idempotency-Key`).

* **[S1] Definición de Estrategia de Concurrencia y Versionado de Base de Datos** — *2.0 hs*
  * Estrategia de concurrencia optimista (`ETag` / `If-Match`) para la modificación de turnos y bloqueos pesimistas para evitar la sobreventa (*double booking*).

* **[S1] Revisión de Diagramas C4 y Soporte Offline** — *1.5 hs*
  * Inconsistencia en C4 delimitando a `Usuario` como entidad base única con relación opcional hacia `Membresia`.
  * Componentes necesarios en C4 Nivel 3 para el Módulo M2 (Acceso al Gimnasio) para soportar la contingencia offline (caché local de socios y servicio de sincronización diferida).

  ### 28/09/2026

* **[S3] Inicialización y Configuración de Entorno Frontend (React + Vite)** — *1.5 hs*
  * Creación y estructuración de la aplicación en la subcarpeta `frontend` utilizando Vite.
  * Solución de errores de compilación por configuración en `vite.config.js` y verificación del servidor de desarrollo local (`npm run dev`).

* **[S3] Implementación de Manejo Inicial de Sesión y Autenticación** — *2.5 hs*
  * Creación e integración de `AuthContext` para la gestión global de la sesión y almacenamiento del token JWT en `localStorage`.
  * Desarrollo del componente `ProtectedRoute` y la vista `LoginPage` para proteger el acceso a las vistas principales del sistema.
  * Actualización del componente `Layout` para habilitar el botón funcional de cierre de sesión (*Logout*) y la persistencia de roles.

* **[S3] Control de Versiones y Sincronización Git** — *0.5 hs*
  * Gestión de ramas de trabajo (`front-ignacion`), resolución de *merges* locales con `main` y validación del grafo de commits en el entorno de desarrollo.


## Cierre de integración — noviembre de 2026

### 13/11/2026 — Integración frontend de M4 Canchas y M5 Pagos

- **Actividad:** Realicé la integración de los módulos M4 (Canchas Deportivas) y M5 (Pagos y Facturación) en el frontend React, trabajando en la rama `front-ignacio` para mantener aislados los cambios funcionales y evitar modificar directamente `main`.

- **Integración M4:** Desarrollé la grilla de canchas con selección de sede, consulta de disponibilidad y turnos, visualización de precios calculados por el backend, retención de turnos, reservas, pagos y cancelaciones. Incorporé también la pantalla de administración de canchas, incluyendo gestión de tipos, tarifas, turnos y mantenimientos.

- **Integración M5:** Adapté los servicios de pagos para consultar movimientos, procesar pagos de reservas y descargar comprobantes PDF. Separé el historial de comprobantes de membresías (`/comprobantes`) del historial general de pagos (`/pagos`), permitiendo consultar también los pagos de canchas sin requerir una membresía activa.

- **Navegación y permisos:** Actualicé las rutas y el menú de navegación para contemplar las vistas de cliente, recepción y gerencia, reutilizando los servicios y componentes existentes y respetando las restricciones del backend.

- **Idempotencia y transporte:** Adapté la prueba de transporte de M4 para verificar el envío obligatorio de `Idempotency-Key` UUID al reservar una cancha, conservando la protección frente a solicitudes duplicadas.

- **Pruebas:** Ejecuté `npm test`: las seis suites finalizaron correctamente, con 250 verificaciones aprobadas (18 API, 185 dominio, 16 Planes, 18 Actividades/M3-M4, 7 Gerencia y 6 Offline). Ejecuté también `npm run build`, que compiló correctamente con Vite 5.4.21 y transformó 2015 módulos.

- **Versionado:** Commit `b2a5252` — `Integracion frontend de canchas y pagos M4 M5`. Cambios publicados en GitHub en la rama `front-ignacio`.

- **Pendientes:** Queda realizar la validación funcional conjunta de las pantallas conectadas al backend en ejecución, especialmente los escenarios de reserva concurrente, pago aprobado/rechazado, comprobantes, cancelaciones y reembolsos.

- **Dedicación:** Completar con las horas efectivamente trabajadas; no se reconstruyeron horas retrospectivamente.
