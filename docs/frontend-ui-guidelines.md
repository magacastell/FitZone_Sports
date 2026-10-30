# Guía visual del frontend de FitZone

## Alcance y arquitectura

FitZone real utiliza React 18, Vite, React Router y backend Spring Boot/PostgreSQL.
Reutilizar `fetchAPI`, servicios, AuthContext, rutas y contratos existentes. La interfaz
no sustituye autorización, titularidad, sede ni reglas de negocio del backend.
No migrar a Next.js ni agregar otra arquitectura, store o cliente HTTP por motivos visuales.

La base compartida comprende Layout, sidebar, header, identidad y contenedor responsive.
El portal Cliente/Socio y su Perfil se adaptan en un bloque separado. Los interiores
de Planes y Recepción se adaptarán posteriormente, preservando su funcionalidad.

## Referencia inspeccionada

Fuente: `diseno-de-interfaz-fit-zone.zip`, descargado en el Escritorio; se inspeccionó
sin modificarlo ni instalar sus dependencias.

- Incluye Next.js 16, React 19 y TypeScript (`app/layout.tsx`, `app/page.tsx`),
  además de una entrada y build alternativos con Vite 8 (`src/main.tsx`).
- Utiliza Tailwind 4, shadcn/base-nova, Base UI, CVA, clsx, tailwind-merge,
  tw-animate-css, lucide-react y Recharts. FitZone no incorpora estas dependencias.
- Conceptos útiles: sidebar verde, header de identidad, paneles limpios,
  jerarquía de títulos, botones consistentes, badges semánticos, tablas legibles,
  empty states y formularios ordenados.
- La propuesta usa estado local para roles y navegación, nombres y sedes ficticios,
  planes, comprobantes, movimientos, aforo, estadísticas y un patrón QR ilustrativo.
  No trasladar esos datos ni sus handlers simulados al producto real.
- No copiar metadata/viewport de Next, Server Components/Actions, API Routes,
  next/navigation, next/image ni autenticación ficticia. No se encontraron estos
  últimos mecanismos como requisitos del shell compartido inspeccionado.

## Lenguaje visual y tokens

Software de gestión de gimnasio: sidebar oscura, área principal clara, énfasis en
la operación y datos reales. Evitar adornos, gráficos o estadísticas para llenar espacio.

Los tokens del shell viven en `.app-layout`, en `frontend/src/components/Layout.css`.
No cambiar estilos globales de login/registro o páginas individuales incidentalmente.

| Uso | Valor base |
| --- | --- |
| Fondo de sidebar | `#18382f` |
| Texto de sidebar | `#d3e0d8` |
| Acento / navegación activa | `#cce879` |
| Primario / hover | `#2f704f` / `#245d40` |
| Fondo de contenido | `#f4f6f3` |
| Superficie | `#ffffff` |
| Texto principal / secundario | `#1e2d26` / `#52665a` |
| Borde | `#e2e9e3` |

- Tipografía: stack de sistema existente; sin descargas externas. La referencia
  declara Inter con fallback, pero no es una nueva dependencia del producto.
- Texto normal aproximadamente 14–15 px; metadatos 12 px; títulos de página
  24–28 px; header 16–18 px. No reproducir los textos diminutos de 8–10 px del mock.
- Escala de espacios: 4, 8, 12, 16, 24 y 32 px. Radios 10–14 px, bordes suaves.
- Iconos: lucide-react existente; 18–20 px en navegación, decorativos con aria-hidden.
- Cards: superficie clara, borde discreto, padding uniforme, sin sombras fuertes.
- Tablas: headings claros, estados textuales, acciones explícitas y scroll horizontal
  dentro de una región accesible cuando el contenido lo necesite.
- Formularios: labels visibles, tamaños consistentes, acciones primarias y secundarias
  distinguibles, bloqueo de envío y errores junto al contexto de la operación.
- Badges futuros: activo/éxito en verde; advertencia/vencida en ámbar;
  suspendida/error en rojo; inactivo en gris. Siempre incluir texto, nunca solo color.

## Navegación e identidad

- El rol proviene de `user.rol` del JWT real. Nunca agregar selector de rol/vista.
- Preservar destinos: Cliente/Socio → Mi membresía (`/membresia`); Recepción → Control de acceso;
  Gerente → Gestión de Planes. Las URLs y permisos no cambian con el estilo.
