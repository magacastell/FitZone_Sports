# Frontend de FitZone Sports

Base inicial en React, Vite y React Router. Se puede recorrer sin levantar el backend: los datos y el inicio de sesión actuales son simulados.

## Requisitos y ejecución local

Necesitás Node.js y npm. Esta base se comprobó con Node.js 24.15.0 y npm 11.12.1.

Desde `frontend/`:

```bash
npm ci
npm run dev
```

Abrí la dirección local que muestre Vite (normalmente `http://localhost:5173`). Para comprobar la compilación de producción, ejecutá `npm run build`. La salida generada queda en `dist/` y no se versiona.

La pantalla de ingreso muestra las credenciales de demostración `socio@fitzone.com` / `1234`. El token es ficticio y se guarda en `localStorage`; esto **no** constituye autenticación real.

## Estructura

- `src/routes/AppRoutes.jsx`: rutas de la aplicación.
- `src/components/`: layout, protección simulada de rutas y página para funciones pendientes.
- `src/context/AuthContext.jsx`: sesión simulada.
- `src/services/api.js`: cliente HTTP inicial, todavía sin uso en las pantallas.
- `src/modules/`: pantallas organizadas según los módulos acordados: M1 Usuarios y Membresías, M2 Gimnasio y Acceso, M3 Clases Grupales, M4 Canchas Deportivas y M5 Pagos y Facturación. `auth/` contiene el ingreso de demostración.

## Navegación disponible

| Ruta | Pantalla actual |
| --- | --- |
| `/login` | Ingreso simulado. |
| `/canchas` | Ejemplo de canchas (M4); es el destino inicial. |
| `/clases` | Ejemplo de agenda (M3). |
| `/mi-qr` | Vista de QR simulado (M2); «Cerrar» vuelve a `/canchas`. |
| `/perfil` | Perfil y membresía de ejemplo (M1). |
| `/comprobantes` | Comprobante de ejemplo (M5). |
| `/recepcion/acceso` | Vista de acceso y aforo con datos simulados (M2). |
| `/admin/canchas/mantenimiento` | Página informativa; mantenimiento todavía no implementado. |
| `/admin/reportes-consolidados` | Página informativa; reportes todavía no implementados. |

El selector de actor del menú sirve únicamente para recorrer las vistas durante el desarrollo. No concede ni restringe permisos. Las rutas internas requieren el token simulado, pero no hay autorización real por rol.

## Datos e integración pendientes

Las pantallas M1–M5 usan datos fijos o interacciones de ejemplo. El QR no es dinámico; el contador de canchas no bloquea turnos en el servidor; y los botones de reserva, pago, renovación y validación no ejecutan esas operaciones.

`src/services/api.js` lee `VITE_API_URL` y, si no se define, usa `http://localhost:8080/api/v1`. Actualmente ninguna pantalla invoca este cliente. La configuración local actual del backend usa el puerto `3000`, por lo que esa URL predeterminada deberá revisarse cuando se trabaje la integración. La conexión real con la API y el reemplazo del login simulado corresponden a una etapa posterior.
