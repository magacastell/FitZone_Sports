# Frontend de FitZone Sports

Frontend en React, Vite y React Router. El portal y las vistas de Recepción y Gerencia consumen la API de identidad, membresías, acceso, clases, canchas y pagos según el rol. Para preparar PostgreSQL e iniciar la API, seguí la [guía local del README principal](../README.md#cómo-levantar-el-proyecto-localmente).

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
- `src/services/api.js`: cliente HTTP compartido por los servicios de la aplicación.
- `src/modules/`: pantallas organizadas según los módulos acordados: M1 Usuarios y Membresías, M2 Gimnasio y Acceso, M3 Clases Grupales, M4 Canchas Deportivas y M5 Pagos y Facturación. `auth/` contiene las pantallas de ingreso y registro.

## Navegación disponible

| Ruta | Pantalla actual |
| --- | --- |
| `/login` y `/registro` | Ingreso y alta mediante la API. |
| `/` | Con sesión, deriva a membresía para `USUARIO`, al panel de Gerencia para `GERENTE` y a control de acceso para `RECEPCIONISTA`. Sin sesión, las rutas protegidas llevan a `/login`. |
| `/perfil` y `/membresia` | Perfil y foto, contratación y renovación con pago simulado, vigencia e historial. |
| `/mi-qr` y `/qr-offline` | QR dinámico con membresía habilitada y consulta sin conexión si hay un lote vigente guardado. |
| `/recepcion/acceso` y `/recepcion/aforo` | Ingresos, egresos y aforo de la sede. |
| `/terminal-offline` | Terminal de Recepción con autorización aprovisionada, captura provisional y sincronización al volver la red. |
| `/clases` | Próximas clases por sede con filtro opcional por día. Permite reservar y administrar la agenda según el rol. |
| `/canchas` | Muestra el primer día con turnos libres y permite elegir otra fecha. El modal muestra el importe y el tiempo de retención para confirmar el pago o salir. |
| `/mis-reservas` | Turnos personales de canchas y actividad de clases en la misma pantalla, con cancelaciones y ofertas de lista de espera. |
| `/admin/canchas` | Administración de canchas, turnos, tarifas y mantenimiento según permisos. |
| `/pagos` | Historial de canchas y membresías, estados, reembolsos y descarga de comprobantes. |
| `/comprobantes` | Enlace anterior de comprobantes que redirige a Mis pagos para Cliente/Socio. |
| `/gestion/reportes` y `/admin/reportes-consolidados` | Reportes consolidados pendientes. |

Para Cliente/Socio, **Mis reservas** reúne los turnos de cancha con pago y la actividad de clases. Desde ahí se puede cancelar cuando corresponde y gestionar la lista de espera y sus ofertas. **Mis pagos** conserva el historial financiero y los comprobantes descargables. En **Mi membresía** se muestran el período vigente y el próximo período pagado, cuando existen.

Los permisos y las guardas comerciales se validan en el backend. Las rutas y la navegación se definen en [AppRoutes.jsx](src/routes/AppRoutes.jsx).

Los enlaces tienen estado activo y foco visible. Se puede navegar con Tab y Enter y usar «Ir al contenido». El QR usa un diálogo nativo: recibe el foco al abrirse e impide interactuar con el menú de fondo. En pantallas angostas, el menú pasa arriba y la tabla de comprobantes se desplaza horizontalmente dentro de su contenedor, también con teclado.

## Alcance y pendientes

El acceso offline requiere aprovisionamiento previo y un build PWA. Los movimientos se conservan localmente y se reconcilian al recuperar conexión. El aforo desconectado es provisional. [Guía M2 offline](../docs/m2-offline.md)

Las ofertas de clases aparecen en el portal. El aviso externo se simula en el log del servidor. Siguen pendientes el registro de asistencia, la aplicación de penalidades y los reportes consolidados.

Los importes, el vencimiento de la retención y el resultado del pago de cancha provienen del servidor. El ingreso por reserva queda en el alcance de integración con M2. [Guía de integración M4/M5](../docs/integracion-canchas-pagos.md)

`node_modules/`, `dist/` y `.vite/` están excluidos de Git mediante el `.gitignore` de la raíz. `package.json` y `package-lock.json` se versionan.

`src/services/api.js` lee `VITE_API_URL` y, si no se define, usa `/api/v1`. En desarrollo, `vite.config.js` configura un proxy de `/api` hacia `http://localhost:3000`, por lo que no hace falta configurar esa variable para la ejecución local habitual.
