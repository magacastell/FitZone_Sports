# UML de estados de membresía

RF-02 · Versión 1 · 10/11/2026 · Autor nominal pendiente de confirmación · Base `a367a8d`

[Fuente editable](uml-estados-membresia.drawio) · [Exportación SVG](uml-estados-membresia.svg)

## Recorrido

Una contratación confirmada crea una cuenta **ACTIVA** y su primer período pagado. La cuenta está **SUSPENDIDA** si su bandera de suspensión está activa. Si la bandera está desactivada, la cuenta está **ACTIVA** cuando existe un período no cancelado con `inicio ≤ ahora < fin`, y **VENCIDA** en otro caso. La respuesta calcula el estado en el momento de la consulta. El job también actualiza el valor persistido.

| Evento | Guarda y efecto |
| --- | --- |
| Contratar | El servicio exige usuario activo con rol `USUARIO`, plan activo, sede válida compatible con la habitual y clave de idempotencia. Una contratación nueva requiere que el usuario carezca de cuenta previa. El primer período empieza al momento del alta. El cobro y la creación del período se hacen en la misma transacción. |
| Llegar al límite de un período o al inicio del siguiente | El fin es exclusivo. Si existe otro período vigente en ese instante, la cuenta sigue activa. Si quedó un intervalo sin cobertura, vuelve a activarse cuando empieza el período programado. Durante la suspensión transcurre el mismo tiempo de vigencia. |
| Renovar manualmente | Titular o gerencia, usuario operador y titular activos, cuenta sin suspensión, plan activo y clave de idempotencia. El período comienza en el mayor fin futuro de los períodos no cancelados o en el momento actual si no hay un fin futuro. Así se conserva la vigencia actual en una renovación anticipada. El nuevo período activa de inmediato una cuenta vencida si empieza en ese momento. |
| Procesar renovación automática | El job actualiza vencimientos y procesa las cuentas habilitadas. Exige `fechaFin ≤ ahora`, cuenta sin suspensión, titular activo, plan activo, token de renovación simulado y clave de operación aún sin período asociado. Si el plan está inactivo o falta el token, deshabilita la opción. Habilitar o deshabilitar la opción cambia la configuración de renovación. |
| Suspender o reactivar | Gerencia activa o recepción activa de la sede del titular, con motivo obligatorio. Al cambiar la bandera se registra una auditoría. Se puede suspender desde **ACTIVA** o **VENCIDA**. Al reactivar, la vigencia del período decide el destino. Repetir la misma acción no cambia la bandera ni agrega auditoría. |
| Ejercer arrepentimiento | Titular o gerencia, período con pago reembolsable de esa cuenta y `ahora < fechaCobro + 24 h`. Se reembolsa el pago, se cancela el período, se conserva el historial y se deshabilita la renovación automática. Una cuenta activa pasa a **VENCIDA** si pierde su último período vigente. Con suspensión vigente la cuenta sigue **SUSPENDIDA**. |

## Evidencia en el repositorio

| Elemento | Archivo y punto de lectura |
| --- | --- |
| Alta y renovación, cálculo de fechas, vigencia y estados | [MembresiaService.java](../../src/main/java/com/fitzonesports/membresia/service/MembresiaService.java) · `contratar`, `renovar`, `agregarPeriodo`, `respuesta`, `tienePeriodoVigente` y `actualizarVencimientos`. |
| Disparador de renovación automática y sus guardas | [RenovacionAutomaticaJob.java](../../src/main/java/com/fitzonesports/membresia/service/RenovacionAutomaticaJob.java) · `procesar`. [MembresiaService.java](../../src/main/java/com/fitzonesports/membresia/service/MembresiaService.java) · `configurarAutomatica` y `procesarAutomatica`. |
| Suspensión, motivo y reactivación | [MembresiaService.java](../../src/main/java/com/fitzonesports/membresia/service/MembresiaService.java) · `actualizarEstado` y `validarAdministracion`. [MembresiaController.java](../../src/main/java/com/fitzonesports/membresia/controller/MembresiaController.java) · `PATCH /{membresiaId}/estado`. [ActualizarEstadoMembresiaRequest.java](../../src/main/java/com/fitzonesports/membresia/dto/ActualizarEstadoMembresiaRequest.java) · acciones y validación del motivo. |
| Reembolso y persistencia de los períodos | [Membresia.java](../../src/main/java/com/fitzonesports/membresia/model/Membresia.java), [PeriodoMembresia.java](../../src/main/java/com/fitzonesports/membresia/model/PeriodoMembresia.java), [V5__membresias_y_periodos.sql](../../src/main/resources/db/migration/V5__membresias_y_periodos.sql) y [V6__comprobantes_y_reembolsos.sql](../../src/main/resources/db/migration/V6__comprobantes_y_reembolsos.sql). [MembresiaService.java](../../src/main/java/com/fitzonesports/membresia/service/MembresiaService.java) · `cancelarPeriodo`. [ReembolsoService.java](../../src/main/java/com/fitzonesports/pago/service/ReembolsoService.java) · `solicitar`. |
| Cobro y duración | [CobroMembresiaService.java](../../src/main/java/com/fitzonesports/pago/service/CobroMembresiaService.java), [PasarelaPagoFake.java](../../src/main/java/com/fitzonesports/pago/pasarela/PasarelaPagoFake.java) y [V3__planes_membresia.sql](../../src/main/resources/db/migration/V3__planes_membresia.sql). |
| Casos de referencia | [MembresiaIntegrationTest.java](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java) · vencimiento exacto, continuidad entre períodos, suspensión, reactivación, renovación automática, cobro rechazado y arrepentimiento. |

## Diferencias y precisiones frente al enunciado

RF-02 nombra Activo, Vencido y Suspendido y pide renovación automática simulada o manual vía pasarela. El código usa `ACTIVA`, `VENCIDA` y `SUSPENDIDA`. La pasarela de membresías del corte es simulada también para el alta y la renovación manual. Los planes admiten duraciones de 1, 3 y 12 meses calendario. `PROGRAMADA` y `CANCELADA` son etiquetas de la respuesta para **períodos**. El arrepentimiento actúa sobre un período y preserva la cuenta.
