# Bautista Orge Perilli

## Unidad I — Arquitectura

### 03/09/2026

- Revisó el ADR-002 correspondiente a la decisión de utilizar PostgreSQL como base de datos relacional.
- Contrastó la redacción del ADR con la consigna del caso FitZone Sports y con la definición técnica provista por la cátedra.
- Ajustó el contexto para reflejar la necesidad de integridad de datos, transaccionalidad en pagos y consistencia de reservas ante operaciones concurrentes.
- Dejó explícito que PostgreSQL no resuelve automáticamente la concurrencia, el rendimiento, la disponibilidad ni la escalabilidad, sino que estas características dependen del diseño de transacciones, restricciones, índices y decisiones arquitectónicas adicionales.
- Confirmó que PostgreSQL es una decisión establecida por la cátedra, por lo que no corresponde documentar motores alternativos como si hubieran sido evaluados por el equipo.
- Completó la fecha del ADR con 03/09/2026.

## Período 2 — Semana 1

### 22/09/2026

- **[S1 · BD] Diseño del modelo relacional inicial por módulos**
  - Revisó el modelo entidad-relación, claves, restricciones, nulabilidad, redundancias y relaciones de pagos.
  - Analizó mecanismos para evitar reservas duplicadas y turnos solapados mediante restricciones `UNIQUE`, bloqueo optimista y bloqueo pesimista.
  - Revisó la integración prevista con Spring Data JPA, PostgreSQL y migraciones versionadas mediante Flyway.
  - Avanzó en un modelo inicial consistente para comenzar el mapeo JPA y la creación del esquema.

### 25/09/2026

- **[S1 · BD] Revisión de correcciones del modelo relacional**
  - Verificó las correcciones de nulabilidad, el tipo `DATE` de los turnos, el índice único de la grilla horaria y la relación 1:N entre turnos y reservas.
  - Revisó la eliminación de atributos derivados y propuso calcular `sede.ocupacion_actual` a partir de los registros de acceso abiertos.
  - Identificó la necesidad de controlar la concurrencia entre reservas activas y bloqueos de mantenimiento sobre los mismos turnos.
  - Analizó la obligatoriedad de `usuario.sedeid` para clientes externos y la posible redundancia entre `usuario.sedeid` y `membresia.sedeid`.

- **[S1 · Arquitectura] Definición del versionado de base de datos**
  - Evaluó la necesidad de versionar y migrar el esquema de PostgreSQL.
  - Redactó el ADR-005 proponiendo Flyway como herramienta de migración integrada con Spring Boot.
  - Definió la ubicación, nomenclatura e inmutabilidad de las migraciones SQL versionadas.
  - Estableció el uso de `ddl-auto: validate` y comparó Flyway con Hibernate, Liquibase y scripts manuales.

### 28/09/2026

- **[S1 · BD] Implementación de Flyway y migraciones iniciales**
  - Implementó Flyway para versionar y aplicar los cambios del esquema PostgreSQL según lo definido en el ADR-005.
  - Incorporó las dependencias de Flyway para Spring Boot y PostgreSQL, configuró la ubicación y validación de las migraciones y dejó deshabilitadas las operaciones de limpieza desde la aplicación.
  - Reemplazó la modificación automática del esquema por Hibernate con `ddl-auto=validate`, de modo que Flyway sea la única herramienta responsable de modificar la base de datos.
  - Ajustó `V1__crear_esquema_inicial.sql` antes de su primera aplicación compartida: agregó el estado activo del usuario y corrigió tipos e índices para PostgreSQL.
  - Creó `V2__insertar_roles.sql` para cargar los roles obligatorios `SOCIO_ACTIVO`, `CLIENTE_EXTERNO`, `RECEPCIONISTA` y `GERENTE` en todos los ambientes.

- **[S1 · Backend] Alineación del módulo de autenticación**
  - Alineó las entidades `Usuario` y `Rol`, sus repositorios y el servicio de autenticación con los nombres, columnas y tipos del modelo de datos acordado.
  - Incorporó la entidad y el repositorio de `Sede`; el registro público ahora exige `dni` y `sedeId`, valida que la sede exista y asigna el rol `CLIENTE_EXTERNO` sin permitir elegir roles internos.
  - Actualizó el seed exclusivo de desarrollo para insertar una sede y cuatro usuarios ficticios asociados a los roles versionados por Flyway.
  - Ajustó Spring Security para conservar las respuestas HTTP correctas durante el despacho interno a `/error`.