- Usar nombres de negocio: Mi membresía, Mi QR, Comprobantes, Control de acceso,
  Planes. No mostrar M1/M2/M3/M4/M5 como etiquetas de navegación.
- No crear enlaces a capacidades inexistentes copiando el sidebar del mock.
- Perfil es identidad transversal: nombre, email, DNI, sede y rol. Se accede desde
  la identidad/avatar del header y sigue disponible para todos los roles.
- Membresía es una capacidad comercial de Cliente/Socio. El sidebar enlaza
  “Mi membresía” a `/membresia`; `/perfil` conserva la identidad de cuenta y
  sigue accesible desde el header. No redirigir Perfil a la experiencia comercial.
- El nombre del header se consulta mediante `consultarMiPerfil()`. Mientras carga
  o si falla, se usa el email real de sesión. No inventar nombres, fotos ni sedes.
  El árbol se remonta al cambiar token, evitando identidad de la cuenta anterior.
- El header realiza una consulta de perfil por montaje/identidad; Perfil mantiene
  su consulta local. No introducir un caché global solo para eliminar esa lectura.
- Logout conserva el comportamiento existente. Mi QR continúa condicionado por
  membresía real y validación final del backend M2.

## Datos y estados

### Portal Cliente/Socio

La composición mantiene dos niveles: resumen destacado + acceso rápido, y datos
personales + comprobantes. `/membresia` reutiliza los handlers S4 de contratación
y el componente de renovación extraído con su intención persistida; `/perfil`
es exclusivamente identidad. No copiar la lógica simulada del MemberPage de v0.

La presentación se porta del JSX de `member-page.tsx` y de los bloques concretos
de `src/index.css`: `membership-layout`, `membership-card` y sus secciones,
`qr-card`, `member-details-grid`, `member-identity` y `member-data-grid`.
Se conservan proporciones 1.55/0.76, separación 18 px, card mínima de 328 px,
padding 25/27/22 px, radio 18 px y arco decorativo mediante `::after` sin eventos.
Los breakpoints internos de v0 son 1240/1020/820/640 px; el shell aprobado mantiene
su propio menú móvil. Metadatos de 8–10 px se elevan a 11–12 px por legibilidad.

`components/ui/FitZoneUI.jsx` porta `AppButton`, `StatusBadge`, `PageHeading`,
`PanelHeading`, `AvatarCircle` y `EmptyState` de `shared.tsx`, sin TypeScript ni mocks.
`AppLink` adapta el botón a React Router; `DataCard` reúne panel y encabezado.
El CSS se aísla con `.fitzone-ui`, sin alterar las vistas de Recepción o Planes.
Los headings se ajustan a h2/h3/h4 para respetar el h1 del Layout real.
No se crea una tabla genérica sin consumidores: la tabla `fit-table` inspeccionada
en Planes/Recepción se portará junto con su integración en otro bloque.

El plan, precio, inicio y fin salen del snapshot `periodoVigente`; el precio es
el importe pagado de ese período, no una tarifa mensual ni el catálogo actual.
Los próximos períodos salen de `periodos` con estado `PROGRAMADA`. El estado
de membresía y la autorización los determina el backend. La barra muestra la
fracción de tiempo restante entre inicio y fin reales, acotada a 0–100%; los días
son una aproximación en intervalos de 24 horas, redondeados hacia arriba.
Más de cinco días usa verde, tres a cinco naranja y dos o menos rojo, siempre
con texto. Se actualiza visualmente cada minuto y no habilita QR ni acciones.
Sin ambas fechas válidas y ordenadas no se dibuja una barra.
El texto visible es “N días restantes”, acompañado de las fechas exactas.
Si el backend responde VENCIDA, ese estado se presenta explícitamente.
El acceso rápido enlaza al modal M2 real; el icono decorativo no es un QR válido.
Comprobantes usa períodos con pagoId y descarga el PDF real autenticado de M5.
Sin pagoId no se anuncia un comprobante disponible. Las fechas se presentan en horario argentino.

