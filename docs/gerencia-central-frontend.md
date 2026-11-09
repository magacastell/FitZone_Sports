# Gerente Central: auditoría y experiencia frontend

## Corte y cierre anterior

Rama feature/integracion-final-frontend. Base del pedido:
47e131cea679197641ca783a4f513ac3b8d9f4fa. Recepción/M3/M4 se cerró en un único
commit coherente, 65e0eff7da819f68d7c0c0eb5b4ca8830be86070:
`feat(frontend): preparar clases y canchas por actor` (16 archivos).
Ya se trabajaba en la rama paraguas, por lo que no hubo merge ni nueva rama.
Gerencia recibió aprobación para el cierre definitivo de la rama. El estado sin
commit de la implementación quedó superado por ese cierre; ver
[entrega de integración](integracion-final-frontend.md). No se integra a main.

## Auditoría real

Fuentes: controllers/servicios/DTOs de Plan, Sede, Usuario, Membresia, Acceso, Pago y
Reporte; OpenAPI stable/draft y documentación existente. Referencia visual local:
diseno-de-interfaz-fit-zone.zip, manager-dashboard.tsx, branches-page.tsx,
reports-page.tsx y management-shared.tsx. Se conservan cards, filtros, jerarquía,
tablas y shell; se descartan DEMO, gráficos sin respaldo, estado operativo inventado,
recaudación ilustrativa y dependencias Next/Recharts/shadcn.

| Área | Backend de GERENTE | Frontend de este corte |
|---|---|---|
| Planes | GET/POST/PATCH/DELETE funcionales; baja lógica y reactivación | CRUD existente intacto; sólo presentación coherente |
| Sedes | GET global, POST 201 y PATCH 200 reales | Listado global, crear/editar nombre/dirección/capacidad |
| Usuarios | GET /usuarios global, filtro sede opcional; GET/PATCH /usuarios/{id} funcionales | Consulta global y búsqueda local por nombre/email/DNI; sin mutaciones |
| Membresías | GET /membresias/{id} por ID de membresía; Gerente global. Renovación, estado, automática y cancelación existentes | Consulta por ID explícito; no se agregan operaciones administrativas |
| Accesos | QR/ingreso/salida/aforo funcionales. Gerente indica sede en operación; GET /accesos y PATCH de corrección 501 | Aforo por cada sede real sólo en Panel, sin operación de ingreso/salida ni historial falso |
| Pagos | PDF/reembolso funcionales con permisos Gerente; GET /pagos, /pagos/me, /pagos/{id} y POST /pagos son 501 | No hay indicador financiero ni nueva gestión de pagos |
| Reportes | GET /reportes/ocupacion e /ingresos, sólo GERENTE, ambos 501 | Filtros y consulta con mensaje pendiente, sin gráficos/valores fabricados |
| M3/M4 | Controllers stub; roles no prueban aislamiento ni casos de uso | Continúan esperando backend; no se añade gestión desde Gerencia |

SedeRequest: nombre no vacío <=255, dirección opcional <=255, capacidad máxima
positiva obligatoria. PATCH omitido/null no modifica; dirección vacía sí puede
persistirse como vacía. Nombre duplicado case-insensitive 409; recurso ausente 404;
validación 400. No hay borrar sede ni estado operativa/inactiva confirmado.

UsuarioResponse no contiene estado comercial ni membresiaId. No existe listado
global de membresías ni búsqueda por usuario. No se llama GET /membresias/{usuarioId}
ni se hacen consultas por tanteo: ambos IDs son independientes. La vista separa
usuarios de consulta de membresía por su ID conocido. Plan y período histórico se
obtienen sólo del DTO MembresiaResponse recibido, sin derivar estado por fechas.

## Navegación y alcance

GERENTE inicia en /gestion/panel. Sidebar e identidad: Gerente Central,
Administración global → Panel general, Planes, Sedes, Usuarios / Membresías,
Reportes. Perfil sigue disponible. Se retira Control de acceso/aforo del menú de
Gerente; la URL operativa de ingreso/salida redirige a Panel general. El aforo
global sigue siendo consulta dentro del Panel, sin acciones de movimiento.
No se deriva alcance desde la sede del perfil; esa asociación sigue siendo dato
de cuenta y no una frontera de permisos de Gerencia.

Las nuevas rutas tienen guard GERENTE, con contexto remontado por token/vista y
cleanup de lecturas/escrituras tardías. USUARIO y RECEPCIONISTA se redirigen a Perfil
sin consultas de Gerencia. Planes conserva su guard previo. Backend autoriza cada
endpoint: el menú/guard no sustituye Spring Security.
La corrección es de recorrido frontend: no revoca el permiso GERENTE que todavía
existe en los endpoints M2. Cambiar ese permiso requeriría un bloque backend aparte.

No se cambia autoridad, JWT, dominio Cliente/Socio, traslados, empleados, suspensión,
desactivación de usuarios ni reglas M2. Aunque algunas mutaciones administrativas
existan, este corte mantiene Usuarios/Membresías sólo de consulta, evitando un CRM.

## Panel actual frente a Reportes

Panel general muestra sólo conteos de listas completas de sedes y usuarios reales.
Usuarios registrados incluye cuentas internas/comerciales, activas/inactivas: no es
un KPI de socios activos. No se convierte error/loading en cero. Aforo se consulta
individualmente para cada sede, con fecha de lectura y recuperación independiente;
no se suma una cadena parcialmente cargada ni se promete snapshot atómico.
Actualizar panorama reconsulta listas y renueva las lecturas; cada sede tiene retry.

