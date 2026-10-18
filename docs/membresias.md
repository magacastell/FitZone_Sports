# Backend de membresías

Los seis endpoints iniciales tienen persistencia y se agrega arrepentimiento por período. Los cobros y devoluciones usan `PasarelaPagoFake`, sin cargos reales.

## Reglas implementadas

- Una cuenta por usuario, con períodos históricos separados. Sólo clientes (`CLIENTE_EXTERNO` o rol legado `SOCIO_ACTIVO`) contratan su primera membresía. Titular y sede administrativa se obtienen del usuario autenticado.
- Cada período aprobado conserva nombre, duración y precio del plan en ARS. Los cambios posteriores al plan no alteran lo contratado. Contratar y renovar requieren un plan activo.
- Se usan meses calendario e intervalos `[inicio, fin)`: el 31 de enero más un mes termina el 28/29 de febrero; al llegar exactamente a `fin` deja de haber vigencia.
- Renovar anticipadamente agrega el período al final del último período pagado no cancelado. Si ya venció, comienza al aprobarse el nuevo cobro, sin cobrar meses retroactivos.
- `/me` devuelve la cuenta con su historial aunque esté vencida; `404` sólo si no existe cuenta. `periodoVigente` puede ser nulo.
- Suspender impide beneficios y renovaciones. Reactivar levanta la suspensión sin mover fechas: puede quedar vencida y requerir renovación manual. Las acciones y sus motivos se auditan.
- Recepción consulta y modifica estados sólo para titulares de su sede actual. Gerente administra todas las sedes y puede renovar/configurar cuentas ajenas. Los clientes sólo operan su propia cuenta.
- La vigencia es multi-sede. La sede administrativa no restringe dónde se usan los beneficios.
- El rol legado `SOCIO_ACTIVO` se conserva por compatibilidad; no se asigna ni se quita por comprar o vencer una membresía. M2/M3/M4 pueden consultar `MembresiaService.tieneMembresiaVigente(usuarioId)`.
- Acceso valida vigencia al emitir y escanear QR: un cliente con membresía activa puede usarlo; el rol sin membresía no habilita acceso. Las salidas siguen disponibles sin exigir vigencia.
- Un JWT de un usuario desactivado deja de autorizar solicitudes aunque no haya expirado.

## Endpoints

Prefijo `/api/v1`, autenticación `Authorization: Bearer <JWT>`.

| Método | Ruta | Cuerpo | Resultado |
|---|---|---|---|
| GET | `/membresias/me` | — | `200`, cuenta e historial propios |
| POST | `/membresias` | `{"planId":1}` | `201`, contratación pagada |
| POST | `/membresias/{id}/renovaciones` | `{"planId":1}` o `{}` para conservar plan | `201`, cuenta con nuevo período |
| GET | `/membresias/{id}` | — | `200`, consulta de recepción o gerente |
| PATCH | `/membresias/{id}/estado` | `{"accion":"SUSPENDER","motivo":"Revisión"}` o acción `REACTIVAR` | `200`, acción auditada |
| PUT | `/membresias/{id}/renovacion-automatica` | `{"habilitada":true}` o `false` | `200`, preferencia actualizada |
| POST | `/membresias/{id}/periodos/{periodoId}/cancelacion` | — | `200`, arrepentimiento con reembolso completo |

Contratación y renovación requieren `Idempotency-Key: <UUID>`. Reutilizá el UUID para reintentar la misma operación; una nueva renovación requiere otra clave. Las claves quedan en la base, acotadas al titular y tipo de operación. Reutilizar una clave con otro plan explícito devuelve `409`. El reintento devuelve el estado actual de la cuenta sin crear otro cobro o período.

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
$membresia = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/membresias" -Headers $headers -ContentType "application/json" -Body '{"planId":1}'
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

El adaptador mínimo de M5 persiste cobros aprobados y reembolsos de membresías. Los endpoints generales de pagos y PDF siguen en el alcance de M5. Una pasarela real asincrónica requerirá registro durable de intentos, estados pendientes, notificaciones y reconciliación, además de reemplazar el adaptador fake. M1 sólo otorga períodos si el cobro fue aprobado.
