# FitZone_Sports

Trabajo Práctico Final de la materia Programación V - Licenciatura en Sistemas.

Sistema de gestión para FitZone Sports: membresías, clases grupales, reservas de canchas y pagos.

## Stack

- **Backend:** Java 21 + Spring Boot 4.1.1 (Maven), PostgreSQL, Flyway, Spring Data JPA, Spring Security + JWT
- **Frontend:** React (pendiente)
- **Arquitectura:** Monolito Modular (ADR-001), organizado por módulo de dominio (`auth`, y a futuro `membresia`, `clase`, `reserva`, `pago`)

## Requisitos

- JDK 21
- Docker (para levantar PostgreSQL)

## Cómo levantar el proyecto localmente

1. Levantar la base de datos:
   ```bash
   docker compose up -d
   ```
   Esto crea un contenedor de PostgreSQL 18 con la base `fitzone` ya creada (usuario/password `postgres`/`postgres`).

2. Correr el backend (el perfil `SPRING_PROFILES_ACTIVE` es obligatorio, no tiene default):
   ```bash
   SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
   ```
   La API queda disponible en `http://localhost:3000/api/v1`.

Al levantar por primera vez, Flyway aplica las migraciones de `src/main/resources/db/migration`. Hibernate valida el esquema sin modificarlo (`ddl-auto=validate`). En dev, `data.sql` agrega una sede y usuarios de prueba.

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

## Usuarios de prueba (seed)

| Email | Password | Rol |
|---|---|---|
| socio@fitzone.com | socio123 | SOCIO_ACTIVO |
| cliente@fitzone.com | cliente123 | CLIENTE_EXTERNO |
| recepcion@fitzone.com | recepcion123 | RECEPCIONISTA |
| gerente@fitzone.com | gerente123 | GERENTE |

Login: `POST /api/v1/auth/login` con `{ "email": "...", "password": "..." }`, devuelve un JWT para usar como `Authorization: Bearer <token>` en el resto de los endpoints.

Registro: `POST /api/v1/auth/register` con `{ "nombre": "...", "apellido": "...", "dni": "...", "email": "...", "password": "...", "sedeId": 1 }`. La sede indicada debe existir.

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

Borrador para organizar el trabajo. Las 54 rutas de negocio usan el prefijo
`/api/v1`. Las del módulo `usuario`, `sede` y planes de membresía ya están implementadas; las demás devuelven
`501 Not Implemented` sin cuerpo si el rol tiene permiso.
Sin autenticación válida se devuelve `401`; con un rol no permitido, `403`.
Los stubs no consultan ni modifican datos. Sus contratos de solicitud/respuesta y filtros
están pendientes. Las anotaciones `@PreAuthorize` usan el soporte existente de
Spring Security (`@EnableMethodSecurity`).

Roles: **S** = SOCIO_ACTIVO, **C** = CLIENTE_EXTERNO,
**R** = RECEPCIONISTA, **G** = GERENTE. GERENTE tiene acceso a todas las rutas.
Se conservan los roles actuales; en los documentos, socio activo se considera
una condición de membresía y su futura representación requiere revisión.

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
solo SOCIO_ACTIVO o CLIENTE_EXTERNO. Puede activar/desactivar cuentas (`activo`) con
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
| acceso | GET | `/accesos/qr` | S, G | obtenerQr |
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
implementada y pública. Los stubs no están conectados todavía al frontend.

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

La contratación/renovación deberá comprobar que el plan esté activo y conservar
el precio y duración contratados al implementarse ese flujo.
El contrato OpenAPI refleja estos campos, reglas y las cuatro operaciones de
planes, incluido DELETE. La representación monetaria como objeto de otros módulos
sigue siendo draft; no agrega sedes habilitadas ni beneficios al DTO de planes.

### Pruebas de planes

Ejecutar con JDK 21: `./mvnw test` (Windows: `.\mvnw.cmd test`).
Las pruebas cubren validación HTTP, respuestas, autorización de métodos y servicio.
No prueban la validación de JWT.

Para activar las pruebas de persistencia, definir `PLAN_TEST_DB_URL` con una URL
JDBC hacia una base PostgreSQL **vacía y descartable**, usuario `postgres` y sin
contraseña (solo entorno local de pruebas). Flyway aplica V1–V3 y Hibernate valida
el mapeo. Estas pruebas verifican decimales, restricciones, orden y conservación
de referencias de membresía al desactivar, concurrencia y actualización desde V2.
Sin la variable se omiten.

## Documentación


- Contrato objetivo API v1: [OpenAPI](docs/openapi/openapi.yaml)
- Decisiones del contrato: [Evidencia y decisiones pendientes](docs/openapi/DECISIONES.md)
- Diagramas C4 y ADR: `docs/`
- Bitácoras del equipo: `LOGs/`
