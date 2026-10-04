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

### Claudio — 04/10/2026

- Conectó el login del frontend con el backend (`POST /auth/login`), reemplazando el mock de `AuthContext`; el rol del usuario se lee del JWT.
- Agregó un proxy de Vite hacia el backend (que no tiene CORS) y corrigió la URL base de la API.
- Manejó la expiración de sesión: descarta el token vencido al cargar la app y cierra sesión automáticamente ante un 401.
- Implementó el módulo `usuario` (perfil propio en `/usuarios/me`, y listado, consulta y modificación de usuarios) con sus DTOs, reemplazando los stubs 501.
- Movió la lógica de alta de `AuthController` a `UsuarioService`, y `Usuario`, `UsuarioRepository` y `RegisterRequest` al módulo `usuario`.
- Definió las reglas de acceso: recepción opera solo sobre socios y clientes de su sede y puede activar o desactivar cuentas; el gerente opera sobre todo; nadie puede desactivar su propia cuenta.
