# Recepción — control de acceso y aforo

Estado: bloque aprobado e integrado en `b68e998`; el informe conserva el corte original
de `refactor/recepcion-ui`. Sus menciones a revisión pendiente o contenedor retenido
son históricas. Ver [estado final de la rama](integracion-final-frontend.md).
Base: b2b3a11e4ec99d56891c604e845259ab5caf2224. Fecha: 30/10/2026.

> Evolución posterior (sede habitual): V8/V9 permiten sede null sólo para USUARIO comercial.
> El personal mantiene sede obligatoria; contexto y autorización de Recepción no cambian.
> Ver [verificación](sede-habitual-verificacion.md). La auditoría debajo describe el corte original de este bloque.
> Evolución posterior de UI: Admin de Sede conserva ingreso/salida, aforo y accesos a
> Clases/Canchas preparados; Gerente Central consulta aforo global desde Panel y no
> entra al puesto de Recepción. Los permisos backend M2 existentes no se revocaron.

## Auditoría del modelo actual

Usuario tiene una única relación ManyToOne no nula con Sede, almacenada en
usuario.sedeid. No existe relación N:N de empleados/sedes. UsuarioResponse devuelve
sedeId/sedeNombre; el JWT lleva identidad y authorities, no sede. La pantalla consulta
GET /usuarios/me y usa esa sede. No consulta membresía personal de actores internos.
El filtro JWT recarga autoridades/cuenta activa desde BD. M2 consulta el perfil del
operador para resolver sede: no confía en un claim o selector local.

La intención del TP aportada en este bloque confirma operación local del recepcionista;
no especifica aquí cómo administrar la asignación de empleados. Se conserva el modelo
singular implementado, sin inventar una nueva regla, rol, selector libre o ADR.

Recepción sólo opera su sede: ingreso con sedeId ajeno y aforo ajeno producen 403;
salida también valida que el acceso pertenezca a su sede. Omitir sedeId en ingreso
hace que el servidor use la asignación actual. Manipular el request no amplía permisos.
Gerente ya tiene permiso explícito en controllers y servicio para elegir sede; se
preserva ese soporte y selector real, sin nuevas funciones globales ni rediseño gerencial.
USUARIO no opera M2 administrativo: guard de pantalla y autorización backend.

## Contrato real (prefijo /api/v1)

Todas las rutas requieren Authorization Bearer del JWT de login. No usan
Idempotency-Key. No existe pago ni QR de reserva en este flujo.

| Método/ruta | Request | Response | Permisos / errores principales |
|---|---|---|---|
| GET /usuarios/me | Sin body | 200 UsuarioResponse, incluye rol y sede | Usuario autenticado; 401/403/404 según cuenta |
| GET /accesos/qr | Sin body | 200 {token,venceEn,usuarioId}, no-store | USUARIO/GERENTE, cuenta activa y membresía vigente; 401/403 |
| POST /accesos/ingresos | {qrToken,sedeId?}; Recepción omite sedeId, Gerente lo indica | 201 AccesoResponse | RECEPCIONISTA/GERENTE; 400 QR inválido/body/sede faltante Gerente; 403 cuenta/membresía/sede; 404 recurso; 409 QR vencido/reemplazado o ingreso abierto |
| POST /accesos/salidas | Exactamente {qrToken} o {accesoId}; UI usa QR | 200 AccesoResponse | RECEPCIONISTA/GERENTE; 400 ninguno/ambos/QR inválido; 403 otra sede; 404 sin acceso; 409 QR vencido/reemplazado o acceso cerrado |
| GET /accesos/sedes/{id}/aforo | Sin body | 200 {sedeId,ocupacionActual,capacidadMaxima,calculadoEn} | RECEPCIONISTA propia sede/GERENTE cualquiera; 401/403/404 |
| GET /sedes | Sin body; sólo para selector existente de Gerente en esta UI | 200 lista real | Lectura autenticada; no CRUD en este bloque |
| GET /accesos y PATCH /accesos/{id} | Stub | 501 | Listado y corrección pendientes |

AccesoResponse: {id,usuarioId,sedeId,ingreso,salida,titular:{nombre,apellido,foto}}.
Fechas OffsetDateTime; salida null en ingreso, foto opcional. No trae plan, membresía,
DNI o email del visitante: no se inventan. Aforo incluye calculadoEn real.
Todos pueden fallar con red/5xx; esos casos no son rechazo comercial confirmado.
Validación de body puede producir 400 antes del guard de método; las pruebas de
permisos envían un body válido para verificar autorización y ausencia de escrituras.

