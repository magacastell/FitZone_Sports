# Entrega de integración de FitZone

Rama para revisión: `feature/integracion-final-frontend`. Corte: 30/10/2026.
No implica adopción ni merge a `main`.

## 1. Objetivo

El trabajo comenzó para integrar y unificar el frontend existente con la composición
visual de v0. Al recorrer los flujos aparecieron inconsistencias funcionales, deuda
heredada y contratos incompletos que convenía resolver antes de montar las vistas.
Se mantuvieron React/Vite, el monolito modular, JWT, los servicios y la persistencia
existentes. No es una reescritura ni la finalización de los módulos del resto del equipo.

## 2. Punto de partida y trazabilidad

Git confirma como origen de la rama `3ee92e88b2e66e4e25b43b5e5f6c597af175e201`
(reflog de creación desde `main` y merge-base con la referencia local de `main`).
Ese corte ya contenía la primera integración S4 de M1; no se atribuye nuevamente
a esta rama. El inventario se obtiene con `git diff --stat 3ee92e8..HEAD` y el
historial con `git log --reverse --oneline 3ee92e8..HEAD`.

Antes se usaban `CLIENTE_EXTERNO` y `SOCIO_ACTIVO` como authorities comerciales,
pero comprar o vencer no sincronizaba esa identidad. Podía existir, por ejemplo,
`CLIENTE_EXTERNO + membresía ACTIVA`. Eso mezclaba autorización estable, identidad
y condición comercial temporal. Además, el registro frontend enviaba silenciosamente
`sedeId = 1`; el backend exigía sede a todo Usuario aunque no la hubiera elegido.

| Commit | Aporte |
|---|---|
| `49803c1` | Navegación por rol real, perfil e identidad |
| `6f599c4` | Gestión de Planes conectada |
| `3fbaffe` | Sistema visual base compartido |
| `6158495` | Composición v0 del portal y separación Perfil/Membresía |
| `b5a7e9c` + `b2b3a11` | Autoridad estable y experiencia Cliente/Socio, PDF y pruebas; adoptar juntos |
| `b68e998` | Recepción y transporte/experiencia M2 |
| `e12e846` + `47e131c` | Sede habitual, regresiones del ciclo y presentación Cliente/Socio |
| `65e0eff` | Preparación frontend de Clases/Canchas por actor y aforo separado |
| `d5bb461` | Gerencia Central según soporte real, con Reportes preparados |

El commit de documentación que contiene esta entrega completa el cierre, sin cambios
funcionales adicionales. El historial es lineal; las subramas se integraron por
fast-forward y algunos bloques se cerraron directamente en la rama paraguas.

Inventario contra esa base: 48 archivos frontend (incluye cinco scripts de pruebas
y tres ilustraciones SVG); 19 Java productivos; seed dev y tres migraciones nuevas;
seis tests Java modificados y un fixture SQL; doce documentos bajo `docs`, README
y bitácora. No hay cambios de dependencias ni configuración de build en esta rama.

## 3. Soluciones adoptadas

**Autoridad y estado comercial.** `USUARIO`, `RECEPCIONISTA` y `GERENTE` son authorities
estables. Socio es la condición derivada de una membresía `ACTIVA`, confirmada por M1;
no requiere relogin al contratar. Fechas, barra y días restantes son presentación,
sin otorgar acceso. M2 valida nuevamente la vigencia en backend.

**Sede habitual.** Un Cliente puede registrarse sin sede. La elige al contratar por
primera vez junto con el plan; sede, pago fake, período y comprobante se confirman en
la transacción existente. Un pago rechazado no deja sede asignada. Idempotencia
conserva plan+sede+clave en los reintentos, sin crear automáticamente otra intención.
`Usuario.sedeId` es habitual comercial y sede operativa para Recepción;
`Membresia.sedeId` conserva el origen histórico del alta. No hay traslado posterior
implementado. La habitual no limita acceso multisede ni los beneficios futuros de
Clases/Canchas: esas reglas y sus contratos deben completarse en M3/M4.

**Ciclo.** ACTIVA requiere período vigente no cancelado y ausencia de suspensión;
VENCIDA conserva cuenta, sede e historial; SUSPENDIDA bloquea beneficios sin borrar
períodos. La renovación anticipada agrega períodos futuros; vencida, comienza en
`max(último fin no cancelado, ahora)` sin cobrar el hueco anterior. Historial,
origen de sede y comprobantes se conservan. No se agrega gracia ni límite artificial
de anticipación. Suspensión no ofrece una renovación nueva; quedan recuperables
los intentos previos. El aviso de vencimiento es visual, no una política comercial.

