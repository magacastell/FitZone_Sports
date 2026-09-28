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

## Documentación

- Diagramas C4 y ADR: `docs/`
- Bitácora del equipo: `LOGs/LOG.md`
