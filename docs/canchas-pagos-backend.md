# M4 Canchas y M5 Pagos — backend

Implementación del 11/11/2026. Frontend fuera del alcance de este cambio.

Para responsables de otros módulos y frontend: [guía de integración, ejemplos y pendientes](integracion-canchas-pagos.md).

## Reglas operativas

- Catálogo global de tipos con tarifa por hora en ARS: lo administra Gerencia.
- Canchas y turnos por sede: Recepción solo su sede; Gerencia todas.
- Usuario sin membresía o con membresía vencida/suspendida puede reservar, sin descuento.
- Pico `[19:00,21:00)` en hora argentina. Se prorratea el recargo por los minutos que se superponen.
- Recargo porcentual por sede, inicial 20 %. Después del recargo se aplica el descuento del 15 % si M1 confirma vigencia.
- BigDecimal, redondeo HALF_UP a dos decimales; importe fijado al retener, independiente de cambios posteriores en tarifa o membresía.
- Turnos de 60 minutos, futuros, sin segundos y dentro del mismo día. Duración configurable al arrancar.
- Retención de 10 minutos, nunca posterior al comienzo del turno. Job cada 30 segundos y liberación al volver a reservar o crear mantenimiento.
- La consulta de disponibilidad descarta retenciones vencidas aunque el job todavía no haya ejecutado.
- El cliente envía solo turnoId al reservar y recursoId al pagar: no el importe, el DNI ni la condición de socio.
- Cancelación antes del comienzo: 100 % con dos horas o más; 50 % con menos de dos horas. Gerencia puede elegir 50/100 para una cancelación administrativa; queda registrado quién cancela y el porcentaje. No hay cancelación después del inicio.
- Mantenimiento futuro, fin opcional. Si se superpone con reservas activas se rechaza: no cancela reservas existentes. Eliminarlo es baja lógica.

Los valores de 60 minutos, 20 % inicial, retención de 10 minutos y frontera de cancelación son decisiones operativas de esta implementación, propuestas en la conversación; no se atribuyen como cifras exigidas por los PDF. El 15 % y la ventana 19–21 sí corresponden al enunciado.

## API para integrar

Prefijo `/api/v1`; todas estas rutas requieren JWT. Contrato completo en [OpenAPI](openapi/openapi.yaml).

| Método/ruta | Uso |
|---|---|
| GET /tipos-cancha | Tipos y tarifa global |
| POST /tipos-cancha | Gerente crea tipo con nombre y precioHora |
| PUT /tipos-cancha/{id} | Gerente reemplaza nombre y precioHora |
| PUT /sedes/{sedeId}/recargo-pico | Gerente configura recargoPico (0–100) |
| GET /canchas?sedeId= | Canchas de la sede, máximo 100 |
| GET /canchas/{id} | Recurso individual |
| POST /canchas | nombre, tipo (nombre existente), sedeId; activa opcional |
| PATCH /canchas/{id} | nombre/tipo/activa; omitido o null conserva |
| GET /canchas/{id}/turnos?desde=AAAA-MM-DD&hasta=AAAA-MM-DD | Fechas inclusivas, hasta 31 días y 1000 turnos; disponibilidad y precio por usuario |
| POST /canchas/{id}/turnos | inicio/fin con offset ISO 8601; se normalizan a Argentina |
| POST /canchas/{id}/reservas | turnoId; Idempotency-Key UUID obligatorio; devuelve 201 PENDIENTE_PAGO |
| GET /reservas/{id} | Reserva individual con pagoId/estadoPago |
| GET /reservas/me | Propias; page=0, size=20 (máximo 100) |
| GET /reservas?sedeId= | Administración; mismo paginado |
| DELETE /canchas/{id}/reservas/{reservaId} | Cancela y devuelve el resultado; cuerpo opcional con porcentajeReembolso exclusivo de gerente |
| GET/POST /canchas/{id}/mantenimientos | Historial (máximo 100) / crear con inicio, fin opcional y motivo |
| DELETE /canchas/{id}/mantenimientos/{id} | Baja lógica, 204 |
| POST /pagos | concepto=RESERVA_CANCHA, recursoId=id de reserva |
| GET /pagos/me | Pagos propios, paginados |
| GET /pagos/{id} | Titular o gerente |
| GET /pagos?sedeId= | Gerencia, filtro opcional, paginado |
| GET /pagos/{id}/comprobante | PDF original, también de cancha |
| POST /pagos/{id}/reembolsos | Delega la cancelación a M4 para aplicar su política; sin cuerpo |