**DB/backend.** V7 migra authorities sin borrar cuentas/pagos; V8 permite sede null
comercial y conserva personal con sede; V9 fija el contexto de funciones SQL de esa
regla. No se reescriben V1–V6. Los cambios Java afectan JWT, anotaciones de seguridad
de módulos existentes, Usuario y contratación M1; M5 conserva snapshots y mejora
la emisión PDF sin regenerar bytes ya persistidos. M3/M4 sólo adaptaron authorities,
no incorporaron servicios de negocio. Detalles en [ADR-007](adr/0007-actores-y-membresia.md),
[sede habitual](sede-habitual-verificacion.md) y [ciclo](ciclo-vida-membresia-verificacion.md).

## 4. Experiencias implementadas y preparadas

| Actor / área | Implementado | Preparado / pendiente |
|---|---|---|
| Cliente/Socio | Perfil real; catálogo activo; contratación plan+sede y pago fake; transición sin relogin; portal, períodos, renovación e idempotencia; QR dinámico; comprobantes por períodos y PDF autenticado | Pasarela real y políticas administrativas futuras |
| Admin de Sede / Recepción | Ingreso, salida y aforo M2 reales; contexto local de sede; lector/teclado, errores y recuperación | Historial/corrección de accesos backend siguen 501 |
| M3 Clases | Navegación y consulta preparada por sede; contexto de Socio activo y sede local de Admin | **Frontend preparado / backend pendiente**: catálogo funcional, reservas, asistencia, espera y administración |
| M4 Canchas | Vistas y consulta preparada por sede; separación visual de recurso, disponibilidad y reserva | **Frontend preparado / backend pendiente**: disponibilidad, reservas, retención/pago, mantenimiento y precio final |
| Gerente Central | Panel actual con sedes/usuarios y aforo real por sede; Planes; crear/editar Sedes; consulta de Usuarios y membresía por ID conocido | Reportes preparados; agregaciones y búsqueda/listado global de membresías inexistentes |

En M3/M4, habitual es filtro inicial, no límite multisede. Cliente y vencido se
presentan sin beneficios activos; tarifa externa y beneficios de Socio son intención
comercial documentada, **no cálculo de precio implementado**. Cancha es recurso,
Disponibilidad es fecha/franjas y Reserva es titular/horario/precio/estado.
Las ilustraciones locales por categoría sólo acompañan recursos recibidos: no
inventan canchas, tarifas o disponibilidad. El importe definitivo debe llegar del backend.

Panel General representa el estado actual. Reportes representa análisis histórico
por rango/sede: filtros, Resumen del período, Evolución y Comparación por sede, sin
KPIs ni gráficos ficticios. `501` se muestra como servicio pendiente, no como cero.
Gerente no entra al puesto local de Recepción en UI; conserva consulta global de
aforo. Eso no revoca los permisos GERENTE que aún existen en backend M2.

## 5. Deuda técnica corregida y limpieza del cierre

| Problema → consecuencia | Solución |
|---|---|
| Authority comercial temporal → menú y vigencia podían divergir | Autoridad estable y condición comercial confirmada por M1 |
| Sede silenciosa en registro → afiliación sin elección | Registro sin sede y elección transaccional al contratar |
| Vistas con datos de ejemplo → acciones que aparentaban integración | Datos reales o estados loading/error/vacío/501 explícitos |
| Respuesta monetaria incierta → riesgo de repetir intención | Clave/payload conservados, bloqueo inmediato y reconciliación |
| Perfil mezclado con afiliación → personal con mensajes comerciales impropios | Perfil para todos; membresía comercial separada |
| Estado financiero inferido del período → historial engañoso | Comprobantes de pagos identificados y PDF autorizado, sin inventar estados |

El cierre sólo actualiza documentación contradictoria y enlaza los cortes históricos.
No hubo limpieza funcional necesaria. Se mantienen componentes/rutas placeholder
todavía referenciados, informes/fixtures reproducibles y código histórico sin evidencia
inequívoca de obsolescencia. No se reorganizan carpetas ni se agregan convenciones.
Capturas, logs, dumps locales y builds quedan ignorados en `target`/`dist`, fuera del
aporte Git; no son requisitos del runtime ni se publican.

## 6. Pendientes del equipo

- Backend funcional M3/M4, contratos definitivos, autorización por sede/propiedad,
  disponibilidad/reservas, asistencia/espera, mantenimiento y precio final.
- Reportes históricos de membresías/accesos/finanzas, series y comparación por sede;
  listado o búsqueda global de membresías sin confundir usuarioId con membresiaId.
- Políticas completas de suspensión, motivos/plazos y gestión correspondiente.
- Cambio posterior de sede habitual, responsables y autorización.
- Acordar permisos administrativos ambiguos: alcance global de Gerencia frente a
  operación local de Admin de Sede, y permisos futuros M3/M4. La UI no sustituye seguridad.
