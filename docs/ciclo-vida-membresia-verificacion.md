# Cierre funcional Cliente/Socio: ciclo de membresía

30/10/2026. Rama `feat/sede-habitual-contratacion`, HEAD base
`b68e998ce5e15253ccfb7f0b7f0c68070c8e5730`. Partió con 33 archivos pendientes e índice
vacío. Se preservó una copia incremental en `target/ciclo-vida-base` y hashes en
`target/ciclo-vida-base-hashes.json` (ignorados). Sin commit, push ni merge.

## Auditoría: comportamiento existente, conservado

- No existe enum EstadoMembresia: la entidad guarda un String y el flag suspendida.
  MembresiaService deriva ACTIVA/VENCIDA/SUSPENDIDA en cada representación.
- Períodos `[inicio,fin)`, no cancelados. Al llegar exactamente a fin ya no hay
  vigencia, salvo que otro período cubra ese instante. La suspensión prevalece.
  La cuenta debe estar habilitada para beneficios; JWT/usuario inactivo no autoriza.
- El estado efectivo se deriva. La columna estado también se sincroniza por las
  operaciones y por RenovacionAutomaticaJob (cada 60 s por defecto). No se depende
  de ese job para denegar acceso. No se agregó otro reloj productivo ni tarea.
- GET /membresias/me devuelve 200 con historial y periodoVigente null para VENCIDA;
  404 sólo sin membresía. No borra ni convierte la autoridad ni la sede.
- AccesoService valida vigencia tanto al emitir QR como al registrar ingreso M2.
  Un QR válido criptográficamente y emitido antes de vencer no permite ingresar
  después. Salida/aforo y acceso multisede conservan sus reglas existentes.
- Renovación: inicio=max(último fin no cancelado, instante actual de Clock).
  Anticipada encadena; vencida sin futuro empieza hoy. No cobra el hueco pasado ni
  solapa períodos. Meses calendario y precio actual del plan activo.
- Pago fake aprobado, período y comprobante en una transacción. UUID por intención,
  bloqueo por titular, replay acotado por usuario/tipo y conflicto al cambiar plan.
  Replay devuelve representación actual, no un nuevo cobro. No se cambió ese código.
- SUSPENDIDA es bloqueo administrativo auditado. Gerencia global; Recepción sólo
  titulares de su sede actual. Puede conservar período vigente. Niega QR/ingreso y
  una renovación nueva (409); permite leer historial/PDF. Reactivar no suma días.
  No se crean causas, plazos, sanciones, gestión ni autoservicio de suspensión.

## Ajustes de UI

- Cliente nuevo conserva catálogo real, progresión plan→sede→confirmar y cuenta sin
  sede hasta contratar. No QR ni comprobantes de Socio.
- ACTIVA muestra plan, precio, sede habitual, período actual y períodos PROGRAMADA.
  No se oculta renovación anticipada. Datos recibidos, no valores de v0.
- Aviso <=7 días, exclusivamente visual. Reutiliza el temporizador de presentación
  existente y enlaza la sección de renovación. Un futuro PROGRAMADA que cubre el fin
  inmediato suprime urgencia; un hueco o cancelación no. No otorga gracia.
- VENCIDA tiene título/etiqueta propios, último plan y última vigencia reales, sede,
  historial/comprobantes y CTA Renovar membresía. No se muestra onboarding ni QR.
  Sin un período histórico vencido identificable no se fabrica fecha de vencimiento.
- SUSPENDIDA muestra estado y consulta a administración; fechas del período
  contratado se distinguen de acceso suspendido. No ofrece una nueva renovación.
  Un pendiente previo conserva los mecanismos existentes para resolver su replay.
- Navegación se basa en el DTO backend. No se añadieron rutas, M3/M4 ni servicios.
  Se conserva reconsulta al cargar/F5/foco; no hay nuevo polling de membresía. Una
  pestaña que permanece enfocada puede conservar su último DTO hasta reconsultar;
  backend sigue rechazando inmediatamente QR/ingreso sin vigencia.

## Pruebas automatizadas

- `PLAN_TEST_DB_URL=jdbc:postgresql://localhost:55432/postgres`,
  `JAVA_TOOL_OPTIONS=-Duser.timezone=America/Argentina/Buenos_Aires`,
  `.\mvnw.cmd verify`: **73 tests, 0 fallos/errores/omitidos**.
  **54 PostgreSQL**: MembresiaIntegrationTest 35, PlanPersistenceTest 8,
  PagosIntegrationTest 11. El resto cubre contrato, controladores, permisos, planes,
  PDF y fake. V1→V9 y upgrades previos siguen pasando.
