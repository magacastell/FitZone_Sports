# Backend de membresías

Los seis endpoints iniciales tienen persistencia y se agrega arrepentimiento por período. Los cobros y devoluciones usan `PasarelaPagoFake`, sin cargos reales.

## Reglas implementadas

- Una cuenta por usuario, con períodos históricos separados. Sólo clientes con autoridad `USUARIO` contratan su primera membresía. El titular se obtiene de la sesión. La sede habitual se elige en el alta si está sin asignar; una habitual previa se conserva. La sede de la membresía es el origen histórico del alta, no una limitación multisede.
- Cada período aprobado conserva nombre, duración y precio del plan en ARS. Los cambios posteriores al plan no alteran lo contratado. Contratar y renovar requieren un plan activo.
- Se usan meses calendario e intervalos `[inicio, fin)`: el 31 de enero más un mes termina el 28/29 de febrero; al llegar exactamente a `fin` deja de haber vigencia.
- Renovar agrega el período en `max(fin del último período no cancelado, ahora)`, con meses calendario. `ahora` es el instante capturado por Clock al procesar la operación; sólo se confirma si el pago fue aprobado. Así la anticipada conserva días y la vencida sin períodos futuros no cobra días retroactivos.
- `/me` devuelve la cuenta con su historial aunque esté vencida; `404` sólo si no existe cuenta. `periodoVigente` puede ser nulo.
- Suspender impide beneficios y renovaciones. Reactivar levanta la suspensión sin mover fechas: puede quedar vencida y requerir renovación manual. Las acciones y sus motivos se auditan.
- Recepción consulta y modifica estados sólo para titulares de su sede actual. Gerente administra todas las sedes y puede renovar/configurar cuentas ajenas. Los clientes sólo operan su propia cuenta.
- La vigencia es multi-sede. La sede administrativa no restringe dónde se usan los beneficios.
- V7 reemplaza los dos roles comerciales legados por `USUARIO`; no cambia al comprar, vencer o suspender. Socio es condición derivada de ACTIVA. M2/M3/M4 pueden consultar `MembresiaService.tieneMembresiaVigente(usuarioId)`.
- Acceso valida vigencia al emitir y escanear QR: un cliente con membresía activa puede usarlo; el rol sin membresía no habilita acceso. Las salidas siguen disponibles sin exigir vigencia.
- Un JWT de un usuario desactivado deja de autorizar solicitudes aunque no haya expirado.

## Endpoints

Prefijo `/api/v1`, autenticación `Authorization: Bearer <JWT>`.

| Método | Ruta | Cuerpo | Resultado |
|---|---|---|---|
| GET | `/membresias/me` | — | `200`, cuenta e historial propios |
| POST | `/membresias` | `{"planId":1,"sedeId":2}` | `201`, contratación pagada y sede confirmada |
| POST | `/membresias/{id}/renovaciones` | `{"planId":1}` o `{}` para conservar plan | `201`, cuenta con nuevo período |
| GET | `/membresias/{id}` | — | `200`, consulta de recepción o gerente |
| PATCH | `/membresias/{id}/estado` | `{"accion":"SUSPENDER","motivo":"Revisión"}` o acción `REACTIVAR` | `200`, acción auditada |
| PUT | `/membresias/{id}/renovacion-automatica` | `{"habilitada":true}` o `false` | `200`, preferencia actualizada |
| POST | `/membresias/{id}/periodos/{periodoId}/cancelacion` | — | `200`, arrepentimiento con reembolso completo |

Contratación y renovación requieren `Idempotency-Key: <UUID>`. Reutilizá el UUID para reintentar la misma operación; una nueva renovación requiere otra clave. Las claves quedan en la base, acotadas al titular y tipo de operación. En alta, reutilizar una clave con otro plan o sede devuelve `409`; renovación conserva la comparación de plan. El reintento devuelve el estado actual de la cuenta sin crear otro cobro o período. Una sola cuenta por usuario: otro POST de alta sin replay devuelve 409 incluso vencida; se utiliza renovación.

No se aceptan importes ni fechas del cliente. Los períodos devuelven el precio decimal en ARS, fechas con zona y `pagoId`; los importados de V4 sin un pago identificado tienen `pagoId=null`.

Errores: `400` entrada inválida, `401` JWT ausente/inválido o usuario desactivado, `403` falta de permisos/titularidad, `404` recurso inexistente, `409` conflicto de estado/plan/clave y `402` cobro no aprobado. La fake siempre aprueba solicitudes válidas.

## Renovación automática

