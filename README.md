# FitZone_Sports

Trabajo Práctico Final de la materia Programación V - Licenciatura en Sistemas.

Sistema de gestión para FitZone Sports: membresías, clases grupales, reservas de canchas y pagos.

## Stack

- **Backend:** Java 21 + Spring Boot 4.1.1 (Maven), PostgreSQL, Flyway, Spring Data JPA, Spring Security + JWT
- **Frontend:** React + Vite + React Router; Cliente/Socio, Recepción y Gerencia integrados según el soporte real de la API. Clases, Canchas y Reportes tienen frontend preparado y backend pendiente, con estados explícitos de no disponibilidad.
- **Arquitectura:** Monolito Modular (ADR-001), organizado por módulo de dominio (`auth`, `usuario`, `sede`, `membresia`, `acceso`, `clase`, `reserva`, `pago`, `reporte`). La presencia de un módulo no implica que su backend esté terminado.

Entrega de la rama `feature/integracion-final-frontend`: [alcance, decisiones, pruebas y pendientes](docs/integracion-final-frontend.md).

## Requisitos

- JDK 21
- Docker Desktop con Docker Compose, o PostgreSQL 18 instalado localmente
- Node.js y npm para el frontend (base comprobada con Node.js 24.15.0 y npm 11.12.1)
- PowerShell o una terminal equivalente. Maven se incluye mediante `mvnw`; no hace falta instalarlo aparte.

## Cómo levantar el proyecto localmente

Los comandos de PowerShell se ejecutan desde la raíz del repositorio, salvo que se indique otra carpeta. Para probar solo la API, completá los pasos de base de datos y backend; el frontend es opcional.

### 1. Preparar Java

Verificá que Maven encuentre JDK 21:

```powershell
.\mvnw.cmd -version
```

Si aparece `JAVA_HOME is not defined correctly` o una versión distinta de 21, configurá la ruta de tu JDK (reemplazá el ejemplo por la carpeta real que contiene `bin`):

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
& "$env:JAVA_HOME\bin\java.exe" -version
.\mvnw.cmd -version
```

Las variables definidas con `$env:` se aplican a esa terminal. Si abrís otra para ejecutar Maven, volvé a configurarlas allí.

### 2. Levantar PostgreSQL (elegir una opción)

**Opción A: Docker.** Abrí Docker Desktop y esperá a que esté listo. Luego:

```powershell
docker compose up -d
docker compose ps
```

El contenedor `fitzone-postgres` debe estar en ejecución. Compose crea la base `fitzone` y usa usuario `postgres`, contraseña `postgres` y puerto `5432`.

**Opción B: PostgreSQL instalado localmente.** Iniciá el servicio y creá una base llamada `fitzone` en pgAdmin, o ejecutá lo siguiente en Query Tool conectado a la base `postgres`:

```sql
CREATE DATABASE fitzone;
```

Usá una base dedicada al desarrollo. No hace falta crear las tablas manualmente. En la terminal donde vas a iniciar el backend, configurá tus credenciales reales:

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/fitzone"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "TU_CONTRASEÑA_DE_POSTGRESQL"
```

La contraseña del servidor PostgreSQL puede ser distinta de la contraseña maestra de pgAdmin. Si ya existe la base `fitzone`, no repitas su creación. Docker y PostgreSQL local no pueden ocupar el mismo puerto en la misma dirección; elegí una opción y verificá a qué servidor apunta `DB_URL`.

### 3. Iniciar el backend (terminal 1)

Con Docker y las credenciales de Compose, configurá explícitamente los valores para evitar que variables anteriores apunten a otra base:

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/fitzone"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "postgres"
```

Con PostgreSQL local, conservá los valores del paso anterior. Luego, para ambas opciones:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:JAVA_TOOL_OPTIONS = "-Duser.timezone=America/Argentina/Buenos_Aires"
.\mvnw.cmd spring-boot:run
```

El perfil `dev` es obligatorio para esta configuración local. Esperá los mensajes `Tomcat started on port 3000` y `Started FitZoneSportsApplication`. Dejá esta terminal abierta: la API queda disponible en `http://localhost:3000/api/v1`. La primera ejecución puede tardar mientras Maven descarga dependencias.

