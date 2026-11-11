# Integración de Canchas y Pagos con frontend y otros módulos

Fecha: 11/11/2026. Alcance: contratos del backend M4/M5 implementado.

Esta guía describe **qué existe**, cómo consumirlo y qué requiere coordinación.
No implica que el frontend ni el ingreso por reserva en M2 ya estén integrados.
Referencia normativa de la API: [OpenAPI](openapi/openapi.yaml).
Reglas y operación: [guía backend](canchas-pagos-backend.md).

## 1. Responsabilidades y dependencias

| Consumidor | Integración | Estado |
|---|---|---|
| Frontend Usuario | Disponibilidad → retención → pago → confirmación/PDF; cancelación e historial | API disponible; conectar pantallas |
| Frontend Recepción | Canchas, turnos, mantenimiento y reservas de su sede | API disponible; no puede iniciar pagos ni consultar pagos ajenos |
| Frontend Gerencia | Tarifas, recargos por sede, administración global y consultas de pagos | API disponible |
| M1 Membresías | M4 consulta vigencia para descuento; conserva su contratación/renovación y política de 24 h | Conectado por servicio de M1 |
| M2 Acceso | Identificar cliente externo y validar reserva confirmada para sede/horario | **Pendiente**, ver sección 8 |
| M3 Clases | Clases incluidas en membresía, sin cobro individual | No requiere llamar a M5 para reservar clases |
| Reportes | Combinar cobros y devoluciones, distinguir membresías/canchas | Datos disponibles; reporte agregado no implementado por este cambio |

M4 administra reserva, disponibilidad, precio y política de cancelación. M5
administra cobro, devolución y comprobante. Un consumidor no modifica estados
directamente en SQL ni llama por HTTP al propio backend para reemplazar una llamada
entre servicios del monolito.

## 2. Convenciones comunes

- Base local: `http://localhost:3000/api/v1`; frontend usa `fetchAPI` con `/api/v1` o `VITE_API_URL`.
- JWT en `Authorization: Bearer <token>`. El rol técnico del cliente es `USUARIO`;
  ser socio se deriva de M1, no de otro rol ni de un booleano enviado por la UI.
- Dinero: número decimal en ARS, hasta dos decimales. Frontend formatea, no recalcula
  el precio autoritativo. Mostrar `precio.total` en consulta y `precioAplicado` al retener.
- Para consultar turnos, `desde` y `hasta` son fechas `YYYY-MM-DD`, inclusivas,
  máximo 31 días. Para crear turnos/bloqueos, usar instantes con offset ISO 8601,
  por ejemplo `2026-11-12T19:00:00-03:00`. Reemplazar las fechas de ejemplo por fechas futuras.
- El servidor normaliza a hora argentina. No cortar un `toISOString()` UTC para
  representar automáticamente la fecha local elegida por el usuario.
- Historiales de reservas/pagos: array, `page=0`, `size=20`, máximo 100. No devuelven
  `{items,total}`. Catálogo de canchas exige sede para Usuario/Gerencia (máximo 100);
  Recepción puede omitirla y usa la suya. Disponibilidad devuelve hasta 1000 turnos;
  mantenimientos, hasta 100 registros. Acotar filtros; no interpretar estos límites
  como una carga ilimitada de todos los datos.

## 3. Flujo frontend: disponibilidad, reserva y pago

### A. Elegir sede, cancha y turno

```http
GET /api/v1/canchas?sedeId=1
GET /api/v1/canchas/10/turnos?desde=2026-11-12&hasta=2026-11-12
```

Ejemplo de un elemento de disponibilidad:

```json
{
  "id": 123,
  "canchaId": 10,
  "inicio": "2026-11-12T19:00:00-03:00",
  "fin": "2026-11-12T20:00:00-03:00",
  "disponible": true,
  "precio": {
    "base": 10000.00,
    "recargo": 2000.00,
    "descuento": 1800.00,
    "total": 10200.00,
    "estrategia": "SOCIO"
  }
}
```