Habilitarla registra una autorización reutilizable fake. La tarea corre cada minuto y sólo cobra al terminar el último período pagado, bajo el mismo bloqueo por titular usado en renovaciones manuales. La clave del cobro se deriva de la cuenta y su vencimiento para evitar duplicados.

No cobra a usuarios inactivos ni a membresías suspendidas. Si el plan está inactivo o falta la autorización, deshabilita la renovación automática. Deshabilitarla elimina la autorización fake, conservando la vigencia existente. Los fallos se registran y reintentan sin otorgar períodos. Configuración opcional: `membresias.renovacion.intervalo-ms` y `membresias.renovacion.inicio-ms`, ambas `60000` por defecto.

## Arrepentimiento

Se permite hasta antes de cumplirse 24 horas desde el cobro de cada período. La fake devuelve el importe completo, el período pasa a `CANCELADA`, el pago a `REEMBOLSADO` y se deshabilita la renovación automática. Repetir la cancelación no duplica el reembolso. Otros períodos pagados se mantienen. Sin un período vigente, la cuenta informa `VENCIDA` y puede renovarse manualmente. Los registros importados sin pago identificado no se reembolsan automáticamente.

## Migración y concurrencia

V5 conserva las filas existentes, agrega períodos y auditoría y amplía pagos a dos decimales. Si encuentra varias membresías para un mismo usuario se detiene para que se consoliden preservando el historial; no elimina datos. Las condiciones importadas son las disponibles en el plan al migrar: el esquema anterior no conservaba sus cambios históricos.

Las operaciones bloquean la fila del titular antes de cobrar o modificar períodos. Hay claves únicas por usuario/operación y un trigger que impide períodos superpuestos no cancelados. V1–V4 no cambian.

## Prueba manual en PowerShell

