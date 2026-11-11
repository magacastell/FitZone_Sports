# Manual de instalación y operación de FitZone Sports

**Trabajo Integrador Final de Programación V**  
**Versión:** 0.1 · **Fecha:** 11/11/2026  
**Base:** rama `docs/cierre-tif`, commit `b6323ac91ab5537fb543f073e24df1f4e0d9af1e`.

Este manual sigue el Anexo E de los Lineamientos de Entrega, página 21. Los pasos se contrastaron con el repositorio. Los resultados indicados son condiciones esperadas, ya que no se ejecutaron instalaciones, arranques ni pruebas operativas para esta edición. El [Manual Técnico](manual-tecnico.md) detalla el alcance funcional y los módulos pendientes.

## Índice

1. [Requisitos previos y versiones exactas de software](#1-requisitos-previos-y-versiones-exactas-de-software)
2. [Puesta en marcha en entorno de desarrollo](#2-puesta-en-marcha-en-entorno-de-desarrollo)
3. [Puesta en marcha en entorno de producción](#3-puesta-en-marcha-en-entorno-de-producción)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Base de datos](#5-base-de-datos)
6. [Despliegue y reversión](#6-despliegue-y-reversión)
7. [Respaldo y restauración](#7-respaldo-y-restauración)
8. [Operación degradada y resincronización](#8-operación-degradada-y-resincronización)
9. [Alta de una sede nueva sin detener el sistema](#9-alta-de-una-sede-nueva-sin-detener-el-sistema)
10. [Monitoreo](#10-monitoreo)
11. [Resolución de problemas frecuentes de instalación](#11-resolución-de-problemas-frecuentes-de-instalación)

## 1. Requisitos previos y versiones exactas de software

| Componente | Versión o requisito comprobado |
| --- | --- |
| Java y Spring Boot | **Java 21** y **Spring Boot 4.1.1**, declarados en el [POM](../../pom.xml). El [Dockerfile](../../Dockerfile) usa Eclipse Temurin **21 JDK** para compilar y **21 JRE** para ejecutar. Las imágenes fijan la versión mayor. |
| Maven | **Maven 3.9.16**, descargado por el **Maven Wrapper 3.3.4**. La [configuración del wrapper](../../.mvn/wrapper/maven-wrapper.properties) fija la distribución y el checksum. |
| PostgreSQL | **18**, etiqueta del [Compose](../../docker-compose.yml). El README contempla PostgreSQL 18 local como alternativa. El parche de PostgreSQL queda determinado por la imagen o instalación efectiva. |
| Docker y terminal | Docker Desktop con Docker Compose v2 para el recorrido con contenedor. El repositorio no fija una versión exacta de Docker Desktop, Engine, Compose ni PowerShell. Los ejemplos usan PowerShell en Windows. |
| Node.js y npm | **Node.js 24.15.0 y npm 11.12.1** son la combinación de desarrollo registrada en los [README](../../README.md). La [guía de M2](../m2-offline.md) registra **Node.js 24.22.1** para una ejecución histórica del E2E y un intento abortado con 24.15.0. |
| Frontend | **React 18.3.1**, **React Router 6.30.6**, **Vite 5.4.21**, **Dexie 4.4.7**, **jose 6.2.17** y **Workbox Precaching 7.4.1**, según el [lockfile](../../frontend/package-lock.json). `npm ci` instala desde ese lockfile. |
| Navegador | Para offline se requiere soporte de service worker e IndexedDB y un origen seguro, HTTPS o localhost para la prueba. El [runner E2E](../../frontend/scripts/e2e-m2-offline.mjs) usa Google Chrome y Playwright **1.65.0**. El repositorio no fija la versión de Chrome. |

Desde la raíz podés comprobar el entorno con `.\mvnw.cmd -version`, `docker version`, `docker compose version`, `node --version` y `npm --version`. La primera ejecución puede requerir red para descargar Maven, dependencias o imágenes.

## 2. Puesta en marcha en entorno de desarrollo

### Base de datos

Elegí un solo PostgreSQL en el puerto local 5432. Con Docker abierto, desde la raíz:

~~~powershell
docker compose up -d postgres
docker compose ps
docker compose exec postgres pg_isready -U postgres -d fitzone
~~~

El servicio `postgres` crea la base local `fitzone`. El [Compose](../../docker-compose.yml) define únicamente PostgreSQL, publica `5432:5432` y guarda los datos en `fitzone_pgdata`. Para usar PostgreSQL local, creá una base de desarrollo dedicada según el [README](../../README.md) y configurá `DB_URL`, `DB_USERNAME` y `DB_PASSWORD` para esa instancia. Flyway crea las tablas al iniciar el backend.

**Advertencia para desarrollo.** El mapeo `5432:5432` no limita explícitamente el acceso a `127.0.0.1` y el servicio usa credenciales de demostración. Usá este Compose en un entorno de desarrollo aislado. Antes de usarlo en una red compartida, verificá y restringí quién puede conectarse al puerto publicado.

### API Spring Boot

En una terminal desde la raíz, con Java 21:

~~~powershell
$env:SPRING_PROFILES_ACTIVE = 'dev'
$env:JAVA_TOOL_OPTIONS = '-Duser.timezone=America/Argentina/Buenos_Aires'
.\mvnw.cmd spring-boot:run
~~~

En una terminal sin variables de conexión heredadas, `dev` tiene valores locales compatibles con el Compose del repositorio. Si usás una base local distinta, configurá la conexión explícitamente antes del arranque. El [perfil dev](../../src/main/resources/application-dev.properties) habilita el seed de demostración. Cuando la aplicación termine de iniciar, la API queda disponible en `http://localhost:3000/api/v1` con la configuración predeterminada. La opción de JVM coincide con la guía local, y el [reloj de accesos](../../src/main/java/com/fitzonesports/acceso/config/AccesoConfig.java) también fija la zona de Argentina.

### Frontend y comprobación mínima

En otra terminal, desde la raíz:

~~~powershell
npm --prefix frontend ci
npm --prefix frontend run dev
~~~

Abrí la dirección que imprime Vite, normalmente `http://localhost:5173`. [vite.config.js](../../frontend/vite.config.js) redirige `/api` a `http://localhost:3000`. [api.js](../../frontend/src/services/api.js) usa `/api/v1` por defecto. Entrá con una cuenta de demostración listada en el [README principal](../../README.md). Comprobá que el navegador autentique y pueda leer `GET /api/v1/usuarios/me` y `GET /api/v1/sedes`. El [README del frontend](../../frontend/README.md) sirve para el arranque, pero conserva descripciones de pantallas de una etapa anterior. Para el alcance actual, usá [las rutas reales](../../frontend/src/routes/AppRoutes.jsx) y el [Manual Técnico](manual-tecnico.md).

Para detener el entorno local, cerrá los procesos de frontend y backend con `Ctrl+C`. Desde la raíz, `docker compose down` retira el contenedor y conserva el volumen con nombre. Los datos permanecen si se preserva ese volumen.

## 3. Puesta en marcha en entorno de producción

El código trae el [perfil prod](../../src/main/resources/application-prod.properties) y permite construir los artefactos por separado. **El despliegue productivo completo queda pendiente.** El repositorio no define el servidor estático del frontend, el proxy público ni la orquestación de los tres componentes.

| Componente | Preparación comprobable en el repositorio |
| --- | --- |
| Base | Proveer una base PostgreSQL dedicada y accesible desde el proceso Java. El arranque ejecuta Flyway y valida el esquema. El perfil `prod` desactiva `data.sql` y el registro SQL de Hibernate. |
| Backend | Desde la raíz, `docker build -t fitzone-backend:local .` construye la imagen definida en el [Dockerfile](../../Dockerfile), que ejecuta `java -jar app.jar`. La imagen expone 3000 y el proceso lee `PORT`. El build empaqueta con `-DskipTests`. El entorno debe entregar explícitamente `SPRING_PROFILES_ACTIVE=prod`, las variables de PostgreSQL, `JWT_SECRET` y la clave persistente de M2 cuando se utilice offline. |
| Frontend | Desde `frontend/`, `npm ci` seguido de `npm run build` genera `dist/`. El [build PWA](../../frontend/scripts/build-pwa.mjs) agrega `sw.js` y el manifiesto. Para el diseño de mismo origen, el servidor debe publicar `dist/` en la raíz de un origen HTTPS, servir la SPA en sus rutas y enrutar `/api/v1` al backend. El [registro del service worker](../../frontend/src/main.jsx) usa `/sw.js`. La configuración de publicación y proxy aún requiere implementación y prueba. |
| Cuentas iniciales | `staging` y `prod` comparten la desactivación del seed de desarrollo. V2 registra roles; el registro público crea usuarios con autoridad `USUARIO`. Queda por confirmar cómo provisionar Gerencia y Recepción en un ambiente limpio. [V2](../../src/main/resources/db/migration/V2__insertar_roles.sql) · [UsuarioService](../../src/main/java/com/fitzonesports/usuario/service/UsuarioService.java) |

El perfil `staging` también exige una base propia y usa la [configuración sin seed](../../src/main/resources/application-staging.properties). La [plantilla de entorno](../../.env.example) propone `staging`. El archivo base contiene un comentario que anuncia error si falta el perfil, pero la expresión efectiva es `SPRING_PROFILES_ACTIVE:dev`. Fijá el perfil en el proceso de cada ambiente para que la omisión no active datos de demostración.

`localhost` en `DB_URL` apunta al entorno de red del proceso Java. Si Java corre en un contenedor separado, el host de PostgreSQL depende de la red que se configure. El Compose actual no conecta un backend a esa red ni le inyecta las variables.

## 4. Variables de entorno

### Aplicación, frontend y Compose

| Variable | Componente | Valor o regla comprobada |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | Spring | `dev`, `staging` o `prod`. Default efectivo `dev`. La plantilla propone `staging`. |
| `PORT` | Spring | Puerto HTTP, default `3000`. El prefijo de la API es `/api/v1`. El proxy local queda fijo en 3000 salvo ajuste explícito. |
| `DB_URL` | Spring | JDBC. En dev, default `jdbc:postgresql://localhost:5432/fitzone`. Obligatoria en staging y producción. |
| `DB_USERNAME` | Spring | Usuario PostgreSQL. En dev, default `postgres`. Obligatoria en staging y producción. |
| `DB_PASSWORD` | Spring | Contraseña de la base elegida. Dev dispone de un valor local que coincide con Compose. En staging y producción se inyecta en el proceso. |
| `JWT_SECRET` | Spring | Secreto HMAC para JWT y QR online legado. Hay valor local en dev. Staging y producción requieren un secreto propio. La duración del JWT de sesión declarada en configuración es una hora. |
| `FITZONE_OFFLINE_PRIVATE_KEY` | Spring | Clave RSA privada exclusiva de M2 en PKCS#8 DER codificado en Base64, de al menos 2048 bits. Si falta, preparar offline devuelve `503`. Si el valor es inválido, la inicialización falla. La misma clave debe sobrevivir a reinicios del servicio. |
| `PAGOS_PASARELA` | Spring | Default `fake`. Es el único adaptador de pagos localizado. Cambiar el valor por un proveedor sin implementación deja el puerto sin un adaptador. |
| `VITE_API_URL` | Frontend | Default `/api/v1`. Se define antes de arrancar Vite o de generar `dist/`. Para mismo origen conservar `/api/v1` y el proxy correspondiente. |
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` | PostgreSQL en Compose | Inicialización del contenedor. El archivo fija el usuario `postgres`, la base `fitzone` y una credencial local. Las variables `DB_*` son para Spring y no reemplazan esos valores en el Compose actual. |

Fuentes de la tabla: [configuración base](../../src/main/resources/application.properties), [perfiles dev](../../src/main/resources/application-dev.properties), [staging](../../src/main/resources/application-staging.properties) y [prod](../../src/main/resources/application-prod.properties), [plantilla](../../.env.example), [JWT](../../src/main/java/com/fitzonesports/auth/service/JwtService.java), [firma offline](../../src/main/java/com/fitzonesports/acceso/offline/FirmaOffline.java), [pasarela fake](../../src/main/java/com/fitzonesports/pago/pasarela/PasarelaPagoFake.java), [cliente API](../../frontend/src/services/api.js) y [Compose](../../docker-compose.yml).

### Herramientas, pruebas y propiedades operativas

| Variable o propiedad | Uso |
| --- | --- |
| `JAVA_HOME`, `JAVA_TOOL_OPTIONS` | Selección del JDK local y opciones JVM. El README y los runners usan `-Duser.timezone=America/Argentina/Buenos_Aires`. |
| `PLAN_TEST_DB_URL` | URL de PostgreSQL **descartable** para pruebas de integración. Sin ella se omiten casos que requieren la base. |
| `FITZONE_TEST_FILTER` | Variable interna que [el runner backend](../../scripts/pruebas-backend.ps1) inyecta desde `-Tests` para seleccionar suites Maven. |
| `FITZONE_E2E_RUN_ID` | Identificador que [el runner offline](../../scripts/prueba-m2-offline.ps1) asigna a su ejecución aislada. |
| `membresias.renovacion.intervalo-ms` y `membresias.renovacion.inicio-ms` | Propiedades Spring con default de **60 000 ms** para [renovación automática](../../src/main/java/com/fitzonesports/membresia/service/RenovacionAutomaticaJob.java). |
| `clases.ofertas.intervalo-ms` y `clases.ofertas.inicio-ms` | Propiedades Spring con default de **60 000 ms** para [vencimiento de ofertas](../../src/main/java/com/fitzonesports/clase/service/VencimientoOfertasJob.java). |
| `clases.notificador` | Propiedad Spring. El adaptador [NotificadorLog](../../src/main/java/com/fitzonesports/clase/observer/NotificadorLog.java) se selecciona con `log` o al omitirla. El aviso externo se simula en el log. |

[El wrapper de Windows](../../mvnw.cmd) admite `MAVEN_USER_HOME`, `MVNW_REPOURL`, `MVNW_USERNAME`, `MVNW_PASSWORD` y `MVNW_VERBOSE` para caché, origen de distribución, autenticación del espejo y diagnóstico. Se usan para el wrapper, fuera de la configuración de la aplicación.

### Carga local para probar M2 offline

[El generador](../../scripts/preparar-config-m2.mjs) crea `.env` desde la plantilla si falta y completa los valores vacíos de `JWT_SECRET` y `FITZONE_OFFLINE_PRIVATE_KEY`. Conserva los existentes y rechaza una RSA malformada sin sobrescribirla. Desde la raíz:

~~~powershell
node scripts/preparar-config-m2.mjs
~~~

Completá `DB_PASSWORD` según la base elegida antes de cargar el archivo. Spring no lee `.env` por sí solo. Para el formato `CLAVE=valor` en una línea y sin comillas usado por la plantilla, cargá el archivo en la terminal que iniciará el proceso:

~~~powershell
Get-Content -LiteralPath .env | ForEach-Object {
  if ($_ -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
~~~

Si vas a usar el seed de desarrollo, fijá `SPRING_PROFILES_ACTIVE=dev` después de cargar el archivo, ya que la plantilla trae `staging`. Usá una terminal separada o repetí la carga según corresponda al proceso. El [.gitignore](../../.gitignore) y el [.dockerignore](../../.dockerignore) excluyen los archivos de entorno privados. Protegé las claves y usá el mecanismo de secretos del ambiente para un despliegue compartido. [Guía de configuración M2](../m2-offline.md#clave-privada-y-continuidad-tras-reiniciar-spring)

## 5. Base de datos

**Migraciones.** Flyway está habilitado, valida migraciones y busca los SQL en `classpath:db/migration`. `baseline-on-migrate=false` y `clean-disabled=true`. Hibernate usa `ddl-auto=validate`. El corte contiene V1 a V15, desde el [esquema inicial](../../src/main/resources/db/migration/V1__crear_esquema_inicial.sql) hasta [clases y lista de espera](../../src/main/resources/db/migration/V15__clases_grupales.sql). El [inventario del Manual Técnico](manual-tecnico.md#3-modelo-de-datos) resume cada migración. Agregá cambios de esquema en migraciones nuevas y preservá las que ya se aplicaron.

Una vez iniciada la aplicación con la base de Compose, podés consultar la versión aplicada en modo lectura:

~~~powershell
docker compose exec postgres psql -U postgres -d fitzone -c "SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;"
~~~

En una instalación nueva, la tabla aparece después de la primera migración. Para una base externa, hacé la misma consulta contra el servidor y base de `DB_URL` con las credenciales del ambiente.

**Reversión de esquema.** No se localizaron scripts de migración inversa. Un cambio de imagen o JAR conserva el esquema aplicado y podría dejar al backend anterior incompatible. Ante un error de validación, consultá el log de arranque y el historial de Flyway. Editar SQL ya aplicado, modificar el historial o desactivar la validación dejaría sin respaldo el estado de migraciones. El mecanismo de reversión queda pendiente de decisión y prueba.

**Datos semilla.** [data.sql](../../src/main/resources/data.sql) carga una sede de demostración, cuatro cuentas de prueba, tipos de clase e instructores. Se ejecuta en `dev` y se desactiva en `staging` y `prod`. Ese seed no cubre la carga de 25 sedes con canchas y clases que piden los lineamientos. [V2](../../src/main/resources/db/migration/V2__insertar_roles.sql) y [V7](../../src/main/resources/db/migration/V7__autoridad_usuario_estable.sql) forman parte del esquema y catálogo versionados de roles.

## 6. Despliegue y reversión

El mecanismo disponible consiste en **imagen del backend, build estático de la PWA y base PostgreSQL**. Los [scripts de pruebas](../pruebas.md) levantan instancias aisladas para verificación local. En la rama no se encontró un pipeline versionado, un servicio de publicación del frontend, un manifiesto de despliegue integrado ni un script de rollback. El requisito de levantar todo con `docker compose up --build` queda pendiente, porque el Compose actual solo inicia la base.

La reversión de versión también queda pendiente. Antes de aprobar un procedimiento, el equipo debe verificar la compatibilidad del binario anterior con la versión de esquema alcanzada y cómo se preservan la base, la clave de M2 y los movimientos pendientes. Revertir el código y restaurar datos son operaciones distintas. El [índice de arquitectura](../arquitectura-tif.md) reserva ADR-009 para esta decisión.

## 7. Respaldo y restauración

| Activo | Persistencia comprobada | Pendiente para operación |
| --- | --- | --- |
| PostgreSQL | El [Compose](../../docker-compose.yml) monta `fitzone_pgdata` en `/var/lib/postgresql`. Recrear el contenedor conservando ese volumen permite reutilizar datos e historial de Flyway. | El volumen por sí solo no es un respaldo. No se encontraron tareas versionadas de copia, política de retención ni restauración ensayada. Queda definir una copia recuperable y probar la apertura de una base restaurada en un ambiente aislado. |
| Configuración y secretos | [La configuración de M2](../m2-offline.md#clave-privada-y-continuidad-tras-reiniciar-spring) guarda la clave RSA fuera del código y exige mantenerla entre reinicios. La base de datos y el gestor de secretos son activos separados. | Confirmar custodia y recuperación de la misma clave RSA y del secreto JWT sin publicarlos. La restauración de PostgreSQL por sí sola no recupera los secretos del proceso. |
| Cola del terminal | [IndexedDB](../../frontend/src/services/offline/db.js) conserva la copia y los movimientos en el perfil del navegador. Hasta recibir confirmación, una captura local puede faltar en PostgreSQL. | El repositorio no aporta exportación y restauración de la cola. Conservar el mismo perfil y sincronizar antes de retirar el equipo cuando sea posible. La pérdida o limpieza del perfil deja los eventos sin sincronizar fuera del respaldo central. |

En el ensayo de recuperación, comprobar al menos el historial de migraciones, sedes, membresías y registros de acceso restaurados. Registrar si los terminales pueden validar con la clave conservada y si quedan capturas que deban revisarse. Esta sección identifica qué validar y qué preservar. El procedimiento operativo de respaldo y recuperación todavía debe ser definido y ensayado.

## 8. Operación degradada y resincronización

### Preparar con conexión

Usá una PWA construida en un origen seguro. Para probar localmente, con el backend en 3000 y la configuración de [M2 offline](#carga-local-para-probar-m2-offline) cargada, ejecutá desde la raíz:

~~~powershell
npm --prefix frontend ci
$env:VITE_API_URL = '/api/v1'
npm --prefix frontend run build
npm --prefix frontend run preview -- --host 127.0.0.1
~~~

Abrí el origen que informa Vite, normalmente `http://127.0.0.1:4173`. El preview local hereda el proxy a la API que documenta la [guía de M2](../m2-offline.md#ejecución-y-demostración-reproducible). `npm run dev` no registra el service worker. El preview sirve para la prueba local de la PWA.

1. Entrá como Recepción de la sede y usá **Preparar / actualizar terminal** en `/terminal-offline`. Esperá confirmación de que la copia se guardó. La autoridad local dura hasta dos horas. El registro corresponde a un terminal principal y su operador para esa sede. [TerminalOffline.jsx](../../frontend/src/modules/m2-acceso/TerminalOffline.jsx) · [TerminalOfflineService](../../src/main/java/com/fitzonesports/acceso/offline/TerminalOfflineService.java)
2. El socio abre **Mi QR** con conexión para obtener las autorizaciones multisede. Las ventanas duran hasta 60 segundos y el lote cubre hasta dos horas, acotado por la vigencia comercial. Si la sede pierde conexión antes de la emisión y el socio conserva su propia red, puede obtener el lote desde la API. Si ambos quedan sin red, el socio necesita haber guardado un lote vigente. [AutorizacionQrService](../../src/main/java/com/fitzonesports/acceso/offline/AutorizacionQrService.java)

### Durante el corte

Usá el terminal ya aprovisionado. Verificá el estado de la copia y el resultado de cada ingreso o egreso. El evento y la presencia se guardan en una transacción local; se muestran como **provisionales** hasta confirmación central. Una copia vencida bloquea movimientos nuevos, pero conserva los pendientes. El aforo desconectado refleja solo la información conocida localmente. [Movimientos](../../frontend/src/services/offline/movimientos.js) · [Persistencia](../../frontend/src/services/offline/db.js)

Si el socio también está sin conexión, abrí `/qr-offline` en el mismo origen y perfil del navegador donde se guardó el lote de Mi QR. La pantalla muestra la ventana vigente si hay una guardada. [QrOffline.jsx](../../frontend/src/modules/m2-acceso/QrOffline.jsx)

### Al recuperar la conexión

1. Mantené el mismo perfil de navegador y autenticá al operador original si su sesión caducó. `GET /api/v1/accesos/offline/conexion` comprueba llegada a la API con sesión válida. El terminal intenta sincronizar al abrirse, al recuperar la red y cada 10 segundos. Cuando la API esté disponible y la sesión del operador sea válida, también podés pulsar **Reintentar sincronización**. [TerminalOffline.jsx](../../frontend/src/modules/m2-acceso/TerminalOffline.jsx) · [OfflineController](../../src/main/java/com/fitzonesports/acceso/offline/OfflineController.java)
2. Revisá la cola y los resultados. `CONFIRMADO` indica aceptación central. `EN_ESPERA` sigue como pendiente local. `CONFLICTO` y `RECHAZADO` conservan el detalle para revisión. Si se pierde el acuse, el reintento conserva el mismo UUID. Al quedar sin pendientes, el terminal puede actualizar la copia. [Sincronización del cliente](../../frontend/src/services/offline/sync.js) · [Reconciliación](../../src/main/java/com/fitzonesports/acceso/offline/SincronizacionOfflineService.java)
3. Preservá el perfil y la evidencia de los conflictos. Dos sedes aisladas pueden admitir provisionalmente a la misma persona y detectar la incompatibilidad al reconectar. La resolución administrativa permanece pendiente. La prueba funcional del flujo tampoco acredita por sí sola el 99,5 % de disponibilidad. [ADR-007](../adr/ADR-007-tif-replica-y-reconciliacion.md)

## 9. Alta de una sede nueva sin detener el sistema

El alta está implementada como una transacción de base de datos durante la ejecución. No requiere recompilar ni cambiar parámetros del servidor. En un ambiente de prueba con una cuenta habilitada de **Gerencia**:

1. Abrí `/gestion/sedes` y completá el formulario. Ingresá un nombre único, dirección opcional y capacidad máxima entera mayor que cero. Guardá y comprobá que la sede aparezca en el listado. [Gerencia.jsx](../../frontend/src/modules/gerencia/Gerencia.jsx)
2. Para validar por API, `POST /api/v1/sedes` requiere `GERENTE` y recibe `nombre`, `direccion` y `capacidadMaxima`. Se espera `201` al crear. Un nombre ya registrado devuelve `409` según el servicio. Comprobá el ID y los datos con `GET /api/v1/sedes`. `PATCH /api/v1/sedes/{sedeId}` permite editar con el mismo rol. [SedeRequest](../../src/main/java/com/fitzonesports/sede/dto/SedeRequest.java) · [SedeController](../../src/main/java/com/fitzonesports/sede/controller/SedeController.java) · [SedeService](../../src/main/java/com/fitzonesports/sede/service/SedeService.java)
3. Si la sede tendrá Recepción offline, verificá una cuenta activa de Recepción vinculada a esa sede y aprovisioná el terminal con conexión. El alta de la sede guarda el registro, la dirección y la capacidad. El registro del operador y el aprovisionamiento corresponden a operaciones separadas. [TerminalOfflineService](../../src/main/java/com/fitzonesports/acceso/offline/TerminalOfflineService.java)

Falta demostrar en un entorno limpio el alta y el uso de la nueva sede mientras otra sede sigue operando. El endpoint permite el alta en caliente, pero esta revisión no midió continuidad del servicio.

## 10. Monitoreo

| Control disponible | Cómo comprobarlo e interpretarlo |
| --- | --- |
| Arranque de Spring | Revisar la terminal del proceso y comprobar que Flyway y Hibernate completaron el inicio. Confirmar el perfil y el puerto efectivos. En dev se registra SQL de Hibernate. [Configuración base](../../src/main/resources/application.properties) · [Perfil dev](../../src/main/resources/application-dev.properties) |
| PostgreSQL local | `docker compose ps` muestra el estado del contenedor. `docker compose logs --tail 50 postgres` consulta su salida. `docker compose exec postgres pg_isready -U postgres -d fitzone` verifica aceptación de conexiones, sin probar el flujo de aplicación. [Compose](../../docker-compose.yml) |
| API | En local, `curl.exe -sS -o NUL -w "%{http_code}" http://localhost:3000/api/v1/accesos/offline/conexion` debería devolver `401` sin sesión. Eso confirma que respondió la API protegida. Con sesión válida, la misma ruta devuelve `204`; complementá con `GET /api/v1/sedes` autenticado para comprobar una lectura de base. [Seguridad](../../src/main/java/com/fitzonesports/auth/security/SecurityConfig.java) · [OfflineController](../../src/main/java/com/fitzonesports/acceso/offline/OfflineController.java) |
| Terminal | Revisar estado de conexión, vigencia de la copia, cantidad de pendientes y detalle de conflictos en la pantalla. La app reporta errores de registro del service worker en consola. [TerminalOffline.jsx](../../frontend/src/modules/m2-acceso/TerminalOffline.jsx) · [main.jsx](../../frontend/src/main.jsx) |
| Métricas | El [POM](../../pom.xml) incluye Spring Boot Actuator. No se localizaron configuración operativa de endpoints de gestión, exportador de métricas, tablero, alertas ni verificación de disponibilidad desplegada. Confirmar exposición, autenticación y alcance de Actuator en el ambiente de prueba antes de usarlo como sonda. |

## 11. Resolución de problemas frecuentes de instalación

| Síntoma | Comprobación y resolución |
| --- | --- |
| Maven no encuentra Java o informa otra versión | Ejecutá `.\mvnw.cmd -version`. Corregí `JAVA_HOME` a un JDK 21 y volvé a comprobar en la misma terminal. Si falla la descarga del wrapper, revisá red o espejo y el checksum fijado en sus propiedades. [README](../../README.md) · [Wrapper](../../.mvn/wrapper/maven-wrapper.properties) |
| Puerto 5432 ocupado o PostgreSQL no responde | Comprobá si ya corre un PostgreSQL local y si el servicio de Compose quedó arriba. Elegí una instancia y apuntá `DB_URL` a ella. [Compose](../../docker-compose.yml) |
| Fallo de autenticación o base inexistente | Revisá `DB_URL`, `DB_USERNAME` y `DB_PASSWORD` en el proceso de Spring. Confirmá la instancia, puerto, nombre de base y perfil. Si usás `.env`, comprobá que sus variables llegaron al proceso. [Configuración base](../../src/main/resources/application.properties) |
| Fallo de Flyway o validación de Hibernate | Revisá el primer error del arranque y la historia de la base seleccionada. Confirmá si se trata de una base limpia, de otra rama o de una migración aplicada con contenido diferente. Conservá el esquema para diagnóstico. [Manual Técnico](manual-tecnico.md#3-modelo-de-datos) |
| Frontend carga pero falla el login o la API | Abrí la URL que informa Vite. Revisá el estado del backend y que el proxy apunte al puerto efectivo. En rutas protegidas, un `401` puede indicar un token ausente, inválido o vencido. Volvé a iniciar sesión y verificá que la solicitud incluya `Authorization: Bearer <token>` sin copiar el token a registros ni capturas. Un `403` indica que la operación no está autorizada. Un `501` puede corresponder a una operación pendiente de implementación. [Vite](../../frontend/vite.config.js) · [Contrato OpenAPI](../openapi/openapi.yaml) |
| Preparar offline devuelve `503` o Spring falla al iniciar con error de clave M2 | Confirmá que `FITZONE_OFFLINE_PRIVATE_KEY` se inyectó en el proceso y que cumple el formato RSA esperado. Conservá la clave vigente para que el reinicio no invalide material pendiente. [FirmaOffline](../../src/main/java/com/fitzonesports/acceso/offline/FirmaOffline.java) |
| No aparece la PWA, el terminal no admite o la cola no baja | Confirmá build de producción y origen seguro. Revisá el registro de `/sw.js`, IndexedDB, vigencia de copia y reloj. Ante cola pendiente, verificá conexión y sesión del operador original, y revisá el resultado por evento antes de cambiar de perfil o reprovisionar. [Guía M2](../m2-offline.md) |

### Verificación práctica pendiente en entorno limpio

- Instalar Java y Maven Wrapper, Node/npm y PostgreSQL 18. Levantar el recorrido local completo y comprobar migraciones, seed, login y una lectura autenticada a través del proxy.
- Construir imagen backend y PWA, arrancar con `staging` y `prod` en bases aisladas, comprobar que el seed queda desactivado y validar el aprovisionamiento inicial de cuentas. Probar el HTTPS y el proxy del ambiente de destino una vez configurados.
- Aprovisionar Recepción, cortar la conexión, validar QR, reconectar y confirmar la cola. Repetir con reinicio del backend y la misma clave. El [runner E2E](../../scripts/prueba-m2-offline.ps1) ofrece una base aislada para la prueba.
- Dar de alta y usar una sede mientras sigue operativo el servicio en otra. Verificar registros, acceso a estado y métricas disponibles con los permisos del ambiente.
- Una vez acordados, ensayar y registrar respaldo, restauración, despliegue y reversión. Asociar resultados al commit y a las versiones efectivas de las herramientas.