El precio consultado es informativo hasta retener. Otro usuario puede ocupar el
turno antes del POST: `disponible=true` no garantiza que la siguiente operación
vaya a confirmarse. Cambiar sede, cuenta o fecha requiere descartar respuestas de
la consulta anterior; limpiar los datos de la cuenta previa al cerrar sesión.

### B. Retener: todavía no es pago ni confirmación

```http
POST /api/v1/canchas/10/reservas
Content-Type: application/json
Idempotency-Key: 25484f77-5d1c-4aa3-8d67-659822d79513

{"turnoId":123}
```

Respuesta `201` con `Location: /api/v1/reservas/456` y representación:

```json
{
  "id": 456,
  "canchaId": 10,
  "turnoId": 123,
  "usuarioId": 7,
  "sedeId": 1,
  "cancha": "Padel 1",
  "sede": "Sede Central",
  "tipo": "PADEL",
  "inicio": "2026-11-12T19:00:00-03:00",
  "fin": "2026-11-12T20:00:00-03:00",
  "estado": "PENDIENTE_PAGO",
  "precioAplicado": 10200.00,
  "creadaEn": "2026-11-12T18:30:00-03:00",
  "venceEn": "2026-11-12T18:40:00-03:00",
  "pagoId": null,
  "estadoPago": null
}
```

- Generar un UUID **una vez por intención** y conservarlo junto con cuenta y turno
  mientras se recupera una respuesta perdida. Reenviar la misma clave y mismo
  recurso permite recuperar la reserva. No generar una clave nueva por cada retry.
- Misma clave con otro turno devuelve `409`. Para una nueva intención después de
  cancelación/rechazo/expiración, crear otra clave; la anterior devuelve su historia.
- Mostrar el tiempo restante desde `venceEn`, no iniciar siempre un contador nuevo
  de 10 minutos al montar el componente. El servidor limita también por inicio del turno.
- Recargar `/reservas/{id}` permite recuperar estado. No reiniciar la retención en
  frontend ni confirmar una reserva por el solo hecho de recibir `201`.

### C. Pagar usando el id de la reserva

```http
POST /api/v1/pagos
Content-Type: application/json

{"concepto":"RESERVA_CANCHA","recursoId":456}
```

**No enviar** monto, DNI, usuarioId, estado ni datos de tarjeta. No confundir:
`turnoId=123`, `reservaId/recursoId=456` y `pagoId=789` son recursos diferentes.
No hace falta una segunda `Idempotency-Key`: M5 deduplica por reserva.

Ejemplo aprobado (`201`):

```json
{
  "id": 789,
  "usuarioId": 7,
  "concepto": "RESERVA_CANCHA",
  "recursoId": 456,
  "monto": 10200.00,
  "moneda": "ARS",
  "estado": "APROBADO",
  "fecha": "2026-11-12T18:31:00-03:00",
  "referenciaExterna": "fake-<referencia-estable>",
  "montoReembolsado": 0.00
}
```

| Resultado | Qué mostrar / hacer |
|---|---|
| Pago APROBADO | Recargar reserva: CONFIRMADA. Habilitar PDF por pago.id. |
| Pago RECHAZADO, también HTTP 201 | Informar rechazo, refrescar grilla; reserva RECHAZADA, turno liberado, sin PDF. |
| HTTP 409 | Reserva vencida/no pagable o conflicto. Consultar estado y refrescar. |
| Error de red/respuesta perdida | Consultar reserva; si tiene pagoId, consultar ese pago. Repetir POST para la misma reserva es seguro. |

Un replay de POST /pagos devuelve el mismo pago, incluso si después fue reembolsado:
evaluar el estado de la respuesta. No intentar cobrar de nuevo una reserva cancelada.
La fake responde síncronamente; no hay callback público ni polling de una pasarela
real. El contrato no exige implementar estados externos hipotéticos en la UI.

### D. Descargar PDF