Iniciá el backend en perfil `dev`. Primero creá un plan activo como gerente siguiendo el README y reemplazá `1` por su ID real:

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/auth/login" -ContentType "application/json" -Body '{"email":"cliente@fitzone.com","password":"cliente123"}'
$headers = @{ Authorization = "Bearer $($login.token)"; "Idempotency-Key" = [guid]::NewGuid().ToString() }
$membresia = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/membresias" -Headers $headers -ContentType "application/json" -Body '{"planId":1,"sedeId":1}'
$membresia
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/membresias/me" -Headers $headers
```

Repetir el POST con los mismos headers no duplica el cobro. Para renovar y habilitar la renovación automática:

```powershell
$headers["Idempotency-Key"] = [guid]::NewGuid().ToString()
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/membresias/$($membresia.id)/renovaciones" -Headers $headers -ContentType "application/json" -Body '{}'
Invoke-RestMethod -Method Put -Uri "http://localhost:3000/api/v1/membresias/$($membresia.id)/renovacion-automatica" -Headers $headers -ContentType "application/json" -Body '{"habilitada":true}'
```

Los usuarios de desarrollo deben contratar un plan para generar QR; no se les regala vigencia por su rol.

## Pruebas y límites de la fake

`./mvnw test` ejecuta las pruebas sin base. Con `PLAN_TEST_DB_URL` hacia una base PostgreSQL vacía y descartable, usuario `postgres` sin contraseña, se habilitan las pruebas de integración de planes y membresías: calendario, vencimientos, HTTP/JWT, permisos, acceso, idempotencia concurrente, automática, rollback de rechazos, arrepentimiento y migración desde V4.

El adaptador mínimo de M5 persiste cobros aprobados y reembolsos de membresías. El PDF persistido está disponible en GET /pagos/{id}/comprobante con titularidad; el listado general sigue pendiente. Una pasarela real asincrónica requerirá registro durable de intentos, estados pendientes, notificaciones y reconciliación, además de reemplazar el adaptador fake. M1 sólo otorga períodos si el cobro fue aprobado.

Ver ADR-007 para migración de autoridades, tokens, matriz de permisos y limitaciones de la pasarela externa futura.

## Comprobantes personales y PDF

La UI lista períodos con pagoId de `/membresias/me`: plan/precio históricos, período
y referencia de pago. No consume `/pagos/me`, que sigue 501, ni inventa emisión,
estado financiero o reembolso. Orden: inicio de período descendente, no fecha de cobro.
`GET /pagos/{id}/comprobante` devuelve bytes originales, con JWT, titularidad o gerente,
Content-Type PDF, attachment y no-store; no requiere membresía actualmente vigente.
`POST /pagos/{id}/reembolsos` conserva su respuesta real: pagoId, estado, monto, moneda,
fechaReembolso y referencia. No se invoca para consultar estado: es una mutación.
La UI muestra CANCELADA como estado del período, sin afirmar REEMBOLSADO.

La nueva emisión PDF usa DatosComprobante interno para presentación con márgenes,
jerarquía, total ARS en formato argentino y aclaración académica/sin validez fiscal.
Plan, precio y período salen del snapshot contratado. Identidad se captura al emitir
y se conserva en bytes; cambios posteriores de titular o plan y el reembolso no alteran
el documento. Los PDF existentes mantienen su diseño anterior. Para pagos antiguos sin
PDF, el mecanismo previo recupera la identidad actual: no hay snapshot previo de titular
para reconstruirlo. No se prometen datos históricos inexistentes ni se reescribe el PDF.

## Sede habitual y origen del alta (V8)

Registro comercial sin sede y sin consulta pública de sedes. UsuarioResponse devuelve
sedeId/sedeNombre null hasta contratar. Si no hay habitual, POST /membresias exige
sedeId positivo y existente (400 si falta, 404 inexistente). Con sede anterior,
omitir conserva la actual y enviar otra devuelve 409. GET /sedes sigue autenticado;
no hay flag activo/inactivo de Sede: se listan las sedes reales del backend.
Usuario.sedeId es habitual comercial u operativa del personal. Membresia.sedeId
es el origen histórico del alta; futuras transferencias no deben actualizarlo.

M1 conserva su bloqueo por titular y transacción con M5 fake: se validan plan/sede,
se registra el alta y se cobra/emite comprobante con la estrategia actual, y se asigna
la habitual tras aprobar. Nada se confirma hasta commit. El rechazo revierte sede,
cuenta, período y pago. No se introduce una transacción distribuida; una pasarela
remota futura mantiene pendientes sus necesidades de conciliación.

La UI guarda planId+sedeId+UUID por cuenta en sessionStorage antes del envío.
Red/5xx/F5 no crean una nueva intención; se puede reintentar la misma aunque falle
el catálogo. Un GET que confirma la membresía permite reconciliar sin otro pago.
402 permite retry o una nueva intención explícita; 404/409 confirmado sin cuenta
requieren actualizar catálogo antes de descartar. Un registro local inválido bloquea
envíos, no se borra silenciosamente. Tras éxito se recarga perfil sin relogin.
Renovación no recibe sede ni modifica origen/habitual.

Cambio posterior, responsable y autorización quedan pendientes (P12). Las sedes
anteriores se conservan: no se puede inferir cuáles provienen del viejo default.
Ver [verificación de este bloque](sede-habitual-verificacion.md).

## Ciclo de vida y presentación personal

La autoridad comercial sigue siendo USUARIO en todos los estados. Cliente nuevo
significa ausencia de cuenta de membresía (404), no una membresía VENCIDA.
ACTIVA requiere usuario habilitado, ausencia de suspensión y algún período no
cancelado con `inicio <= ahora < fin`. No hay gracia. `/membresias/me` deriva el
estado usando Clock aunque la columna `membresia.estado` todavía no se haya
sincronizado. El job existente la actualiza cada minuto y procesa las automáticas;
este bloque no agrega jobs ni habilita renovación automática desde la UI.

VENCIDA conserva identidad, sede habitual, origen del alta, períodos y comprobantes.
La UI muestra último período vencido y plan histórico si existen, y renovación del
último plan contratado usando su precio actual. No inventa una fecha si no hay un
período vencido identificable (por ejemplo, todos cancelados). Renovar no pide sede.
QR y M2 rechazan vigencia ausente incluso si el QR fue emitido antes del vencimiento.
La salida de un ingreso ya abierto sigue permitida.

SUSPENDIDA es el flag administrativo persistido, con acción/motivo auditados.
Gerencia puede suspender/reactivar; Recepción sólo para titulares de su sede actual.
Puede coexistir con un período temporalmente vigente: impide beneficios y nuevas
renovaciones; reactivar no extiende fechas y puede dejar VENCIDA. Lectura personal e
historial/PDF continúan disponibles para una cuenta habilitada. El replay confirmado
se verifica antes del bloqueo de nuevas renovaciones, sin crear otro período/pago.
No se implementa una UI administrativa ni una causa/duración de suspensión nueva.

El aviso a siete días es sólo UX, calculado desde las fechas con aproximación de
24 horas y redondeo hacia arriba. No cambia estado ni permisos. Se omite si un
período PROGRAMADA cubre inmediatamente el fin del actual; un período cancelado o
con un hueco no suprime el aviso. La barra indica el período actual, no toda la
duración futura. La UI reconsulta al cargar/F5 y recuperar foco; la autorización
efectiva de QR e ingreso siempre se vuelve a comprobar en backend.

Ver [auditoría, escenarios y verificación del ciclo](ciclo-vida-membresia-verificacion.md).