## Validaciones y persistencia M2 conservadas

QrTokenService firma con clave derivada distinta a JWT login, tipo qr y 60 s. Sólo
el último QR de codigo_qr es válido; el anterior es reemplazado. Nunca es Bearer.
Ingreso consulta cuenta activa y MembresiaService.tieneMembresiaVigente; no decide
por el nombre Cliente/Socio o por fechas calculadas en React. RN-01 impide un acceso
abierto en cualquier sede; V4 tiene índice único parcial por usuario como protección
final de concurrencia. registro_acceso persiste fecha de ingreso/salida y sede.
Aforo cuenta ingresos sin salida en esa sede. Alcanzar/superar capacidad NO bloquea:
es informativo en el contrato real. Cierre diario existente a las 23:59 argentinas.
Salida por ID no exige membresía vigente; por QR exige QR auténtico/vigente/último.
Si no se puede obtener un QR nuevo al vencer una membresía, existe salida backend por
accesoId. La UI actual no agrega búsqueda/historial ni un modo administrativo por ID.
No hay fallo nuevo de seguridad que requiera cambiar backend o migraciones.

## Composición y código

Se inspeccionó directamente el ZIP actual diseno-de-interfaz-fit-zone.zip:
components/fitzone/access-page.tsx, shared.tsx y src/index.css, incluido responsive.
Portados: PageHeading y sede, toolbar, access-overview-grid 1.25/.75 con gap 18,
reader-panel, selector de movimiento con botones pressed, reader-input-row,
access-result y occupancy-card verde con indicador y pie de actualización.
Metadatos de 8-10 px del mock se elevan a 11-13 px; botones mínimo 44 px y foco visible.
No se copian mocks, DNI/código FZ, toggles de conexión, fechas, fotos o capacidades
inventadas, tabla de movimientos, Next, shadcn, Tailwind ni nuevas dependencias.

Se reutilizan Layout/sidebar/header/identidad, AuthContext, fetchAPI (status/data),
consultarMiPerfil, FitZoneUI/PageHeading/PanelHeading/DataCard/AppButton. CSS aislado
bajo .fitzone-ui.recepcion; sin cambios de estilo a Cliente/Socio o Planes.

- ControlAccesoSede: guard RECEPCIONISTA/GERENTE, contexto real de sede, retry y composición.
  PuestoAcceso se remonta por token; LectorAcceso por sede. No comparte datos entre cuentas.
- m2Service: wrappers del transporte existente; GET por defecto y POST con JSON correcto.
  Ingreso de Recepción no envía sede libre; Gerente envía selección real. Salida sólo QR.
- LectorAcceso: input de keyboard-wedge/manual, Enter/form, selector Ingreso/Salida,
  ref para doble envío, cleanup y resultado real. No normaliza mayúsculas de un JWT.
  Input/tabs bloqueados al enviar, se limpia el código y vuelve foco tras cada respuesta.
- useAforoSede: mantiene polling previo de 15 s, comparte consultas simultáneas y refresca
  tras éxito. Una lectura anterior al POST no sobrescribe la posterior. Al cambiar sede
  oculta inmediatamente datos de la anterior, antes incluso del efecto de recarga.
  Cleanup cancela intervalos y descarta respuestas tardías; no WebSockets ni optimismo.
- TarjetaAforo: presenta DTO real, porcentaje neutral y capacidad alcanzada sólo al
  comparar ocupación/capacidad, sin umbrales de advertencia inventados. Indicador visual
  acotado a 100%, texto refleja sobreocupación. No autoriza ni bloquea ingresos.

No se detecta físicamente el lector conectado: «Esperando QR» indica disponibilidad
del input, no conexión de hardware. Sin cámara ni permisos nuevos. No hay historial
local acumulado presentado como persistido: sólo resultado de la última operación.

## Estados y errores

Contexto cargando/error/reintento/sede ausente diferenciados; sin sede no hay formulario.
Aforo loading sin cero ficticio; error conserva el último dato explícitamente marcado
«Sin actualizar», con retry y calculadoEn. No se altera ocupación al rechazar un POST.
Después de POST confirmado se invalida lectura vieja y consulta aforo sin F5.
Error red/5xx de POST: «No pudimos confirmar el movimiento», verifica aforo sin afirmar
éxito ni reintentar automáticamente. 4xx: rechazo con detail/message real si existe o
explicación por status. No compara strings de negocio ni inventa códigos de error.
El backend actual devuelve motivos legibles (comprobado con QR inválido); no se agrega
contrato uniforme global de errores. 401 conserva limpieza de sesión de fetchAPI.
No se persiste el QR leído ni el resultado en storage; token nuevo remonta el puesto.
Fechas nuevas de M2 se muestran en zona argentina y formato explícito de 24 horas.

