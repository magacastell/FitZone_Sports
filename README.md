# FitZone_Sports

Trabajo Práctico Final de la materia Programación V - Licenciatura en Sistemas.

Sistema de gestión para FitZone Sports: membresías, clases grupales, reservas de canchas y pagos.

## Stack

- **Backend:** Java 21 + Spring Boot 4.1.1 (Maven), PostgreSQL, Spring Data JPA, Spring Security + JWT
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

2. Correr el backend:
   ```bash
   ./mvnw spring-boot:run
   ```
   La API queda disponible en `http://localhost:3000/api/v1`.

Al levantar por primera vez, Hibernate crea el esquema automáticamente (`ddl-auto=update`) y se siembran roles y usuarios de prueba (`data.sql`).

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

## Estructura del backend

```
com.fitzonesports/
└── auth/
    ├── controller/   AuthController
    ├── service/      JwtService, CustomUserDetailsService
    ├── repository/   UsuarioRepository, RolRepository
    ├── model/        Usuario, Rol
    ├── security/      SecurityConfig, JwtAuthenticationFilter
    └── dto/          LoginRequest, LoginResponse
```

Cada módulo de dominio nuevo (`membresia`, `clase`, `reserva`, `pago`) sigue esta misma organización interna.

## Documentación

- Diagramas C4 y ADR: `docs/`
- Bitácora del equipo: `LOG.md`