En Linux/macOS, el comando equivalente con los valores locales predeterminados es:

```bash
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```

Al levantar por primera vez, Flyway aplica las migraciones de `src/main/resources/db/migration`. Hibernate valida el esquema sin modificarlo (`ddl-auto=validate`). En dev, `data.sql` agrega una sede y usuarios de prueba.

### 4. Probar la API (terminal 2)

Con el backend en ejecución, abrí otra terminal PowerShell y ejecutá estos bloques por separado. Primero, iniciá sesión como gerente:

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/auth/login" -ContentType "application/json" -Body '{"email":"gerente@fitzone.com","password":"gerente123"}'
```

Prepará el encabezado de autorización con el JWT recibido:

```powershell
$headers = @{ Authorization = "Bearer $($login.token)" }
```

Consultá el perfil, las sedes, los usuarios y los planes:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/usuarios/me" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/sedes" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/usuarios" -Headers $headers
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/planes" -Headers $headers
```

El perfil debe devolver los datos del gerente. Los listados devuelven los datos existentes; `/planes` puede devolver `[]` si todavía no hay planes. Para probar una escritura, creá un plan con nombre único:

```powershell
$plan = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/planes" -Headers $headers -ContentType "application/json" -Body '{"nombre":"Plan de prueba local","duracionMeses":1,"precio":15000}'
$plan
```

Esto guarda un plan en la base local. Repetir el mismo nombre devuelve `409`; usá otro nombre para una nueva prueba. Para desactivarlo:

```powershell
Invoke-RestMethod -Method Delete -Uri "http://localhost:3000/api/v1/planes/$($plan.id)" -Headers $headers
```

También podés usar Postman: hacé el mismo POST de login con cuerpo JSON y copiá `token` en Authorization → Bearer Token para las demás solicitudes. El JWT vence en una hora; repetí el login si expiró.

Resultados útiles para probar: sin token, las rutas protegidas devuelven `401`; con un rol sin permisos, `403`; muchas operaciones pendientes devuelven `501`. Más abajo está la tabla de endpoints y roles. Podés repetir el login con los otros usuarios de prueba para verificar permisos.

### 5. Iniciar el frontend (otra terminal)

Desde la raíz del repositorio:

```powershell
cd frontend
npm ci
npm run dev
```

Abrí la URL que muestre Vite, normalmente `http://localhost:5173`. Dejá también esta terminal abierta y entrá con `socio@fitzone.com` / `socio123`, o con otro usuario de la tabla de prueba.

El login y el registro llaman al backend real, por lo que debe estar en ejecución. Vite redirige las solicitudes `/api` a `http://localhost:3000`; no hace falta definir `VITE_API_URL` para este flujo. Las pantallas de negocio todavía usan datos e interacciones de ejemplo: iniciar ambos servidores no implementa reservas, pagos ni QR reales.

Para verificar la compilación del frontend, desde `frontend/`:

```powershell
npm run build
```

Para ejecutar las pruebas automatizadas del backend, desde la raíz con JDK 21:

```powershell
.\mvnw.cmd test
```

Las pruebas de persistencia requieren una base aparte, vacía y descartable, configurada mediante `PLAN_TEST_DB_URL`; sin esa variable se omiten. Consultá la sección «Pruebas de planes» antes de habilitarlas.

### Problemas frecuentes y cómo detener el entorno

- **Conexión rechazada al llamar a la API:** el backend no está escuchando en `3000`. Revisá su terminal y esperá el mensaje de inicio. `BUILD SUCCESS` por sí solo no confirma que el servidor siga en ejecución.
- **`password authentication failed`:** revisá `DB_USERNAME`, `DB_PASSWORD` y el servidor que ocupa `5432`. Un PostgreSQL instalado en Windows puede tener credenciales distintas de Docker.
- **`database "fitzone" does not exist`:** creá la base en el servidor indicado por `DB_URL`.
- **Docker no inicia por puerto ocupado:** verificá si PostgreSQL local usa `5432` y elegí cuál ejecutar.
- **Error de PowerShell al pegar el login:** ejecutá por separado la asignación de `$login` y la de `$headers`, como en los ejemplos.
- **El frontend no puede iniciar sesión:** verificá que el backend esté activo en `3000` y usá las credenciales de prueba de la API; la contraseña del socio es `socio123`.

