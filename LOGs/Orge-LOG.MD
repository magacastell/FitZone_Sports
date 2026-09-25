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