Los listados paginados devuelven arrays ordenados, usando `page` base cero y `size`.
Una retención nunca equivale a pago ni confirmación. El frontend debe leer el estado del pago, no asumir aprobación por recibir HTTP 201.

## Recorrido de pago sin cambiar código

En desarrollo `data.sql` agrega 25 sedes, dos canchas por sede y turnos para los próximos siete días. No modifica tarifas existentes ni duplica recursos al reiniciar.

1. Login `cliente@fitzone.com` / `cliente123` para aprobación.
2. Consultar canchas por sede y turnos por fechas.
3. Retener con `POST /canchas/{id}/reservas`, JSON `{"turnoId":123}` e `Idempotency-Key` UUID. Guardar el id de reserva.
4. Pagar con `POST /pagos`, JSON `{"concepto":"RESERVA_CANCHA","recursoId":456}`. La respuesta contiene el pago y estado APROBADO; la reserva pasa a CONFIRMADA.
5. Descargar `/pagos/{pagoId}/comprobante`.
6. Repetir con `rechazo@fitzone.com` / `cliente123`, DNI ficticio `99999999`: pago RECHAZADO persistido, reserva RECHAZADA, turno liberado y descarga de PDF rechazada con 409.
7. Cancelar una reserva aprobada antes del inicio y comprobar reembolso completo/parcial y liberación. Repetir la solicitud no duplica movimientos.

La regla DNI también llega a cobros de membresías. Si el DNI ya existe en una base dev, el seed no crea otra cuenta: usar el titular de ese DNI o revisar sus datos de prueba. No hay cambios en la interfaz ni se envían datos reales de tarjeta.

## Estados, idempotencia y transacciones

`PENDIENTE_PAGO → CONFIRMADA | RECHAZADA | EXPIRADA | CANCELADA`.
`CONFIRMADA → CANCELADA | CUMPLIDA`.

La clave UUID se conserva por usuario y recurso. Reutilizarla para otro turno da 409. Un turno permite varias reservas históricas, pero una sola ocupante. El pago usa la clave interna estable `cancha:{reservaId}` y un índice único por reserva: repetir POST /pagos devuelve el pago anterior, sin cobrar de nuevo.

M4 toma un bloqueo pesimista sobre la cancha para reservar, pagar, cancelar, crear turnos o mantenimiento. El índice parcial SQL protege ocupación y una exclusión GiST protege turnos solapados. Triggers coordinan mantenimiento y reservas incluso ante escritura SQL directa. Ver [ADR-004](adr/ADR-004-tif-concurrencia-canchas.md).

La fake es interna, síncrona y no usa red: se procesa dentro de la transacción del recurso. **No se sostiene esa transacción esperando a una pasarela externa.** Una integración remota requerirá separar solicitud/resultado y resolver aprobaciones tardías y compensaciones; ese proveedor no se implementa aquí.

Cada pago aprobado genera un PDF único persistido. El reembolso conserva el documento del cobro original y registra monto, porcentaje, fecha y referencia; distingue REEMBOLSADO de REEMBOLSADO_PARCIAL. M4 libera la reserva; M5 conserva el movimiento financiero. La política de membresías sigue siendo su plazo propio de 24 horas.

## Persistencia y pruebas

V16 no modifica V1–V15. Requiere la extensión PostgreSQL `btree_gist`, que Flyway crea en `public` (el rol de migración debe tener permiso). Ante turnos solapados, nombres duplicados, ocupaciones duplicadas o estados históricos ambiguos, la migración falla para revisar los datos; no los elimina.

Pruebas: `PrecioCanchaTest`, `CanchasIntegrationTest`, `PasarelaPagoFakeTest` y regresiones de membresías/pagos. Ejecutar con `scripts/pruebas-backend.ps1` (Docker/Java 21) o Maven con `PLAN_TEST_DB_URL` hacia PostgreSQL aislado. Las pruebas nunca se apuntan a desarrollo ni producción.

El benchmark RNF-03 genera 25 sedes, 100 canchas y 8400 turnos; consulta 84 turnos tras calentamiento y registra 30 muestras en `target/rnf03-canchas.txt`. Mide el servicio local completo, no latencia de red, HTTP ni un SLA productivo. Evidencia resumida en [RNF-03](rnf/RNF-03-canchas.md).

La implementación no completa por sí sola la entrega global: quedan la conexión del frontend por su responsable, la exportación de Swagger, y la coordinación de diagramas/manuales del TIF con el equipo.