```js
import { fetchAPI } from './api';

export function pagarReserva(reservaId) {
  return fetchAPI('/pagos', {
    method: 'POST',
    body: JSON.stringify({ concepto: 'RESERVA_CANCHA', recursoId: reservaId }),
  });
}

export function retenerTurno(canchaId, turnoId, clavePersistida) {
  return fetchAPI(`/canchas/${canchaId}/reservas`, {
    method: 'POST',
    headers: { 'Idempotency-Key': clavePersistida },
    body: JSON.stringify({ turnoId }),
  });
}

export function obtenerPdf(pagoId) {
  return fetchAPI(`/pagos/${pagoId}/comprobante`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
  });
}
```

El cliente `fetchAPI` actual ya soporta Blob; `pagosService.descargarComprobante`
también puede reutilizarse. Para mostrar/descargar usar `URL.createObjectURL`,
nombre `comprobante-{pagoId}.pdf` y liberar la URL al terminar. No usar JSON ni una
URL pública del servidor: la descarga requiere JWT. El documento del pago original
se conserva tras devolución y no prueba que la reserva siga vigente.

## 4. Cancelaciones, devoluciones e historial

```http
DELETE /api/v1/canchas/10/reservas/456
```

Devuelve `200` y la reserva CANCELADA. Si estaba pagada, procesa la devolución
según la anticipación; sin pago no crea movimiento financiero. Puede ejecutarla el
titular, Recepción de la sede o Gerencia. Repetir no duplica la devolución.

Alternativa para titular/Gerencia:

```http
POST /api/v1/pagos/789/reembolsos
```

Sin cuerpo: M5 delega en M4 para cancelar y aplicar su política. Devuelve `200` con
`pagoId`, `estado` (REEMBOLSADO o REEMBOLSADO_PARCIAL), `monto` efectivamente devuelto,
`moneda`, `fechaReembolso` y `referenciaExterna`. Consultar después pago y reserva.
No llamar a ambas rutas para realizar dos pasos: **cada una completa el flujo**.

- Anticipación >=2 horas: 100 %. Menor a 2 horas: 50 %. Desde el inicio no se cancela.
- El gerente puede enviar `{"porcentajeReembolso":50}` o `100` en el DELETE como
  excepción administrativa; otros actores no pueden elegir el porcentaje.
- La política de membresías sigue siendo **menos de 24 horas desde el cobro**;
  no reutilizar ese plazo para canchas ni la penalidad de clases para ninguna de estas devoluciones.
- No inferir el estado financiero solo desde CANCELADA. Mostrar los datos del pago
  y su `montoReembolsado`. Una reserva cancelada antes del cobro tiene pagoId null.
- Consultas: `/reservas/me`, `/reservas/{id}`, `/pagos/me`, `/pagos/{id}`.
  Recepción usa `/reservas` de su sede; Gerencia puede usar `/pagos?sedeId=...`.

## 5. Administración de canchas y tarifas

| Operación | Cuerpo / detalle |
|---|---|
| GET /tipos-cancha | Obtener nombres e ids reales. No inventar tipos en frontend. |
| POST /tipos-cancha | Gerente: `{"nombre":"PADEL","precioHora":12000}` |
| PUT /tipos-cancha/{id} | Reemplazo de nombre y precioHora, ambos obligatorios. No PATCH. |
| PUT /sedes/{id}/recargo-pico | Gerente: `{"recargoPico":20}` |
| POST /canchas | `{"nombre":"Padel 1","tipo":"PADEL","sedeId":1,"activa":true}`; tipo es nombre, no id. |
| PATCH /canchas/{id} | nombre/tipo/activa opcionales; null u omitido conserva valor. No cambia sede. |
| POST /canchas/{id}/turnos | `{"inicio":"2026-11-12T19:00:00-03:00","fin":"2026-11-12T20:00:00-03:00"}` |
| POST /canchas/{id}/mantenimientos | inicio, fin opcional y motivo obligatorio; devuelve 201. |
| GET /canchas/{id}/mantenimientos | Historial; considerar el campo activo. |
| DELETE /canchas/{id}/mantenimientos/{id} | Desactiva, devuelve 204 sin JSON; no elimina la historia. |