- Cuatro nuevas regresiones PG: vencimiento exacto con QR aún no expirado/M2,
  historial/sede/PDF intactos; renovación tardía con replay/conflicto y conteos;
  transición exacta hacia un período programado; reactivar después del vencimiento.
- Frontend VM: **119 dominio/portal/Recepción, 16 Planes, 14 transporte** aprobadas.
  Incluye aviso/continuidad/hueco/cancelación, vencida con sede y comprobantes,
  renovación incierta/retry con misma clave, suspensión, reload y guard QR.
  Conserva contratación plan+sede, doble envío, errores, storage y cambio de sesión.
  Son pruebas aisladas; la revisión de navegador se informa por separado.
- `npm run build` correcto. No dependencias, runners, migraciones ni backend
  productivo nuevos. `git diff --check` correcto.

## Fixture local y seguridad de datos

El PostgreSQL normal sigue siendo fitzone-postgres, BD fitzone, volumen
fitzone_sports_fitzone_pgdata. Antes del fixture se guardó un dump local ignorado
`target/ciclo-local-antes.sql`. No se resetearon usuarios, planes, sedes ni pagos
previos. El fixture agrega únicamente cuentas identificables del lote ciclo.
La comparación de dumps antes/después confirmó las 90 filas preexistentes intactas
en 26 tablas. Las secuencias avanzaron por los registros nuevos de prueba.

`src/test/resources/fixtures/ciclo_membresia_local.sql` es **sólo desarrollo**, no
migración/seed productivo: crea registros de prueba e historia pasada sin esperar
días. Usa un plan mensual activo y sede realmente existentes. Fechas relativas al
reloj local de ejecución, pagos etiquetados FAKE_FIXTURE, sin cargos externos.
No altera filas previas y aborta ante un lote existente; no permite reset silencioso.
Los PDF de fixture se recuperaron por el endpoint M5 existente; no son evidencia
de cobros históricos reales. Alta y renovación E2E posteriores sí usaron M1/M5 fake.

Preparación, sólo en una BD local respaldada y sin ese lote:

```powershell
Get-Content src/test/resources/fixtures/ciclo_membresia_local.sql -Raw |
  docker exec -i fitzone-postgres psql -v ON_ERROR_STOP=1 -U postgres -d fitzone
```

Todas las cuentas usan **cliente123**, contraseña de fixture local, no producción:

| Email | Estado disponible al finalizar |
|---|---|
| ciclo.cliente.20261030@fitzone.test | Sin sede ni membresía; no se confirmó contratación |
| ciclo.activo.20261030@fitzone.test | ACTIVA |
| ciclo.proximo.20261030@fitzone.test | ACTIVA, fin a cinco días de preparar fixture |
| ciclo.cubierto.20261030@fitzone.test | ACTIVA próxima a vencer, con próximo período confirmado |
| ciclo.vencido.20261030@fitzone.test | VENCIDA, sede e historial; no se renovó |
| ciclo.suspendido.20261030@fitzone.test | SUSPENDIDA, período aún vigente |
| ciclo.renovar.20261030@fitzone.test | Se renovó desde VENCIDA por UI; quedó ACTIVA |
| ciclo.alta.20261030@fitzone.test | Se contrató y renovó anticipadamente por UI; quedó ACTIVA con futuro |

La cuenta alta se registró por HTTP en esta ejecución después de preparar los otros
fixtures; el SQL también la incluye para una reproducción desde cero. Las cuentas
de las revisiones anteriores, incluidas sede.cliente y prueba@gmail.com, ya tenían
membresía y no se reutilizaron como Cliente nuevo.

Para repetir automatizadas, crear exclusivamente el contenedor descartable:

```powershell
docker run --name fitzone-ciclo-test -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55432:5432 -d postgres:18
$env:PLAN_TEST_DB_URL='jdbc:postgresql://localhost:55432/postgres'
$env:JAVA_TOOL_OPTIONS='-Duser.timezone=America/Argentina/Buenos_Aires'
.\mvnw.cmd verify
```

