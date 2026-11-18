# C4-3 · Componentes de Canchas Deportivas (M4)

**Versión:** 1.0 · **Fecha:** 18/11/2026 · **Autor:** pendiente de confirmación  
**Base verificada:** `main`, commit `2493668`.

[Fuente editable](c4-03-canchas.drawio) · [Exportación SVG](c4-03-canchas.svg)

## Alcance

La vista descompone M4 dentro del contenedor API Spring Boot. Membresías (M1) y Pagos (M5) son módulos vecinos del mismo proceso. React y PostgreSQL son contenedores externos a la API, de acuerdo con [C4-1 Contexto](c4-01-contexto.svg) y [C4-2 Contenedores](c4-02-contenedores.svg). La relación REST dibujada corresponde a la consulta de canchas por sede desde [`ServiciosSede.jsx`](../../frontend/src/components/ServiciosSede.jsx). Las rutas de turnos, reserva, pago y PDF se describen como capacidades de la API. [Guía de integración M4/M5](../integracion-canchas-pagos.md)

## Componentes y dependencias

| Componente | Responsabilidad y referencia |
|---|---|
| [`CanchaController`](../../src/main/java/com/fitzonesports/reserva/controller/CanchaController.java) | Delega catálogo, turnos y mantenimiento a `CanchaService`. Delega retención y cancelación de reservas a `ReservaCanchaService`. |
| [`TarifaCanchaController`](../../src/main/java/com/fitzonesports/reserva/controller/TarifaCanchaController.java) | Consulta tipos de cancha. Deriva alta y cambios de tipos y tarifas y actualización de recargo por sede a `CanchaService`. |
| [`ReservaController`](../../src/main/java/com/fitzonesports/reserva/controller/ReservaController.java) | Delega a `ReservaCanchaService` la consulta y el historial propio o administrativo de reservas. |
| [`CanchaService`](../../src/main/java/com/fitzonesports/reserva/service/CanchaService.java) | Gestiona recursos, tarifas, turnos y mantenimiento. Verifica sede y permisos. Usa `JdbcTemplate` y `CanchaRepository` y consulta vigencia en [`MembresiaService`](../../src/main/java/com/fitzonesports/membresia/service/MembresiaService.java). |
| [`ReservaCanchaService`](../../src/main/java/com/fitzonesports/reserva/service/ReservaCanchaService.java) | Orquesta las transacciones de retención, pago y cancelación. Delega al servicio de canchas el bloqueo y el cálculo de precio. Usa JDBC para persistir el estado de la reserva. |
| [`PricingStrategy`](../../src/main/java/com/fitzonesports/reserva/pricing/PricingStrategy.java) | Interfaz seleccionada por `CanchaService` según vigencia. [`PrecioEstandarStrategy`](../../src/main/java/com/fitzonesports/reserva/pricing/PrecioEstandarStrategy.java) prorratea el recargo parametrizado de 19:00 a 21:00, con extremo superior exclusivo. [`PrecioSocioStrategy`](../../src/main/java/com/fitzonesports/reserva/pricing/PrecioSocioStrategy.java) reutiliza ese total y aplica 15 % de descuento. |
| [`CanchaRepository`](../../src/main/java/com/fitzonesports/reserva/repository/CanchaRepository.java) | Repositorio Spring Data JPA de [`Cancha`](../../src/main/java/com/fitzonesports/reserva/model/Cancha.java). `bloquear(id)` aplica `PESSIMISTIC_WRITE` sobre la fila de la cancha dentro de la transacción del servicio. |
| [`VencimientoReservasJob`](../../src/main/java/com/fitzonesports/reserva/service/VencimientoReservasJob.java) | Invoca `ReservaCanchaService.vencer()` para expirar retenciones y marcar reservas cumplidas. El intervalo predeterminado es de 30 segundos. |
| [`PagoController`](../../src/main/java/com/fitzonesports/pago/controller/PagoController.java) y [`PagoCanchaService`](../../src/main/java/com/fitzonesports/pago/service/PagoCanchaService.java) | `POST /pagos` llama a `ReservaCanchaService.pagar`. M4 delega el cobro y los reembolsos en el servicio M5, que usa la transacción activa y [`PasarelaPagoFake`](../../src/main/java/com/fitzonesports/pago/pasarela/PasarelaPagoFake.java), un adaptador interno sin red. La descarga de PDF y la consulta de pagos tienen sus propias rutas de M5. |
| [`ComprobanteService`](../../src/main/java/com/fitzonesports/pago/service/ComprobanteService.java) | M4 solicita la emisión cuando el pago se aprueba. El servicio usa [`ComprobantePdfRenderer`](../../src/main/java/com/fitzonesports/pago/service/ComprobantePdfRenderer.java) y conserva el PDF original. Para devoluciones vía API de pagos, [`ReembolsoService`](../../src/main/java/com/fitzonesports/pago/service/ReembolsoService.java) deriva la cancelación de cancha a M4. |

## Concurrencia y persistencia

- **Bloqueo de aplicación.** Las operaciones de ocupación y mantenimiento toman el bloqueo a través de `CanchaService.bloquear` y el repositorio JPA. El lock pertenece a la transacción de PostgreSQL. El turno queda retenido por un estado persistido entre la solicitud de reserva y la solicitud de pago. La retención predeterminada dura 10 minutos y queda acotada al inicio del turno.
- **Garantías de base de datos en V16.** El índice parcial `uk_reserva_cancha_ocupante` admite una sola reserva `PENDIENTE_PAGO` o `CONFIRMADA` por turno. `ex_turnos_superpuestos` usa GiST para impedir horarios incompatibles de una cancha. Los triggers `validar_reserva_cancha` y `validar_mantenimiento_cancha` coordinan sobre la fila de cancha con `FOR UPDATE`. El índice `uk_pago_reserva_cancha` refuerza la unicidad del pago por reserva.
- **Contrato e idempotencia.** La retención exige `Idempotency-Key` UUID. El cobro usa el importe guardado en la reserva y reutiliza el pago previo en reintentos. Un rechazo del fake queda persistido, libera el turno y deja la operación sin PDF. Un conflicto de ocupación se devuelve como `409`. El mock se ejecuta dentro de la transacción, en el mismo proceso.

[ADR-004](../adr/ADR-004-tif-concurrencia-canchas.md) · [Migración Flyway V16](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql) · [Contrato OpenAPI](../openapi/openapi.yaml) · [Guía backend M4/M5](../canchas-pagos-backend.md) · [Guía de integración M4/M5](../integracion-canchas-pagos.md)

**Trazabilidad:** RF-09 a RF-14, RN-02 y RN-03. La evidencia automatizada está en [`PrecioCanchaTest`](../../src/test/java/com/fitzonesports/reserva/PrecioCanchaTest.java), [`CanchasIntegrationTest`](../../src/test/java/com/fitzonesports/reserva/CanchasIntegrationTest.java) y [`PasarelaPagoFakeTest`](../../src/test/java/com/fitzonesports/pago/PasarelaPagoFakeTest.java).