Recepción debe usar su sede; el backend rechaza una sede ajena aunque un selector
de frontend se manipule. El tipo y el nombre quedan capturados en la reserva:
cambiar el catálogo no cambia el PDF ni el precio contratado. Desactivar una cancha
impide nuevas reservas y pagar retenciones todavía no cobradas; no borra confirmadas.
Mantenimiento superpuesto con reservas activas devuelve 409, no las cancela.

## 6. Cambios concretos que necesita el frontend existente

`frontend/src/services/m4Service.js` fue preparado para drafts. Para integrarlo:

1. Agregar parámetro `clave` a `reservarCancha` y enviar `Idempotency-Key`; hoy no lo envía.
2. Usar fechas `YYYY-MM-DD` en `listarTurnos`; para escrituras, instantes con offset.
3. Agregar consulta individual de reserva, historiales y pago de reserva mediante
   las rutas anteriores. Mantener el seguimiento de la intención por cuenta/recurso.
4. Consumir precio/disponible del backend; usar precioAplicado tras retener.
5. Manejar pago RECHAZADO aunque HTTP sea 201. No descargar PDF de un rechazo.
6. Adaptar el historial de comprobantes para pagos de canchas: la pantalla actual
   lista períodos de membresía y por eso no los descubre automáticamente. Usar
   `/pagos/me` para reunir ambos conceptos.
7. Conectar administración a tipos, recargo y mantenimiento reales. No habilitar
   permisos solo por ocultar enlaces: presentar el 403 del servidor.
8. Conservar `error.status` y `error.data` de fetchAPI; diferenciar errores recuperables,
   validación, conflicto, sin sesión y prohibido. Eliminar avisos de «501 pendiente»
   solo en las pantallas que efectivamente se conecten a estas rutas.

No se modificaron archivos frontend como parte de esta documentación.

## 7. Llamadas internas desde otros módulos

| Servicio | Contrato disponible | Uso |
|---|---|---|
| MembresiaService | tieneMembresiaVigente(usuarioId) | M4 lo usa para precio; no cambiar el rol al reservar. |
| ReservaCanchaService | reservar(email, canchaId, request, clave), pagar(email, reservaId), cancelar(email, canchaId, reservaId, request) | Fachada transaccional que valida actor y recurso. |
| ReservaCanchaService | consultar(email,id), listar(email,propias,sedeId,page,size) | Lecturas autenticadas. |
| ComprobanteService | descargar(email,pagoId) | Descarga con propiedad; emitir(pagoId) es interno de cobros, no un atajo de autorización. |
| ReembolsoService | solicitar(email,pagoId) | M1/M4 aplican elegibilidad; M5 registra devolución. |
| PagoCanchaService | consultar(email,id), listar(email,propios,sedeId,page,size) | Consultas de pagos. |

`PagoCanchaService.cobrar/reembolsar` exige una transacción existente. No llamarlos
directamente desde un controller nuevo ni omitir la fachada M4: perderían las
validaciones de reserva, bloqueo, vencimiento o política. Tampoco usar `datos`,
`emitir`, `bloquear` u otros métodos auxiliares como APIs autorizadas para usuarios.

La implementación usa invocaciones a beans de Spring para que los límites
transaccionales se apliquen. No agrega eventos de reserva/pago ni garantiza entrega
de callbacks a terceros; no suscribirse a nombres de eventos que no existen.

### Reportes: qué significan los datos

- `pago.tipo_referencia`: MEMBRESIA o RESERVA_CANCHA; `referencia_id` apunta al recurso
  correspondiente, no siempre a una reserva. No es una FK polimórfica garantizada.
- `pago.monto` es el cobro original, no el neto. RECHAZADO no suma ingresos.
- Los pagos REEMBOLSADO/REEMBOLSADO_PARCIAL tuvieron un cobro aprobado: conservarlo
  al contar cobros y restar `reembolso_pago.monto` por su propia fecha.