Se eliminó únicamente fitzone-ciclo-test y su volumen anónimo exclusivo al finalizar
las suites. Se comprobó antes que no compartía volumen con ningún otro contenedor.
No se cambió Docker Model Runner ni configuración global. Las cuentas manuales se
conservan para revisión; no se elimina información necesaria para abrirlas.

## Revisión HTTP y navegador real

- Cliente: catálogo backend y precios reales; selección de plan sólo muestra sede.
  Se pudo cambiar de plan antes de confirmar. CTA disabled sin plan/sede; accesible
  con ambos, pero **no se envió alta en ciclo.cliente**. Sin datos ni claves nuevos
  por la mera selección. Teclado hasta CTA con foco visible; select 46 px, CTA 44 px.
- Alta en ciclo.alta: contratación fake, sede real, Socio/QR/comprobantes sin relogin.
  Renovación anticipada real encadenó 30/11→30/12, preservando 30/10→30/11.
- Renovación en ciclo.renovar: período anterior 20/09→20/10; nuevo 30/10→30/11.
  F5 conserva ACTIVA. Replay HTTP misma clave 201; otro plan 409. SQL final:
  2 períodos, 2 pagos, 2 comprobantes; habitual y origen conservados en sede 1.
- VENCIDA: perfil y habitual visibles, plan/vigencia histórica, comprobantes,
  renovación y F5 correctos. URL directa /mi-qr bloqueada sin generar código.
- HTTP real: Cliente GET membresía 404/QR 403; ACTIVA QR 200; VENCIDA y SUSPENDIDA
  GET membresía 200/QR 403/PDF 200. Gerente GET /planes 200 y Recepción aforo 200.
  M2 al vencer y multisede se validan además en PostgreSQL con Clock controlado.
- Navegador: Cliente, próxima a vencer, VENCIDA y SUSPENDIDA en 390/768/1024/1280/1440,
  sin overflow horizontal. Cards Cliente apiladas a 390, dos columnas desde 768.
  Vistas sin acceso usan todo el ancho, sin reservar una columna de QR vacía.
- Vite se abrió también en puertos 5174/5175 para sesiones independientes (localStorage
  está separado por origen). No son otra arquitectura ni requisito del runtime.
  Backend/BD son los normales. No se pueden comparar cuentas distintas en varias
  pestañas del mismo origen sin compartir sesión.
- Evidencias locales ignoradas: target/ciclo-*.png, PDFs descargados y resultados
  HTTP sin JWT. No se incluyen credenciales de sesión en el informe.

## Alcance y pendientes

No se modificaron backend productivo, V1–V9, Auth/JWT, transporte/idempotencia,
Recepción, M3/M4, Gerencia ni permisos en este bloque. No se introdujo gracia,
administración de suspensiones ni una nueva decisión arquitectónica/ADR.
Políticas sobre motivos/plazos de suspensión, traslado de sede y futura pasarela
remota siguen pendientes del equipo, sin inventar reglas React.

Inventario incremental: PortalSocioCards.jsx, MembresiaUsuario.jsx, PortalSocio.css,
RenovacionMembresia.jsx (sólo etiqueta del CTA), estadoCuenta.js (etiquetas),
test-dominio.mjs, MembresiaIntegrationTest.java, fixture SQL, docs/membresias.md,
docs/openapi/DECISIONES.md, LOGs/Vidoni-LOG.md y este informe.
El diff completo también contiene los 33 archivos del bloque previo; no atribuir
esas modificaciones a este corte ni descartar sus hunks al revisar.

Estado al terminar la implementación, antes del cierre: 37 archivos pendientes (31 modificados y 6 nuevos), índice vacío,
rama y HEAD base conservados. Doce archivos de este corte, incluidos dos nuevos;
los demás cambios pertenecen a los bloques anteriores y permanecen intactos.

## Cierre aprobado

La revisión funcional y visual de Cliente/Socio fue aprobada. El cierre se divide
en dos commits consecutivos: backend/DB, contrato y regresiones; luego experiencia
frontend y documentación completa. El primero es validable por las suites backend;
el segundo consume ese contrato y completa el recorrido integrado. No se fraccionan
hunks de documentación compartida ni se modifican comportamientos durante el cierre.
La estrategia autorizada integra ambos juntos en feature/integracion-final-frontend,
sin push ni merge a main. Los estados «pendiente/sin commit» anteriores son el
registro histórico de la implementación previa a esta aprobación.
