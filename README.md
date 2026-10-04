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
    ├── repository/   UsuarioRepository, RolRepository
    ├── model/        Usuario, Rol, Sede
    ├── security/      SecurityConfig, JwtAuthenticationFilter
    └── dto/          LoginRequest, LoginResponse
```

Cada módulo de dominio nuevo (`membresia`, `clase`, `reserva`, `pago`) sigue esta misma organización interna.

## Endpoints iniciales de los módulos

Borrador para organizar el trabajo. Las 53 rutas de negocio usan el prefijo
`/api/v1` y devuelven `501 Not Implemented` sin cuerpo si el rol tiene permiso.
Sin autenticación válida se devuelve `401`; con un rol no permitido, `403`.
No consultan ni modifican datos. Los contratos de solicitud/respuesta y filtros
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

### Pruebas de autorización

`EndpointAuthorizationTest` verifica las restricciones por rol con la seguridad
de métodos de Spring: acceso del gerente a todas las rutas, rechazo de roles
desconocidos y permisos representativos de clientes, socios y recepción.
No prueba solicitudes HTTP, validación de JWT ni reglas de pertenencia o membresía.

Ejecutar con JDK 21: `./mvnw test` (Windows: `.\mvnw.cmd test`). En el entorno
utilizado para preparar este cambio, el wrapper de Maven no pudo iniciar;
las pruebas quedaron pendientes de ejecución.

## Documentación


- Diagramas C4 y ADR: `docs/`
- Bitácoras del equipo: `LOGs/`
