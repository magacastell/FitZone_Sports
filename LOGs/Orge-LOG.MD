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