## Verificación

- Base limpia y builds frontend/backend correctos antes de crear refactor/recepcion-ui.
- Maven verify: 62 tests, 0 fallos/errores/omitidos. 43 reales PostgreSQL: membresías/M2
  24, planes/migración 8, pagos 11. Se agregaron 6 regresiones M2 a fixtures existentes,
  evitando duplicar setup de usuarios, planes, reloj y transacciones.
- Nuevas pruebas: ingreso/salida HTTP y aforo SQL, no doble presencia entre sedes,
  manipulación de sede en ingreso/salida/aforo, permisos, perfil/sede, QR inválido/vencido/
  reemplazado, suspensión, capacidad informativa y no duplicación de salida.
  La salida por ID después de vencer ya estaba cubierta y se mantiene.
- Fixtures iniciales de pruebas se corrigieron: suspensión depende de suspendida=true,
  no sólo de escribir estado; y permisos requieren body válido para no probar validación.
  Sin cambios a reglas backend para satisfacer tests.
- Frontend VM/esbuild: 97 pruebas (77 previas + 20 Recepción); Planes 16; transporte 13
  (12 previas + contrato M2). Casos: guards, sede, entrada/salida, doble click, limpieza/
  foco, errores, polling/refresco, respuestas viejas/unmount/StrictMode, cambio de cuenta.
  Son pruebas aisladas con hooks/servicios controlados, no se confunden con DOM real.
- Manual con recepcion@fitzone.com: login, destino, sede y aforo 0; QR real de
  cierre.20261030@fitzone.test obtenido de M2 por API e ingresado por teclado+Enter
  (simula lector físico). Ingreso registrado, aforo 0→1, QR inválido rechazado sin
  alterar aforo, salida registrada y aforo 1→0. Foco al input con outline visible.
  SQL verifica un registro cerrado en sede 1, sin personas pendientes; no se crearon
  usuarios/planes/membresías ni cobros para esta prueba. No se afirma uso de hardware USB.
- F5 conserva aforo real y reinicia el puesto, sin fabricar historial. Menú de tablet
  abre, Escape cierra y devuelve foco al botón. Cambio de actor y URL directa protegida.
- La cuenta llamada catalogo.20261030@fitzone.test ya tenía una membresía ACTIVA en
  esta BD al probar: no se la modificó para fabricar ausencia. Regresión sin membresía
  cubierta por suites; nombre de cuenta no equivale a estado de negocio.
- Responsive: 768/1024/1280/1440 y 390 sin overflow horizontal; input usable y botones
  de 44 px. Headings, labels, estados textuales, grupos pressed y status/alert; Enter
  procesa, foco vuelve, contraste visible. No auditoría exhaustiva con lector de pantalla.

Reproducir desde frontend: node --experimental-vm-modules scripts/test-dominio.mjs,
node --experimental-vm-modules scripts/test-planes.mjs,
node --experimental-vm-modules scripts/test-api.mjs y npm run build.
Backend: PLAN_TEST_DB_URL a PostgreSQL descartable, JAVA_TOOL_OPTIONS con
-Duser.timezone=America/Argentina/Buenos_Aires y .\mvnw.cmd verify.
Se utilizó fitzone-recepcion-test, loopback 55432 y volumen anónimo separado;
no forma parte de Compose/runtime. Se conserva detenido para reproducir pruebas.
El entorno manual usa fitzone-postgres / BD fitzone, backend 3000 y Vite 5173.

## Pendientes y alcance

M3/M4 permanecen 501, ocultos del menú operativo. No se implementa Gerencia Central,
CRUD sedes, empleados N:N, reportes, reservas, cámara u offline. El historial de accesos
y corrección manual backend siguen 501; no se crean endpoints para copiar una tabla v0.
Asignación/gestión de empleados multisede no está definida aquí; queda para otro bloque.
Sin cambios a backend productivo, Auth/JWT, contratos, migraciones, M1 ni lógica QR.
Sin commit/push/merge; rama queda pendiente de revisión manual.