Detené backend y frontend con `Ctrl+C` en sus respectivas terminales. Si usaste Docker, desde la raíz ejecutá `docker compose down`; conserva los datos del volumen. No agregues `--volumes` salvo que quieras eliminar toda la base local.

## Migraciones de base de datos

Flyway es la única herramienta que modifica el esquema. Para realizar un cambio en la base de datos:

1. No modificar una migración que ya haya sido aplicada. `V1` y `V2` se consideran inmutables.
2. Crear un archivo nuevo en `src/main/resources/db/migration` usando el siguiente número de versión y un nombre descriptivo, por ejemplo `V3__agregar_telefono_usuario.sql`.
3. Escribir en esa migración las sentencias necesarias para actualizar el esquema o los datos de referencia.
4. Actualizar las entidades JPA y los repositorios afectados para que coincidan con el nuevo esquema.
5. Arrancar el backend. Flyway valida `flyway_schema_history` y ejecuta, en orden, solamente las migraciones pendientes. Luego Hibernate valida el resultado.
6. Verificar el cambio tanto sobre una base existente como desde una base limpia antes de integrarlo.

`data.sql` se reserva para datos ficticios del perfil `dev`; los datos obligatorios para todos los ambientes deben incorporarse mediante una migración versionada.

PostgreSQL guarda sus datos y el historial de Flyway en el volumen Docker `fitzone_pgdata`. Estos datos sobreviven a `docker compose down` y a la recreación del contenedor. El comando `docker compose down --volumes` elimina el volumen y toda la base, por lo que debe usarse solamente cuando se quiera probar una inicialización completamente limpia.

### Variables de entorno (opcionales)

Los valores por defecto sirven para desarrollo local sin configurar nada. Para pisarlos (por ejemplo en otro entorno):

| Variable | Default | Uso |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/fitzone` | URL de conexión a PostgreSQL |
| `DB_USERNAME` | `postgres` | Usuario de PostgreSQL |
| `DB_PASSWORD` | `postgres` | Password de PostgreSQL |
| `JWT_SECRET` | clave de desarrollo compartida | Clave de firma de los JWT |

## Pasarela de pagos fake (temporal)

El backend incluye el puerto `PasarelaPago` y su implementacion `PasarelaPagoFake`, seleccionada mediante `pagos.pasarela=fake` (valor predeterminado, configurable con `PAGOS_PASARELA`). Aprueba siempre los cobros validos en ARS, sin red, datos de tarjeta ni movimientos de dinero reales. Devuelve estado `APROBADO`, proveedor `FAKE` y una referencia estable para la misma clave de idempotencia.

Los servicios de pagos deben inyectar `PasarelaPago` y enviar una `SolicitudCobro` con clave de idempotencia, monto positivo calculado por el backend (hasta dos decimales) y moneda `ARS`. El simulador no persiste pagos ni activa membresias: esas responsabilidades siguen en los servicios de M5 y M1. Tampoco implementa los endpoints pendientes de `/pagos`.

Para reemplazarla, agregar un adaptador que implemente la misma interfaz y activarlo con otro valor de `pagos.pasarela`. El adaptador real debera convertir sus resultados a `APROBADO`, `RECHAZADO` o `PENDIENTE`. La persistencia de idempotencia y la validacion de reintentos con distinto importe corresponden a M5; una referencia fake estable no reemplaza esos controles.

## Usuarios de prueba (seed)

La contratación, renovación manual/automática, consulta histórica, suspensión/reactivación y arrepentimiento están implementados con pagos fake. Ver [guía y ejemplos de membresías](docs/membresias.md). El QR requiere membresía vigente; el rol por sí solo no habilita acceso.

| Email | Password | Rol |
|---|---|---|
| socio@fitzone.com | socio123 | USUARIO |
| cliente@fitzone.com | cliente123 | USUARIO |
| recepcion@fitzone.com | recepcion123 | RECEPCIONISTA |
| gerente@fitzone.com | gerente123 | GERENTE |

Login: `POST /api/v1/auth/login` con `{ "email": "...", "password": "..." }`, devuelve un JWT para usar como `Authorization: Bearer <token>` en el resto de los endpoints.

Registro: `POST /api/v1/auth/register` con `{ "nombre": "...", "apellido": "...", "dni": "...", "email": "...", "password": "..." }`. El alta comercial queda sin sede habitual. Se elige al contratar con sesión iniciada; GET /sedes sigue autenticado.

## Estructura del backend

```
com.fitzonesports/
└── auth/
    ├── controller/   AuthController
    ├── service/      JwtService, CustomUserDetailsService
    ├── repository/   RolRepository
    ├── model/        Rol
    ├── security/      SecurityConfig, JwtAuthenticationFilter
    └── dto/          LoginRequest, LoginResponse
