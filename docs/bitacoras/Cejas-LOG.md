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

### Claudio — 05/10/2026

- Implementó la lógica inicial del módulo `sede` (listar, crear y modificar sedes) con sus DTOs y servicio, reemplazando los stubs 501. Por ahora es solo la base; quedan pendientes reglas adicionales.
- Definió las reglas de acceso: todos los roles listan las sedes, solo el gerente las crea o modifica, y el nombre es único.
- Movió `Sede` y `SedeRepository` del módulo `auth` al módulo `sede`.
- Hizo que el menú del frontend se muestre según el rol del usuario logueado (leído del JWT), manteniendo el desplegable de vista de desarrollo para previsualizar otros roles.

### Claudio — 13/10/2026

- Implementó el QR de acceso del socio: `GET /accesos/qr` emite un token firmado que vence a los 60 s (RF-04) y lo guarda en `codigo_qr`, una sola fila por socio, así que cada renovación invalida el QR anterior. Se firma con una clave derivada de `jwt.secret` para que no sirva como Bearer del login.
- Implementó el ingreso (`POST /accesos/ingresos`): valida firma, vencimiento y que sea el último QR emitido; aplica RN-01 (409 si ya hay un ingreso abierto, con índice único parcial en la migración V4); recepción opera su sede y el gerente indica la sede. El ingreso se decide por rol (SOCIO_ACTIVO y GERENTE) hasta que exista la membresía.
- Implementó la salida (`POST /accesos/salidas`, por `accesoId` o volviendo a escanear el QR) y el aforo real por sede (`GET /accesos/sedes/{id}/aforo`: ingresos sin salida frente a la capacidad máxima, informativo).
- Agregó el cierre diario `CierreDiarioAccesos`: a las 23:59 (zona de Buenos Aires) cierra los ingresos olvidados y el aforo vuelve a 0. Fijó la zona horaria en el `Clock` porque el servidor corre en UTC.
- Frontend: `SocioQRModal` muestra el QR real con cuenta regresiva y se renueva solo (`qrcode.react`); `ControlAccesoSede` valida ingreso y salida con lo que escribe el lector 2D y muestra el aforo real, reemplazando el simulado.

### Claudio — 10/11/2026

- Implementó M3 Clases grupales (RF-06, RF-07, RF-08): agenda paginada con filtros por sede y día, alta, edición y cancelación administrativa de clases por sede (recepción solo la suya, gerente cualquiera), y catálogos de instructores y tipos de clase (`/instructores`, `/tipos-clase`). El nombre de la clase sale del tipo. La migración V15 agrega `fin` y `estado` a la clase, saca `fecha` (repetía el día de `horario`) y crea la tabla de ofertas con sus índices.
- Reservas y cancelaciones: se reserva hasta 48 h antes del inicio y se cancela sin penalización hasta 2 h antes; después queda como cancelación tardía (solo se marca, sin sanciones). Una cancelación del admin no cuenta como falta.
- Garantías de concurrencia: la clase se bloquea (`FOR UPDATE`) al contar el cupo (reservas confirmadas más ofertas pendientes) y al reservar, así nunca se excede la capacidad; el índice único parcial `uk_reserva_clase_confirmada` evita reservas duplicadas; un bloqueo por usuario y otro por instructor evitan clases superpuestas.
- Lista de espera con Observer: `PublicadorClase` avisa los eventos (cupo liberado, oferta generada, clase modificada o cancelada); `GestorListaEspera` ofrece el lugar al primero de la fila (vigencia de 8 h o hasta 1 h antes de la clase) y `NotificadorClase` avisa después del commit (canal simulado en log, detrás del puerto `Notificador`). Un job vence las ofertas no respondidas y pasa el lugar al siguiente.
- Agregó `GET /clases/me` (reservas, lista de espera y ofertas del usuario). El registro de asistencia queda en 501.
- Frontend: nueva pantalla de Clases con reservar, cancelar, anotarse y salir de la lista, aceptar o rechazar la oferta, y para recepción y gerente crear, editar y cancelar clases y ver asistentes; se sumó el enlace en el menú del gerente.
- Actualizó el contrato OpenAPI y `DECISIONES.md` con las operaciones y rutas nuevas de M3.