Reportes presenta análisis histórico, distinto del aforo actual. OpenAPI los marca
draft con rango [desde,hasta), sede opcional y fechas OffsetDateTime. Se envían
límites de medianoche argentina; Hasta se etiqueta sin incluir. Se ofrecen únicamente
ocupación e ingresos financieros, las dos rutas existentes. 501 se muestra como
consulta pendiente y no como un reporte vacío. Un eventual 200 requiere integrar
su representación antes de anunciar resultados.

La composición visual de Reportes sigue reports-page.tsx de v0: filtros, resumen
del período (membresías/accesos/financiero), dos espacios de evolución temporal y
comparación por sede. Cada espacio declara «Datos no disponibles: pendiente
servicio de reportes». No hay series, ejes, porcentajes, cero sustitutivo ni datos
MOCK/DEMO. Es frontend preparado, no reporting implementado. Panel general no se
repite: mantiene únicamente sedes/usuarios actuales y aforo real por sede.

| Sección preparada | Agregación/contrato backend faltante |
|---|---|
| Resumen: membresías | Reporte por rango/sede con definiciones de altas, renovaciones y estados históricos; no existe endpoint de reporte de membresías ni listado global de membresías por usuario. Confirmar métricas con el equipo. |
| Resumen: accesos | Agregación histórica por rango/sede. Cerrar e implementar el contrato draft /reportes/ocupacion; aforo actual no reemplaza esta información. |
| Resumen: financiero | Cobros/devoluciones, moneda y criterio temporal por rango/sede; implementar /reportes/ingresos. No se extraen importes de PDFs ni de /pagos 501. |
| Evolución | Series temporales ordenadas, granularidad y zona horaria acordadas para accesos y finanzas; cerrar DTOs draft y su relación con los totales. No se inventa una ruta nueva desde React. |
| Comparación por sede | Mismo rango y definiciones por cada sede, cobertura de datos y tratamiento de sedes sin datos; desglose consolidado de los reportes, aún pendiente. |

Para Admin de Sede, M2 es implementado; Clases/Canchas es frontend preparado.
Quedan pendientes backend M3/M4, disponibilidad, reservas, mantenimiento y contratos
definitivos de autorización local, catálogos y precio final. Propuesta pendiente:
gestión operativa de recursos propios por Admin de Sede y eventual supervisión
global de Gerencia. No se habilita gestión M3/M4 de Gerente por ser global.

Pendiente backend: agregados globales de membresías activas, accesos históricos,
recaudación/reembolsos y comparación histórica entre sedes. También hace falta un
contrato de membresía por usuario o listado paginado global, catálogos/DTOs
combinados y semántica estable para reportes. No se calculan cifras financieras
mediante PDFs ni por rastreo de membresías. No se agrega BI ni migración/ADR.

## Verificación y límites

- 140 pruebas aisladas de dominio/UI, 16 Planes, 14 transporte existente,
  18 transporte M3/M4 y 7 de transporte Gerencia: aprobadas.
- Nuevas regresiones: guards, navegación global, estados loading/error/501,
  cifras parciales, alta de sede con doble envío bloqueado, conflicto conservando
  formulario, consulta global sin asociar IDs, histórico y 404 de membresía,
  desmontaje tardío y preservación de métodos/rutas/body/reexports/errores.
- Build frontend y git diff --check correctos. Sin dependencias nuevas ni backend
  modificado: no se repite la batería PostgreSQL.
- HTTP real gerente: sedes, usuarios, planes incluyendo inactivos y aforo 200;
  accesos históricos, pagos globales y ambos reportes 501. Revisión de UI:
  login→Panel, usuarios reales/búsqueda, membresía real por ID, sede→editar/cancelar,
  filtros→501 de Reportes. No se crearon ni editaron datos normales para llenar UI.
- Escrituras de Sedes se verifican en pruebas frontend con respuestas controladas
  y contra contrato backend inspeccionado; no se afirma haber creado una sede nueva
  manualmente. POST Sede no tiene Idempotency-Key: no se reintenta automáticamente;
  ante red/5xx se pide actualizar listado y verificar resultado antes de reintentar.
- Panel, Planes, Sedes, Usuarios y Reportes en 390/768/1024/1440 sin overflow del
  documento. Tabla de usuarios/planes conserva scroll interno accesible en móvil.
- BD dev tiene una sola sede. No se crean sedes falsas para aparentar alcance global;
  las consultas no aplican filtro por sede de perfil. Los estados error/varias sedes
  se complementan mediante pruebas aisladas, sin afirmar E2E inexistente.
- Evidencias de navegador y logs en target/gerencia-*, ignorados por Git.

## Archivos del bloque de Gerencia

- frontend/src/modules/gerencia/Gerencia.jsx y Gerencia.css
- frontend/src/services/gerenciaService.js
- frontend/src/components/Layout.jsx
- frontend/src/routes/AppRoutes.jsx
- frontend/src/modules/m1-usuarios/GestionPlanes.jsx (sólo clase/import CSS)
- frontend/src/modules/m2-acceso/ControlAccesoSede.jsx (sólo guard de recorrido Gerente)
- frontend/scripts/test-dominio.mjs y test-planes.mjs
- frontend/scripts/test-gerencia-service.mjs
- docs/frontend-ui-guidelines.md y este informe

Cliente/Socio, Recepción/M2 y Planes se conservan funcionales. M3/M4 sigue preparado
con 501 honesto. Permisos funcionales de administración M3/M4, reporting, agregados
y relación de consulta Usuario→Membresía permanecen pendientes del equipo backend.
