# Frontend de FitZone Sports

Base inicial en React, Vite y React Router. El login y el registro usan el backend real; las pantallas de negocio todavía muestran datos e interacciones de ejemplo. Para preparar PostgreSQL, iniciar la API y probar endpoints, seguí la [guía local del README principal](../README.md#cómo-levantar-el-proyecto-localmente).

## Requisitos y ejecución local

Necesitás Node.js y npm. Esta base se comprobó con Node.js 24.15.0 y npm 11.12.1.

Primero iniciá el backend en `http://localhost:3000/api/v1` siguiendo la guía principal. En otra terminal, desde `frontend/`:

```bash
npm ci
npm run dev
```

Abrí la dirección local que muestre Vite (normalmente `http://localhost:5173`). Para comprobar la compilación de producción, ejecutá `npm run build`. La salida generada queda en `dist/` y no se versiona.

La pantalla de ingreso muestra las credenciales de prueba `socio@fitzone.com` / `socio123`. La API devuelve un JWT que se guarda en `localStorage`. También podés usar los demás usuarios del README principal.

## Estructura

- `src/routes/AppRoutes.jsx`: rutas de la aplicación.
- `src/components/`: layout, protección de rutas y página para funciones pendientes.
- `src/styles/base.css` y `src/components/Layout.css`: estilos compartidos y navegación adaptable; la iconografía utiliza `lucide-react`.
- `src/context/AuthContext.jsx`: login, registro y restauración de sesión mediante JWT.
- `src/services/api.js`: cliente HTTP usado por la autenticación.
- `src/modules/`: pantallas organizadas según los módulos acordados: M1 Usuarios y Membresías, M2 Gimnasio y Acceso, M3 Clases Grupales, M4 Canchas Deportivas y M5 Pagos y Facturación. `auth/` contiene el ingreso de demostración.

## Navegación disponible

| Ruta | Pantalla actual |
| --- | --- |
| `/login` | Ingreso mediante la API. |
| `/` | Redirige a `/canchas`; sin sesión, termina en `/login`. |
| `/canchas` | Ejemplo de canchas (M4); es el destino inicial. |
| `/clases` | Ejemplo de agenda (M3). |
| `/mi-qr` | Modal de QR simulado (M2); «Cerrar» o Escape vuelve a `/canchas`. |
| `/perfil` | Perfil y membresía de ejemplo (M1). |
| `/comprobantes` | Comprobante de ejemplo (M5). |
| `/recepcion/acceso` | Vista de acceso y aforo con datos simulados (M2). |
| `/admin/canchas/mantenimiento` | Página informativa; mantenimiento todavía no implementado. |
| `/admin/reportes-consolidados` | Página informativa; reportes todavía no implementados. |

El backend valida los permisos de las solicitudes según el rol del JWT. La navegación y los datos de ejemplo del frontend no reemplazan esos controles.

SOCIO muestra canchas, clases, QR, perfil y comprobantes. EXTERNO muestra canchas, perfil y comprobantes. RECEPCION agrega acceso y mantenimiento a las opciones de EXTERNO; GERENTE agrega además reportes. Las direcciones desconocidas redirigen a `/canchas` y pasan por la misma comprobación de sesión simulada.

Los enlaces tienen estado activo y foco visible. Se puede navegar con Tab y Enter y usar «Ir al contenido». El QR usa un diálogo nativo: recibe el foco al abrirse e impide interactuar con el menú de fondo. En pantallas angostas, el menú pasa arriba y la tabla de comprobantes se desplaza horizontalmente dentro de su contenedor, también con teclado.

## Datos e integración pendientes

Las pantallas M1–M5 usan datos fijos o interacciones de ejemplo. El QR no es dinámico; el contador de canchas no bloquea turnos en el servidor; y los botones de reserva, pago, renovación y validación no ejecutan esas operaciones.

El layout muestra un aviso de demostración y las páginas de mantenimiento y reportes indican explícitamente que están pendientes. `node_modules/`, `dist/` y `.vite/` están excluidos de Git mediante el `.gitignore` de la raíz; `package.json` y `package-lock.json` sí se versionan.

`src/services/api.js` lee `VITE_API_URL` y, si no se define, usa `/api/v1`. En desarrollo, `vite.config.js` configura un proxy de `/api` hacia `http://localhost:3000`, por lo que no hace falta configurar esa variable para la ejecución local habitual. El login y el registro ya usan este cliente; la conexión de las pantallas de negocio sigue pendiente.