Todo dato debe existir en backend o estar explícitamente marcado como demo/pendiente.
No copiar los KPI, sede Palermo, usuarios, porcentajes, pagos o QR de v0.
Clases y canchas quedan como capacidades pendientes explícitas, sin acciones ni descuentos simulados.

- Loading: mensaje o skeleton accesible, sin valores provisionales inventados.
- Éxito: confirmación de una operación realmente confirmada, con role=status.
- Error: mensaje entendible con role=alert y recuperación cuando corresponda;
  no exponer Failed to fetch, stack traces ni interpretar todos los errores como ausencia.
- Empty: explicar qué falta y ofrecer únicamente acciones soportadas.
- Disabled: estado visible y atributo nativo; conservar bloqueos inmediatos de envío.
- Activa, vencida y suspendida se toman del backend; no recalcular ese estado en
  CSS/React. Las fechas solo alimentan el indicador visual del período.
- Mantener separación entre rol, estado de cuenta y estado de membresía.

## Responsive

Prioridad desktop/notebook para Recepción y Gerencia, web usable para Cliente/Socio.
No sustituye la app móvil del trabajo práctico.

- Sidebar de 256 px en desktop, 232 px hasta 1240 px; contenido flexible y min-width:0.
- Header con identidad truncable y contenido de hasta 1280 px; padding 32/24/16 px.
- Hasta 768 px: menú desplegable en flujo, cerrado inicialmente. No se superpone
  al contenido ni simula un modal. Botón con aria-expanded y aria-controls;
  al abrir enfoca el primer enlace, Escape cierra y devuelve foco al botón.
- Navegar cierra el menú. Perfil siempre es accesible desde el header.
- Cards y formularios futuros deben ser fluidos; las tablas deben poder desplazarse
  sin ensanchar el documento. No comprimir ilegiblemente acciones o textos.
- Probar 1440 px, notebook 1280 px, tablet 768 px y navegador móvil 390 px.
  Los ajustes internos de las pantallas antiguas se registran para sus bloques propios.

## Accesibilidad y revisión

Conservar enlace “Ir al contenido”, foco visible, labels, nombres claros de botones,
jerarquía de headings y mensajes accesibles. Header usa h1; pantallas existentes h2.
La identidad es un enlace real a Perfil; el avatar con iniciales es decorativo.
Mantener contraste en sidebar oscura y estado activo; no depender solo del color.
Respetar prefers-reduced-motion. No esconder acciones necesarias solo por el viewport.

Antes de cerrar cambios visuales: probar las cuatro cuentas, F5, logout/cambio de
usuario, navegación con teclado y tamaños de ventana; ejecutar build y diff --check.
No alterar servicios, reglas de negocio, seguridad ni contratos para lograr una apariencia.
Una captura del mock no sustituye la validación del flujo real.

## Inspección puntual de roles (29/10/2026, sin cambio de modelo)

1. `UsuarioService.registrarCliente` asigna siempre `CLIENTE_EXTERNO`; el registro
   público no admite elegir rol. `AuthController` devuelve JWT con ese rol.
2. `MembresiaService.contratar` crea cuenta/período/pago, sin actualizar `usuario.rol`.
   Devuelve `MembresiaResponse`, no un JWT nuevo. El consumidor S4 actualiza membresía;
   `AuthContext.user.rol` sigue derivándose del token existente.
3. No se encontró conversión automática CLIENTE_EXTERNO → SOCIO_ACTIVO, ni inversa.
   El seed incluye ambos. El servicio de usuarios tampoco expone cambio de rol.
4. Los controladores usan `@PreAuthorize`, además de validar titular, usuario activo
   y sede en los servicios donde están implementados. Resumen del contrato actual:

| Capacidad/rutas | Roles admitidos y límites |
| --- | --- |
| GET/PATCH `/usuarios/me`, GET `/sedes`, GET `/planes` | Los cuatro roles; planes inactivos sólo Recepción/Gerencia. |
| Listar/consultar/modificar usuarios ajenos | Recepción/Gerencia; Recepción sólo su sede y modifica sólo clientes/socios. |
| POST/PATCH/DELETE `/planes`, POST/PATCH `/sedes` | Gerencia; DELETE de plan desactiva, PATCH admite reactivación. |
| GET `/membresias/me`, alta, renovación, configuración automática, cancelación por período | Cliente/Socio/Gerencia en controlador; alta rechaza Gerencia en servicio, que sólo admite Cliente/Socio. Titularidad y cuenta activa se validan según operación. |
| GET `/membresias/{id}`, PATCH `/{id}/estado` | Recepción/Gerencia; administración de Recepción limitada a su sede. |
| GET `/accesos/qr` | Cliente/Socio/Gerencia en controlador, más usuario activo y período vigente no suspendido en servicio. |
| Ingresos, salidas y aforo | Recepción/Gerencia; Recepción opera su sede. |
| Clases/lista de espera/reserva de clase | Los stubs distinguen SOCIO_ACTIVO de CLIENTE_EXTERNO: este último queda excluido; devuelven 501 tras autorización. Personal tiene sus permisos específicos. |
| Canchas/turnos/reservas | Stubs con permisos Cliente/Socio/Gerencia y, para lectura/administración, Recepción; no hay integración de negocio real. |
| Pagos propios, PDF y reembolsos | Cliente/Socio/Gerencia; PDF/reembolsos validan titularidad. Listado general sólo Gerencia; varias rutas de listado/alta siguen stub. |

5. `membresia.estado` controla el QR del frontend y los mensajes de membresía;
   M2 confirma mediante `tieneMembresiaVigente`, que comprueba períodos reales,
   suspensión y cuenta activa. La barra no participa. El menú Clases aún depende
   del rol SOCIO_ACTIVO y apunta a demo: no es un beneficio funcional integrado.
6. Al vencer un período, la respuesta/persistencia de membresía pasa a VENCIDA
   según la consulta/job existentes; no se cambia rol ni JWT. Se impide nuevo QR
   e ingreso; se conserva renovación manual. M2 permite registrar la salida de
   quien ya está adentro sin exigir vigencia para esa salida.
7. M2 permite acceso en otra sede: `consultarParaAcceso` no restringe sede del
   titular y `registrarIngreso` resuelve la sede del operador. No es un privilegio
   exclusivo de SOCIO_ACTIVO: también funciona para CLIENTE_EXTERNO con membresía
   vigente. No se encontró un beneficio multisede adicional de ese rol en M3/M4;
   sus operaciones siguen stub.
8. `docs/membresias.md` documenta el rol legado; `docs/openapi/DECISIONES.md`,
   P01/P02, deja el modelo futuro pendiente de validación del equipo. P03 incluye
   una actualización de implementación sobre la separación de rol y vigencia.
   `MembresiaIntegrationTest.contratacionCobraUnaVezYConservaMesCalendario` prueba
   QR para CLIENTE_EXTERNO con membresía; `vencimientoExactoYRenovacionSinCobroRetroactivo`
   comprueba VENCIDA, QR 403 y renovación posterior. Se inspeccionaron estos tests;
   no se ejecutaron pruebas backend ni se alteraron datos para esta revisión.

El JWT lleva una foto del rol para el frontend. `JwtAuthenticationFilter` carga
las autoridades actuales de la BD para autorizar peticiones; no hay refresco de
roles del frontend al contratar. Cualquier cambio futuro exige acordar primero
el modelo y revisar ambas partes, sin resolverlo silenciosamente desde React.

### Referencias v0 inspeccionadas para siguientes bloques

- `access-page.tsx`: encabezados/paneles/badges compartidos, tabs de ingreso/salida,
  formulario de lector, resultado, aforo y tabla de movimientos. Sus códigos,
  ocupación y conexión simulada no se portan.
- `plans-page.tsx`: `PlanForm`, catálogo, filtros/búsqueda, `fit-table`, estado y
  acciones por fila. No se portan ahora sus handlers locales ni socios asociados.
  La futura integración debe respetar baja lógica y snapshots históricos reales.
- `manager-dashboard.tsx`: paneles, KPI, gráficos Recharts, tablas y vencimientos.
  No se portan KPI, gráficos, reportes ni dependencias sin fuente de datos real.
- `shared.tsx`, `member-page.tsx`, `src/index.css`, entrada `src/main.tsx` y shell
  `fitzone-app.tsx`: presentación React portable, sin necesidad de migrar a Next.