- Para movimientos de un período: cobros por fecha_pago y devoluciones por fecha
  del reembolso; no restar devoluciones de otros períodos por simple estado actual.
- `reembolso_pago` conserva una devolución por pago en este alcance; no modela
  varios intentos parciales acumulativos. `montoReembolsado` en API simplifica lectura.

## 8. Pendiente explícito: M2 y clientes externos con reserva

**No hay todavía endpoint ni servicio implementado de elegibilidad de acceso por
reserva.** `AccesoService.validarPuedeIngresar` exige membresía vigente y
`RegistrarIngresoRequest` requiere qrToken. No funciona enviar un reservaId o DNI
a ese contrato esperando habilitar a un cliente externo.

Coordinación propuesta, todavía no implementada:

1. M2 define el ingreso de externo mediante identificación del usuario, separado
   del QR de membresía y con los permisos de la sede.
2. M4 expone una consulta pública interna de reserva confirmada por usuario, sede
   e instante. Acordar tolerancia de llegada, qué cuenta como asistencia y franja
   habilitada; no asumir que basta con tener una reserva en cualquier fecha/sede.
3. M2 sigue siendo dueño del registro de entrada/salida, aforo y prevención de
   presencia simultánea. M4 no inserta registros de acceso.
4. Probar reserva aprobada/rechazada/cancelada, otra sede, horario incorrecto y
   reservas vencidas. Coordinar el comportamiento offline con el responsable de M2.

No se implementa esta integración escribiendo directamente sobre tablas de M4
desde el módulo de acceso ni desactivando la validación de membresía del QR.

## 9. Errores y escenarios de aceptación conjunta

| Resultado | Interpretación |
|---|---|
| 400 | Cuerpo, UUID, fechas, duración o filtros inválidos. Mostrar detalle/validación. |
| 401 | Sin sesión/token válido; fetchAPI ya contempla recuperación de login. |
| 403 | Operación ajena, sede ajena o rol sin permiso. No convertir en «lista vacía». |
| 404 | Recurso inexistente o no perteneciente al path indicado. |
| 409 | Turno ocupado, solapamiento, mantenimiento incompatible, retención vencida o regla de cancelación. Refrescar el recurso. |
| 201 + pago RECHAZADO | Operación procesada; el rechazo es resultado de negocio, no error de transporte. |
| 204 | Baja de mantenimiento completada; no intentar leer JSON. |

Los conflictos de ocupación se devuelven como Problem Details sin SQL. Los errores
de autenticación/autorización pueden no tener ese cuerpo: usar siempre el status y
un mensaje alternativo, como hace fetchAPI.

Checklist para frontend y responsables de integración:

- [ ] Cliente sin membresía reserva a tarifa externa; socio vigente obtiene 15 %.
- [ ] Dos sesiones eligen el mismo turno: una retiene, otra ve conflicto y refresca.
- [ ] Usuario aprobado paga, ve CONFIRMADA y descarga el PDF correcto.
- [ ] `rechazo@fitzone.com` / `cliente123`, DNI `99999999`, recibe RECHAZADO;
  el turno queda libre y no hay PDF. Cuenta cargada solo por seed dev.
- [ ] Navegar/recargar no reinicia la retención ni duplica reserva/pago.
- [ ] Retención vencida no se puede pagar; una intención nueva puede reservar el turno.
- [ ] Cancelación a tiempo/tardía muestra devolución 100 %/50 % real, sin duplicación.
- [ ] Cliente no accede a pago ajeno y Recepción no opera otra sede.
- [ ] Mantenimiento respeta reservas previas y liberar bloqueo permite nuevas reservas.
- [ ] Historial reúne membresías y canchas sin confundir reserva, período y pago.
- [ ] La integración M2 se verifica por separado cuando exista el contrato acordado.

Backend: evidencia automatizada en `CanchasIntegrationTest`, `PrecioCanchaTest`,
`PasarelaPagoFakeTest` y regresiones de membresías/pagos. Esos resultados no sustituyen
la prueba del frontend conectado ni acreditan el ingreso externo pendiente de M2.
