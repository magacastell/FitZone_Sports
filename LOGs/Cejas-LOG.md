# Bitácora Backend — Claudio Cejas

### Claudio — 09/09/2026

- Inicializó el proyecto Spring Boot del Backend API e lo integró al repositorio compartido.

### Claudio — 10/09/2026

- Implementó la autenticación del backend con Spring Security y JWT, incluyendo login y roles de usuario.
- Configuró la base de datos y separó la configuración por ambiente (dev/staging/prod).

### Claudio — 11/09/2026

- Ajustó detalles de seguridad y calidad del módulo de autenticación (manejo de errores, permisos, configuración).

### Claudio — 27/09/2026

- Completó la entidad Usuario (apellido, DNI, flag de activo) y actualizó el esquema/seed del módulo de autenticación.
- Agregó el endpoint de registro (`/auth/register`) con sus propios DTOs de request y response, hasheo de password y asignación automática del rol de cliente externo.
- Corrigió `CustomUserDetailsService` para que el login respete el estado activo/inactivo del usuario.