## Renovación anticipada: presentación y evidencia

Se mantiene la renovación habilitada con períodos futuros. `docs/membresias.md`
documenta que se agrega al último período pagado no cancelado; `agregarPeriodo`
calcula inicio = max(ahora, máximo fin no cancelado), fin = inicio.plusMonths(duración).
Esto soporta encadenar períodos y no establece un límite comercial de anticipación.
El test de renovación anticipada cubre un período futuro y replay, no explícitamente
varios futuros. Si el equipo desea un límite de compra anticipada, debe definirlo
como nueva política de dominio; no se impone unilateralmente desde la UI.
Se presentan todos los PROGRAMADA del DTO en una lista compacta, una sola vez.
Los intervalos son [inicio, fin); el trigger V5 rechaza superposición no cancelada.
En el límite compartido termina el anterior y comienza el siguiente, sin perder vigencia.


## Autoridad estable y experiencia comercial (30/10/2026)

ADR-007 sustituye la política histórica de roles de este documento: USUARIO es
identidad comercial estable; Socio sólo cuando el DTO compartido informa ACTIVA.
VENCIDA/SUSPENDIDA mantienen historial y acciones existentes, sin beneficios QR.
Recepción/Gerencia conservan autoridad y perfil sin membresía personal.
Sin cuenta de membresía se muestra Elegí tu plan, catálogo real activo y confirmación
usando el flujo S4 extraído a ContratacionMembresia. No se muestran credencial, renovación,
comprobantes ni demos como capacidades disponibles antes de tener datos reales.
Se conservan panels, botones, colores y espaciado v0; CatalogoPlanes adapta esos patrones
sin agregar beneficios o planes mock. El portal aprobado aparece tras el DTO confirmado.
Los comprobantes usan exclusivamente periodos con pagoId y PDF autenticado de M5;
no se infieren fecha de pago ni estado financiero desde el inicio/estado del período.
Layout y Perfil usan nombreActor para evitar etiquetas comerciales derivadas del JWT.

### Comprobantes personales

Cards con heading descriptivo, referencia real de pago, período snapshot e importe
es-AR/ARS; botones de descarga con nombre accesible único y altura mínima 44 px.
Grid responsive usando panels/tokens de FitZoneUI, sin una librería adicional.
Orden descendente por inicio del período, anunciado como tal: no conocemos emisión
ni fecha de pago desde este DTO. Número de comprobante y fechas de cobro están en PDF.
No inferir APROBADO/REEMBOLSADO desde un período. CANCELADA se muestra como período
cancelado y no como resultado financiero. Se conserva el documento del cobro original.
Feedback de descarga en región viva, temporal (4 s), con texto «Descarga iniciada»;
el navegador decide dónde guardar. Errores comprensibles, botón PDF habilitado para
reintentar; bloqueo inmediato por ref y cleanup al desmontar. Loading/error/empty
son distintos. Cuenta sin membresía vuelve al catálogo por URL directa; roles internos
reciben una pantalla de no disponibilidad. La seguridad efectiva sigue en M5.
Clases y Canchas permanecen fuera del menú; sus rutas sólo explican que no están disponibles.

### Recepción: operación local (30/10/2026)

Ver contrato, auditoría y pruebas en [Recepción y M2](m2-recepcion.md).
La composición se porta de access-page.tsx de v0: heading con sede, toolbar, panel
lector con Ingreso/Salida y resultado, card de aforo lateral. Se omiten el toggle
fake de conexión y la tabla de movimientos (listado real 501). No mostrar códigos
FZ o DNI como alternativas si la API sólo recibe QR. Labels de disponibilidad del
puesto no certifican conexión física del lector. No copiar metadatos de 8 px: mínimo
11-13 px y controles de 44 px, con foco visible. Selector por botones aria-pressed,
input enfocable + Enter, resultado status/alert. No modales para cada escaneo.
Aforo calculado por servidor, porcentaje neutral, capacidad informativa. Último dato
con calculadoEn argentino/24 h y estado explícito si falla refresco. No simular aforo
sumando/restando al aprobar. Sidebar de Recepción: Perfil + Operación/Control de acceso;
Gerente conserva sus permisos existentes y Planes, sin ampliar capacidades.