- Conciliar ADR-007 con los dos borradores históricos cuyo número no se recuperó;
  pasarela remota/reconciliación durable y demás decisiones draft siguen pendientes.

Fuentes sin duplicar contratos: [membresías](membresias.md),
[Recepción/M2](m2-recepcion.md), [M3/M4](m3-m4-frontend.md),
[Gerencia](gerencia-central-frontend.md), [guía UI](frontend-ui-guidelines.md),
[OpenAPI](openapi/openapi.yaml) y [decisiones](openapi/DECISIONES.md).
Los informes de verificación y la bitácora conservan resultados de cada corte;
«sin commit» o «pendiente» en esos registros no describe el estado final de esta entrega.

## 7. Pruebas finales

Desde `frontend`, sin nuevas dependencias ni runners:

```powershell
node --experimental-vm-modules scripts/test-dominio.mjs
node --experimental-vm-modules scripts/test-planes.mjs
node --experimental-vm-modules scripts/test-api.mjs
node --experimental-vm-modules scripts/test-servicios-actividades.mjs
node --experimental-vm-modules scripts/test-gerencia-service.mjs
npm run build
```

Resultado: 140 dominio/UI, 16 Planes, 14 transporte JSON/PDF/M2,
18 transporte M3/M4 y 7 Gerencia: **195 aprobadas**; build frontend correcto.
Son pruebas aisladas VM/esbuild con respuestas controladas, no E2E ni evidencia de
backend M3/M4/reporting. El aviso experimental de Node corresponde a VM Modules.
La revisión manual aprobada permanece registrada en los informes, sin repetirla
extensamente ni generar operaciones comerciales nuevas durante este cierre.

Backend: `mvnw.cmd verify`, con `PLAN_TEST_DB_URL` exclusivamente hacia PostgreSQL
18 descartable en loopback 55432 y
`JAVA_TOOL_OPTIONS=-Duser.timezone=America/Argentina/Buenos_Aires`.
Las suites existentes cubren JWT/permisos, planes, M1/M2, pagos/PDF, migraciones,
concurrencia e idempotencia. Resultado final: **73 tests, sin fallos, errores ni
omitidos**; 54 con PostgreSQL (35 membresías/M2, 8 persistencia/migraciones y 11 pagos).
`verify` incluye empaquetado y repackage Spring Boot: **BUILD SUCCESS**. Se ejecutó
con JDK 22.0.1 disponible en esta PC y target Java 21 del proyecto; no se afirma una
nueva ejecución con JDK 21. El primer empaquetado chocó con el JAR abierto en Windows;
se detuvo sólo el backend local, se repitió `verify` completo y se reinició con la
misma zona horaria y `spring.sql.init.mode=never`, sin resembrar datos.

`git diff --check` correcto. Sin archivos de sesión, capturas, dumps ni credenciales
reales identificados en el aporte versionado; las claves/contraseñas de dev y fixtures
son exclusivamente locales y están documentadas como tales.
El recurso temporal no forma parte de Compose ni de la arquitectura normal:
la aplicación continúa usando `fitzone-postgres`, BD `fitzone`, volumen
`fitzone_sports_fitzone_pgdata`. Se eliminó sólo `fitzone-cierre-test` y su volumen
anónimo exclusivo después de las suites; identidad y montaje del PostgreSQL normal
se comprobaron iguales antes/después. La BD normal continúa aceptando conexiones,
con Flyway en V9; no se ejecutaron fixtures ni escrituras de prueba contra ella.

## 8. Cómo revisar esta rama

Revisar `feature/integracion-final-frontend` completa; no aplicar aisladamente los
cortes de dominio y frontend. Usar [README](../README.md) para arranque y cuentas
seed de desarrollo; sus nombres no garantizan el estado actual de membresía.
La migración V7 exige volver a iniciar sesión si se tenía un token legado.

1. Cliente: Perfil sin afiliación, catálogo, selección explícita de plan/sede;
   contratación fake sólo si se quiere modificar datos locales de prueba.
2. Socio: Membresía, períodos, renovación anticipada/vencida, QR y PDF; contrastar
   VENCIDA/SUSPENDIDA sin beneficios con los fixtures locales documentados.
3. Recepción: sede, ingreso/salida y aforo; Clases/Canchas deben anunciar backend pendiente.
4. Gerente: Panel actual, Planes, Sedes, Usuarios/Membresías por ID y Reportes preparados.

Probar en una BD local respaldada. Las suites SQL nunca deben apuntar a `fitzone`
normal. No se necesita otra BD para ejecutar la aplicación. Revisar en equipo antes
de decidir adoptar esta rama como nueva base; M3/M4/reportes siguen pendientes.
