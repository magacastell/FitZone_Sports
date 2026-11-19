# ADR-009 — Despliegue, contenerización y reversión de FitZone Sports

- **Estado:** Propuesto. El arranque integrado de desarrollo está implementado. La reversión y la restauración siguen en propuesta.
- **Fecha:** 2026-11-18 (redacción del ADR).
- **Autor:** Pendiente de confirmación por el equipo.
- **Sprint:** 8 (ventana docente de redacción). La asignación histórica de la decisión queda pendiente. [Planificación del TIF](../planificacion/planificacion-seguimiento-tif.md#L47-L66)

## Contexto

El proyecto necesitaba preparar un entorno reproducible para la demostración y definir cómo recuperar una versión anterior ante una falla. La arquitectura tenía un monolito modular Spring Boot, un frontend React/PWA y una base central PostgreSQL evolucionada con Flyway. También debía conservar identidades, membresías, accesos, reservas y pagos, junto con el historial del esquema. La operación offline de Recepción dependía además de la clave de firma de M2 y de la cola pendiente en el perfil del navegador. [ADR-001](ADR-001-tif-monolito-modular.md) · [ADR-002](ADR-002-tif-postgresql-e-integridad.md) · [Manual de operación, respaldo](../manuales/manual-instalacion-operacion.md#L168-L176)

La Unidad V exigía documentar despliegue, contenerización y reversión. Los lineamientos incluían entre las condiciones de entrega el arranque integral con `docker compose up --build`. La entrega también requería separar la configuración de desarrollo de la de un entorno compartido para evitar que ingresaran datos de demostración en bases de uso común. [Lineamientos §5.2.1, §5.4.1 y Anexo B](../arquitectura-tif.md#referencia-normativa-y-alcance) · [Manual de instalación, perfiles](../manuales/manual-instalacion-operacion.md#L78-L91)

## Alternativas consideradas

La comparación se presenta para revisión del equipo. Los antecedentes documentan la puesta en marcha actual y la necesidad de integrar el despliegue.

| Alternativa | A favor | En contra | Por qué se descartó |
| --- | --- | --- | --- |
| PostgreSQL local o en Compose, API ejecutada por separado y frontend con Vite | Aprovecha el flujo de desarrollo existente y permite revisar cada componente por separado. | Requiere coordinar puertos, procesos y variables. Carece de arranque integral. | Se conserva para desarrollo. Por sí sola resulta insuficiente para la entrega integrada. |
| Compose integrado con PostgreSQL, imagen de API y servicio de frontend | Permite declarar redes, dependencias y artefactos en un manifiesto y ensayar el arranque de entrega en un entorno limpio. | Requiere configurar el proxy, la inicialización y los secretos del entorno. | Opción implementada para el arranque integrado de la entrega. |
| Base administrada y publicación independiente de API y frontend | Permite publicar cada artefacto por separado y delegar parte de la operación de base según el servicio contratado. | Agrega decisiones de proveedor, conectividad, credenciales, respaldo y compatibilidad entre versiones. | Diferida hasta confirmar qué infraestructura operará el equipo y con qué responsabilidades. |

## Decisión

El entorno integrado de entrega usa Compose y conserva la alternativa de arrancar cada componente por separado. Para la reversión se propone identificar la imagen o JAR de backend, el `dist/` de frontend y la versión Flyway de cada entrega y comprobar su compatibilidad antes de volver a una versión anterior.

### Despliegue de desarrollo vigente

| Componente | Organización actual |
| --- | --- |
| **PostgreSQL** | Compose inicia PostgreSQL 18, persiste la base local `fitzone` en el volumen `fitzone_pgdata` y comprueba disponibilidad con `pg_isready`. [Compose](../../docker-compose.yml) |
| **Backend** | El Dockerfile de dos etapas empaqueta el JAR con Maven Wrapper y lo ejecuta con Temurin 21. En Compose, la API inicia en `dev` una vez que PostgreSQL está disponible, se conecta a `postgres:5432` y sirve `/api/v1` en el puerto interno 3000. [Dockerfile](../../Dockerfile) · [Compose](../../docker-compose.yml) |
| **Frontend** | El Dockerfile compila React/PWA. Nginx sirve la SPA y reenvía `/api/` a `backend:3000` desde el mismo origen local, publicado por defecto en `http://localhost:8080`. [Dockerfile del frontend](../../frontend/Dockerfile) · [Nginx](../../frontend/nginx.conf) |
| **Automatización local** | `pruebas-backend.ps1` prepara PostgreSQL descartable, ejecuta Maven `clean verify` y recoge los reportes disponibles. `prueba-m2-offline.ps1` supervisa el escenario local E2E de M2. El frontend encadena sus suites con `npm test`. El árbol de este corte carece de workflows de GitHub Actions y de una definición versionada de otro pipeline CI/CD. La existencia de automatizaciones externas queda sin verificar. [Pruebas backend](../../scripts/pruebas-backend.ps1) · [E2E offline](../../scripts/prueba-m2-offline.ps1) · [Scripts npm](../../frontend/package.json) · [Manual técnico, CI/CD](../manuales/manual-tecnico.md#L219-L229) |

### Configuración y esquema

- **Backend.** Compose fija el perfil `dev` y los parámetros locales de conexión. Para habilitar M2 offline, la preparación inicial crea la clave RSA en `.env` y Compose la entrega al backend como `FITZONE_OFFLINE_PRIVATE_KEY`. Se conserva la misma clave entre arranques. Staging y producción requieren su propia conexión y secreto JWT. [Preparación M2](../../scripts/preparar-config-m2.mjs) · [Compose](../../docker-compose.yml) · [Manual de instalación](../manuales/manual-instalacion-operacion.md)
- **Frontend y base.** `VITE_API_URL` se define antes del build y vale `/api/v1` por defecto. Nginx mantiene frontend y API en el mismo origen. El despliegue público debe proporcionar HTTPS. Las variables `DB_*` configuran Spring y las `POSTGRES_*` inicializan PostgreSQL. [Cliente API](../../frontend/src/services/api.js#L1) · [Nginx](../../frontend/nginx.conf) · [Compose](../../docker-compose.yml)
- **Flyway.** V1–V16 se aplican desde `classpath:db/migration` y quedan registradas en `flyway_schema_history`. Sólo `dev` agrega `classpath:db/demo` y aplica V17 de demostración una vez. V16 requiere `btree_gist`. Flyway valida el historial y mantiene `clean` deshabilitado. Hibernate usa `ddl-auto=validate`. [Configuración Flyway](../../src/main/resources/application.properties#L22-L28) · [V16](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql) · [V17](../../src/main/resources/db/demo/V17__datos_demostracion.sql)

### Reversión de aplicación propuesta

1. Identificar la última versión utilizable y registrar qué llegó a publicarse. Conservar el SHA, la imagen identificada por digest o el JAR verificado, el `dist/` correspondiente, el perfil, la configuración no secreta y la versión Flyway de cada entrega. Registrar dónde se custodian los secretos por separado.
2. Si falla una entrega, revisar el error y el estado de las migraciones y preservar la base actual. Antes de volver al binario anterior, ensayar su arranque y sus recorridos de lectura y escritura contra una copia aislada del **esquema que quedó aplicado**. Si resulta compatible, volver a publicar el backend y frontend ya verificados y comprobar la actualización del service worker en un cliente existente. Preservar la clave de firma y la cola local de M2 durante el cambio.
3. Si el esquema alcanzado resulta incompatible, evaluar primero una corrección hacia adelante. Evaluar una restauración sólo con aprobación del impacto sobre la ventana de datos recuperables y un plan de conciliación. Los SQL V1–V16 evolucionan el esquema hacia adelante. El cambio de imagen, JAR o `dist/` conserva el esquema de PostgreSQL. El repositorio carece de migraciones inversas y de un script de reversión versionado. [Manual, migraciones y reversión](../manuales/manual-instalacion-operacion.md#L146-L166) · [Service worker](../../frontend/src/sw.js) · [Persistencia offline](../../frontend/src/services/offline/db.js)

### Respaldo y restauración propuestos

- **Antes de migrar.** Obtener una copia lógica de PostgreSQL con `pg_dump` en formato restaurable y guardarla fuera del volumen de operación, con acceso controlado. Registrar fecha de corte, versión PostgreSQL, versión Flyway y artefactos compatibles. Custodiar por separado la configuración, los roles necesarios y las claves JWT y RSA de M2. El volumen actual conserva datos al recrear el contenedor. La copia recuperable requiere una ubicación separada. [Compose](../../docker-compose.yml) · [Manual, activos de recuperación](../manuales/manual-instalacion-operacion.md#L168-L176)
- **Ensayo de recuperación.** Restaurar con `pg_restore` en una base vacía y aislada. Antes de habilitar tráfico, verificar historial Flyway, extensiones y restricciones, y contrastar registros de sedes, membresías, accesos, reservas y pagos. Arrancar el backend compatible y el frontend correspondiente y comprobar inicio de sesión, una lectura autenticada y sincronización offline. Registrar duración del ensayo, punto recuperado y procedimientos de custodia y acceso.
- **Riesgo de pérdida.** Un respaldo previo deja fuera las escrituras posteriores a su corte. Esto incluye pagos, reservas y accesos ya registrados. Las capturas de Recepción que siguen en IndexedDB requieren conservar el perfil y la sesión y reconciliar por separado. El estado del navegador y los secretos del proceso quedan fuera de la copia PostgreSQL. [Guía M2](../m2-offline.md) · [Manual, operación degradada](../manuales/manual-instalacion-operacion.md#L178-L205)

## Consecuencias

- **Positivas.** Compose reproduce el arranque local de los tres servicios. Flyway hace trazable la versión del esquema y los runners locales aíslan las pruebas de la base de desarrollo.
- **Negativas.** El arranque por separado requiere coordinar procesos, redes y variables. Las primeras ejecuciones de build pueden requerir descargar dependencias e imágenes. Una migración acumulada puede impedir el regreso al backend anterior, y una restauración puede dejar movimientos fuera del punto recuperado.
- **Deuda asumida.** Quedan pendientes el despliegue público HTTPS, la provisión de cuentas de personal fuera de `dev`, la custodia y retención de respaldos y el ensayo de restauración y reversión. Si se incorpora CI/CD, queda pendiente separar verificación local, publicación y autorización del despliegue. [Manual de instalación](../manuales/manual-instalacion-operacion.md) · [Manual técnico, CI/CD](../manuales/manual-tecnico.md#9-pipeline-cicd)

## Requisitos relacionados

- **Unidad V y §5.4.1 de los lineamientos.** Contenerización, despliegue, reversión y arranque integral de entrega. Compose cubre el arranque integral de desarrollo. [Referencia normativa](../arquitectura-tif.md#referencia-normativa-y-alcance)
- **RNF-01 y RF-04.** La recuperación del servicio debe preservar la capacidad offline de M2 y su resincronización cuando vuelve la conexión. El ADR propone comprobar continuidad con la clave persistente y la cola conservada. [ADR-003](ADR-003-tif-validacion-qr-offline.md) · [Manual de operación](../manuales/manual-instalacion-operacion.md#L178-L205)

## Verificación y aprobación pendiente

La revisión inicial del corte `8e0ba85` sólo verificó la configuración de PostgreSQL. La auditoría de `8dff436` comprobó el arranque de los tres servicios con `docker compose up --build`. En la revisión del 19/11/2026 se repitió el arranque con una copia limpia y PostgreSQL descartable. Con la clave local generada antes del arranque, Chrome pudo preparar la terminal, registrar un ingreso y un egreso sin conexión y sincronizarlos al reconectar. También se comprobaron ingreso y egreso online. Quedan por ensayar la restauración aislada y la compatibilidad de la versión anterior con una base migrada, y por aprobar el procedimiento de reversión.