- **[S1 · Verificación] Pruebas y documentación**
  - Eliminó el esquema SQL alternativo de `docs/schema.sql` y actualizó el README para documentar a Flyway como fuente única del esquema y explicar el procedimiento para futuras migraciones.
  - Verificó la implementación sobre una base PostgreSQL limpia con Java 21: Flyway aplicó `V1` y `V2`, Hibernate validó el esquema y el backend inició correctamente.
  - Comprobó que un segundo arranque no repite migraciones ya aplicadas y que Flyway utiliza `flyway_schema_history` para ejecutar solamente las versiones pendientes.
  - Probó el login, el registro válido, el rechazo de una sede inexistente y el rechazo de un email duplicado.
  - Confirmó que la base y el historial de Flyway persisten en el volumen Docker `fitzone_pgdata`, salvo que el volumen sea eliminado explícitamente con `docker compose down --volumes`.

## Período 3 — Backend API

### 04/10/2026

- **Revisión de documentación y alcance de la API**
  - Consultó la documentación compartida en Google Drive, incluyendo el documento de arquitectura y la definición de módulos, y contrastó su alcance con el repositorio.
  - Identificó los dos endpoints implementados de autenticación: `POST /api/v1/auth/login` y `POST /api/v1/auth/register`.
  - Revisó los roles existentes (`SOCIO_ACTIVO`, `CLIENTE_EXTERNO`, `RECEPCIONISTA` y `GERENTE`) y distinguió los permisos por rol de las condiciones de membresía y las reglas de negocio.
  - Registró que la definición de módulos considera al socio activo una condición de membresía; mantuvo los roles actuales sin modificar el esquema ni las migraciones.

- **Organización inicial de endpoints por módulo**
  - Incorporó inicialmente 18 rutas y amplió el esquema hasta completar 53 endpoints de negocio, además de los dos endpoints existentes de autenticación.
  - Organizó los controladores por usuarios, sedes, planes y membresías, accesos, clases, canchas y reservas, pagos y reportes.
  - Incluyó rutas para consultas personales, administración de sedes y planes, renovación de membresías, ingresos y salidas, asistencia a clases, listas de espera, turnos, mantenimiento, comprobantes y solicitudes de reembolso.
  - Definió las rutas como implementaciones pendientes: devuelven `501 Not Implemented` sin cuerpo cuando el usuario tiene permiso, sin consultar ni modificar datos.
  - Conservó el prefijo `/api/v1` y dejó pendientes los contratos de solicitud y respuesta, los filtros y la conexión de estas rutas con el frontend.

- **Autorización por roles y validaciones pendientes**
  - Agregó restricciones `@PreAuthorize` a los 53 endpoints de negocio utilizando la configuración existente de Spring Security y `@EnableMethodSecurity`.
  - Habilitó el acceso de `GERENTE` a todos los endpoints de negocio y separó las acciones de clientes y socios de las operaciones de recepción y administración.
  - Documentó las respuestas previstas: `401` sin autenticación válida, `403` para roles no permitidos y `501` para solicitudes autorizadas a las rutas pendientes.
  - Dejó para los servicios de cada caso de uso la verificación de propiedad de reservas, membresías, ofertas y pagos; la restricción de recepción a su sede; y la comprobación de vigencia de membresía y suspensiones de clases.
  - Aclaró que el acceso global del gerente no elimina las reglas de capacidad, horarios, precios, concurrencia ni devoluciones.
  - Dejó pendientes la definición de pagos asistidos y los permisos de recepción sobre pagos y reembolsos; no habilitó acceso de recepción a M5 en esta primera versión.

- **Pruebas y documentación**
  - Incorporó `EndpointAuthorizationTest` para verificar el acceso del gerente a todos los métodos, el rechazo de roles desconocidos y permisos representativos de clientes, socios y recepción.
  - Delimitó el alcance de esas pruebas: verifican autorización de métodos, sin probar solicitudes HTTP, validación de JWT ni reglas de pertenencia, sede o membresía.
  - Comprobó estáticamente que las 53 rutas poseen anotaciones de autorización y permiten el rol `GERENTE`; verificó el formato de los cambios con `git diff --check`.
  - Actualizó el README con el listado de endpoints, sus roles permitidos, las validaciones pendientes y el alcance de las pruebas.

- **Versionado y publicación**
  - Creó la rama `feature/bautista-first-endpoint-implementation` y conservó en ella los cambios de endpoints y documentación.
  - Registró el commit `b58ee7c`: `feat: agregar endpoints iniciales y autorización por roles`.
  - Publicó la rama en `origin` (GitHub) y configuró su seguimiento remoto.
  - Integró los cambios a `main` sin conflictos mediante el commit `a7504c3`: `merge: integrar endpoints iniciales y autorización por roles`, y publicó el resultado en GitHub.
  - Eliminó la rama de trabajo local y remota después de confirmar la integración en `main`.