```

```
com.fitzonesports/
└── usuario/
    ├── controller/   UsuarioController
    ├── service/      UsuarioService (alta de clientes)
    ├── repository/   UsuarioRepository
    └── model/        Usuario
```

Cada módulo de dominio nuevo (`membresia`, `clase`, `reserva`, `pago`) sigue esta misma organización interna.

## Endpoints iniciales de los módulos

Borrador para organizar el trabajo. Las rutas de negocio usan el prefijo
`/api/v1`. Usuarios, sedes, planes, membresías y QR/ingresos/salidas/aforo ya tienen implementación; las rutas pendientes devuelven
`501 Not Implemented` sin cuerpo si el rol tiene permiso.
Sin autenticación válida se devuelve `401`; con un rol no permitido, `403`.
Los stubs no consultan ni modifican datos. Sus contratos de solicitud/respuesta y filtros
están pendientes. Las anotaciones `@PreAuthorize` usan el soporte existente de
Spring Security (`@EnableMethodSecurity`).

Roles: **S** y **C** = USUARIO (ambos actores comerciales del TP),
**R** = RECEPCIONISTA, **G** = GERENTE. GERENTE tiene acceso a todas las rutas.
Socio es condición funcional derivada de membresía vigente; la autoridad USUARIO no cambia al pagar o vencer.
Ver [ADR de actores y membresía](docs/adr/0007-actores-y-membresia.md). Los tokens legados requieren un nuevo login tras V7.

Pendiente antes de implementar operaciones reales:

- Validar propiedad de perfiles, membresías, reservas, ofertas y pagos.
- Restringir recepción a su sede; permitir al gerente operar en todas.
- Consultar vigencia de membresía y suspensión de clases, sin confiar solo en el rol.
- Permitir cancelar reservas propias aunque la membresía haya vencido: revisar
  la política al separar condición de membresía y rol.
- Aplicar reglas de capacidad, horarios, precios y devoluciones también al gerente.
- Definir pagos asistidos y acceso de recepción a pagos/reembolsos. Por ahora,
  recepción no tiene acceso a M5; los clientes solicitan reembolsos propios.
- Agregar actualización de tarifas por tipo de cancha cuando se acuerde su contrato;
  la modificación de cancha no define todavía ese contrato global.

Reglas de `usuario`: recepción solo lista, consulta y modifica usuarios de su sede, y
solo USUARIO. Puede activar/desactivar cuentas (`activo`) con
`PATCH /usuarios/{usuarioId}`. Nadie puede desactivar su propia cuenta, y
`PATCH /usuarios/me` no permite cambiar `activo`. El gerente opera sobre todas las
sedes y roles. `GET /usuarios` acepta `?sedeId=` (recepción solo con su propia sede).

Reglas de `sede`: cualquier rol autenticado lista las sedes; solo el gerente crea o modifica. El nombre es único (sin distinguir mayúsculas, `409` si se repite) y `capacidadMaxima` debe ser positiva. `Sede` y `SedeRepository` pasaron de `auth` al módulo `sede`.

| Módulo | Método | Ruta (sin prefijo) | Roles | Caso previsto |
|---|---|---|---|---|
| usuario | GET | `/usuarios/me` | S, C, R, G | consultarPerfil |
| usuario | PATCH | `/usuarios/me` | S, C, R, G | actualizarPerfil |
| usuario | GET | `/usuarios` | R, G | listarUsuarios |
| usuario | GET | `/usuarios/{usuarioId}` | R, G | consultarUsuario |
| usuario | PATCH | `/usuarios/{usuarioId}` | R, G | actualizarUsuario |
| sede | GET | `/sedes` | S, C, R, G | listarSedes |
| sede | POST | `/sedes` | G | crearSede |
| sede | PATCH | `/sedes/{sedeId}` | G | actualizarSede |
| membresia | GET | `/planes` | S, C, R, G | listarPlanes |
| membresia | POST | `/planes` | G | crearPlan |
| membresia | PATCH | `/planes/{planId}` | G | actualizarPlan |
| membresia | DELETE | `/planes/{planId}` | G | desactivarPlan |
| membresia | GET | `/membresias/me` | S, C, G | consultarMembresia |
| membresia | POST | `/membresias` | S, C, G | crearMembresia |
| membresia | POST | `/membresias/{membresiaId}/renovaciones` | S, C, G | renovarMembresia |
| membresia | GET | `/membresias/{membresiaId}` | R, G | consultarMembresiaPorId |
| membresia | PATCH | `/membresias/{membresiaId}/estado` | R, G | actualizarEstado |
| membresia | PUT | `/membresias/{membresiaId}/renovacion-automatica` | S, C, G | configurarRenovacionAutomatica |
| membresia | POST | `/membresias/{membresiaId}/periodos/{periodoId}/cancelacion` | S, C, G | arrepentimiento con reembolso fake dentro de 24 h |
| acceso | GET | `/accesos/qr` | S, C, G | obtenerQr con membresía vigente |
| acceso | POST | `/accesos/ingresos` | R, G | registrarIngreso |
| acceso | POST | `/accesos/salidas` | R, G | registrarSalida |
| acceso | GET | `/accesos/sedes/{sedeId}/aforo` | R, G | consultarAforo |
| acceso | GET | `/accesos` | R, G | listarAccesos |
| acceso | PATCH | `/accesos/{accesoId}` | R, G | corregirAcceso |
| clase | GET | `/clases` | S, G, R | listarClases |
| clase | POST | `/clases/{claseId}/reservas` | S, G | reservarClase |
| clase | DELETE | `/clases/{claseId}/reservas/{reservaId}` | S, G, R | cancelarReserva |
| clase | POST | `/clases` | R, G | crearClase |
| clase | PATCH | `/clases/{claseId}` | R, G | actualizarClase |
| clase | POST | `/clases/{claseId}/cancelacion` | R, G | cancelarClase |
| clase | GET | `/clases/{claseId}/reservas` | R, G | listarReservasClase |
| clase | PUT | `/clases/{claseId}/reservas/{reservaId}/asistencia` | R, G | registrarAsistencia |
| clase | POST | `/clases/{claseId}/lista-espera` | S, G | incorporarListaEspera |
| clase | DELETE | `/clases/{claseId}/lista-espera/me` | S, G | salirListaEspera |
| clase | POST | `/clases/{claseId}/ofertas/{ofertaId}/respuesta` | S, G | responderOferta |
| reserva | GET | `/canchas` | S, C, R, G | listarCanchas |
| reserva | GET | `/canchas/{canchaId}/turnos` | S, C, R, G | listarTurnos |
| reserva | POST | `/canchas/{canchaId}/reservas` | S, C, G | reservarTurno |
| reserva | DELETE | `/canchas/{canchaId}/reservas/{reservaId}` | S, C, R, G | cancelarReserva |
| reserva | POST | `/canchas` | R, G | crearCancha |
| reserva | PATCH | `/canchas/{canchaId}` | R, G | actualizarCancha |
| reserva | POST | `/canchas/{canchaId}/turnos` | R, G | crearTurno |
| reserva | POST | `/canchas/{canchaId}/mantenimientos` | R, G | crearMantenimiento |
| reserva | DELETE | `/canchas/{canchaId}/mantenimientos/{mantenimientoId}` | R, G | eliminarMantenimiento |
| reserva | GET | `/reservas/me` | S, C, G | listarMisReservas |
| reserva | GET | `/reservas` | R, G | listarReservas |
| pago | POST | `/pagos` | S, C, G | crearPago |
| pago | GET | `/pagos/me` | S, C, G | listarMisPagos |
| pago | GET | `/pagos/{pagoId}/comprobante` | S, C, G | consultarComprobante |
| pago | GET | `/pagos/{pagoId}` | S, C, G | consultarPago |
| pago | GET | `/pagos` | G | listarPagos |
| pago | POST | `/pagos/{pagoId}/reembolsos` | S, C, G | solicitarReembolso |
| reporte | GET | `/reportes/ocupacion` | G | consultarOcupacion |
| reporte | GET | `/reportes/ingresos` | G | consultarIngresos |

La autenticación existente (`POST /auth/login` y `POST /auth/register`) sigue
implementada y pública. El frontend de Clases, Canchas y Reportes consulta las rutas
preparadas y presenta `501` como servicio pendiente; no ofrece operaciones ficticias.

### Planes de membresía

Los planes son globales para todas las sedes. La representación contiene `id`,
`nombre`, `duracionMeses`, `precio` (número decimal en ARS) y `activo`.
La duración permite únicamente 1, 3 o 12 meses; el precio debe ser positivo,
con hasta 19 dígitos enteros y dos decimales. El nombre es obligatorio, se recortan
espacios exteriores y tiene hasta 255 caracteres. Es único sin distinguir
mayúsculas, incluso entre planes inactivos.

- `GET /planes`: array de planes activos, ordenado por duración y nombre; `[]` si no hay planes.
  Solo recepción y gerente pueden usar `?incluirInactivos=true`; para clientes devuelve `403`.
- `POST /planes`: solo gerente; requiere `nombre`, `duracionMeses` y `precio`.
  Crea un plan activo y devuelve `201` con su representación.
- `PATCH /planes/{planId}`: solo gerente; acepta los mismos campos y `activo`.
  Omitido/null no modifica; `{}` conserva el plan. Devuelve `200`.
- `DELETE /planes/{planId}`: solo gerente; marca `activo=false` y devuelve `204`,
  incluso si ya estaba inactivo. No elimina membresías ni referencias. PATCH con
  `activo=true` permite reactivarlo.

Datos inválidos devuelven `400`, plan inexistente `404` y nombre duplicado `409`.
Las escrituras concurrentes también están protegidas por un índice único.
La migración V3 valida datos existentes, agrega `activo` y restricciones y amplía
`precio` a `numeric(21,2)`, conservando el rango entero anterior. Si detecta datos
incompatibles, falla con un mensaje para revisarlos; no elimina planes.

La contratación y renovación comprueban que el plan esté activo y conservan
el nombre, precio y duración contratados en períodos históricos separados.
El contrato OpenAPI refleja estos campos, reglas y las cuatro operaciones de
planes, incluido DELETE. La representación monetaria como objeto de otros módulos
sigue siendo draft; no agrega sedes habilitadas ni beneficios al DTO de planes.

### Pruebas de planes

Ejecutar con JDK 21: `./mvnw test` (Windows: `.\mvnw.cmd test`).
Las pruebas cubren validación HTTP, respuestas, autorización de métodos y servicio.
No prueban la validación de JWT.

Para activar las pruebas de persistencia, definir `PLAN_TEST_DB_URL` con una URL
JDBC hacia una base PostgreSQL **vacía y descartable**, usuario `postgres` y sin
contraseña (solo entorno local de pruebas). Flyway aplica las migraciones hasta V9 y Hibernate valida
el mapeo. Estas pruebas verifican decimales, restricciones, orden y conservación
de referencias de membresía al desactivar, concurrencia y actualización desde V2.
Sin la variable se omiten.

### Comprobantes PDF y reembolsos de membresías (M5)

La pasarela simulada mantiene la aprobación de cobros y devoluciones. Al contratar
o renovar una membresía se emite un comprobante único por pago, con número, fecha,
titular, DNI, email, plan, período e importe en ARS. Apache PDFBox genera el PDF;
se guarda en PostgreSQL para conservar los datos originales aunque luego cambien
el usuario o el plan. Es un comprobante académico, sin validez fiscal.

- `GET /pagos/{pagoId}/comprobante`: devuelve `200 application/pdf`,
  `Content-Disposition: attachment` y `Cache-Control: no-store`. El titular consulta
  sus pagos y el gerente cualquiera. Para pagos anteriores sin documento, se emite
  al descargar usando el período histórico y los datos disponibles del titular.
  Un pago pendiente/rechazado no genera comprobante (`409`). El PDF de un pago
  reembolsado se conserva como constancia del cobro original, sin acreditar vigencia actual.
- `POST /pagos/{pagoId}/reembolsos`: sin cuerpo ni clave de idempotencia externa;
  solicita la devolución completa del pago de una membresía dentro de las primeras
  24 horas del cobro (a las 24 horas exactas ya no se permite). Devuelve `200` con
  `pagoId`, `estado=REEMBOLSADO`, `monto`, `moneda=ARS`, `fechaReembolso` y
  `referenciaExterna`. Titular y gerente respetan el mismo plazo. M1 cancela el
  período, recalcula beneficios y conserva el historial; M5 registra la devolución.
  La operación comparte la regla con `/membresias/{id}/periodos/{periodoId}/cancelacion`.
  Repetir cualquiera de las dos rutas no duplica la devolución, incluso en concurrencia
  o cuando el plazo venció después del primer reembolso. Los reembolsos anteriores
  a V6 pueden carecer de fecha y referencia; se devuelven nulas, sin inventar datos.

Sin sesión se devuelve `401`, por pago ajeno o rol no autorizado `403`, pago
inexistente `404`, y plazo vencido o pago incompatible `409`. Recepción no tiene
acceso a estas dos operaciones. Los casos de reservas de cancha devuelven `409`
hasta su integración con M4. La creación y las consultas generales de pagos siguen
en `501`; no se modifica el flujo de reservas.

V6 agrega unicidad por pago y número de comprobante, almacenamiento del PDF,
centavos en detalle de facturación y el registro de una devolución por pago.
Ante comprobantes preexistentes duplicados, la migración se detiene para revisión.

`ComprobantePdfRendererTest` comprueba lectura de PDF, acentos, ajuste de textos y
paginación. Con `PLAN_TEST_DB_URL`, `PagosIntegrationTest` verifica emisión,
descarga HTTP autenticada, permisos, recuperación de PDFs históricos, plazo,
concurrencia y consistencia de membresías/reembolsos. Usa exclusivamente una base
local de pruebas descartable, con las mismas condiciones indicadas arriba.

## Documentación


- Contrato objetivo API v1: [OpenAPI](docs/openapi/openapi.yaml)
- Decisiones del contrato: [Evidencia y decisiones pendientes](docs/openapi/DECISIONES.md)
- Diagramas C4 y ADR: `docs/`
- Bitácoras del equipo: `LOGs/`


## Dominio Cliente/Socio y comprobantes

V7 unifica las autoridades comerciales en USUARIO sin borrar cuentas, períodos ni pagos.
Registro y login emiten esa autoridad estable; la membresía decide condición de Socio
sin volver a iniciar sesión al comprar. La sede habitual no cambia la condición.
Ambas cuentas demo son USUARIO: sus nombres no garantizan membresía.
La contratación POST /membresias incluye cobro fake aprobado y comprobante persistido.
La interfaz consulta pagoId de los períodos y descarga GET /pagos/{id}/comprobante,
con JWT y control de titularidad; no usa el listado demo ni inventa registros.

Pruebas frontend (sin agregar dependencias): desde frontend, ejecutar
`node --experimental-vm-modules scripts/test-dominio.mjs`,
`node --experimental-vm-modules scripts/test-planes.mjs` y
`node --experimental-vm-modules scripts/test-api.mjs`.
Las integraciones PostgreSQL se habilitan con PLAN_TEST_DB_URL exclusivamente hacia
una BD vacía y descartable, con usuario postgres sin contraseña; nunca la BD de desarrollo.
Usar JAVA_TOOL_OPTIONS=-Duser.timezone=America/Argentina/Buenos_Aires para Java/PostgreSQL.
