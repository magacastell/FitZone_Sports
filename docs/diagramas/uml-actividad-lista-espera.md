# UML de actividad de lista de espera

RF-08 · Versión 2 · 11/11/2026 · Autor nominal pendiente de confirmación · Base `a367a8d`

[Fuente editable](uml-actividad-lista-espera.drawio) · [Exportación SVG](uml-actividad-lista-espera.svg)

## Recorrido

La reserva directa bloquea la clase para comprobar capacidad, duplicados y solapamientos. Los lugares ocupados son las reservas confirmadas más las ofertas pendientes. Si el cupo se agota, la API devuelve 409. La persona decide si pulsa **Anotarme en la lista de espera**. Esa acción envía un `POST /clases/{claseId}/lista-espera` independiente. Bajo bloqueo, se exige que la clase siga llena y se asigna la siguiente posición. La reserva directa y el alta en espera cierran en `inicio − 48 h` inclusive. La API permite ambas operaciones a `GERENTE` o a `USUARIO` con membresía vigente.

Cuando se cancela una reserva confirmada antes del inicio, se amplía la capacidad, o se libera el lugar retenido por una oferta, `PublicadorClase` entrega `CupoLiberado` a sus observadores en el mismo hilo y transacción. `GestorListaEspera` toma la menor posición en estado `EN_ESPERA` por cada lugar libre, si la clase está `PROGRAMADA` y todavía falta más de una hora. Crea una oferta `PENDIENTE`, marca la entrada `OFERTADA` y publica `OfertaGenerada`. El lugar queda retenido hasta la respuesta o el vencimiento procesado. La fecha de vencimiento es el menor valor entre ocho horas desde la creación y una hora antes de la clase.

Puede cancelar la reserva su titular, aunque su membresía haya vencido, Recepción de la sede o Gerencia. El estado interno queda `CANCELADA` si faltan al menos dos horas, o `CANCELADA_TARDIA` si falta menos. El DTO devuelve `estado=CANCELADA` en ambos casos y los distingue con `tipoCancelacion=A_TIEMPO` o `TARDIA`. La cancelación tardía informa `cuentaComoFalta=true`. La aplicación de penalidades sigue pendiente.

Para **aceptar o rechazar**, la API exige `GERENTE` o `USUARIO` con membresía vigente. El servicio verifica que responda el destinatario o Gerencia. Si la oferta está pendiente, exige `ahora < venceEn`. Si ya está aceptada o rechazada y se repite la misma respuesta, devuelve la representación existente bajo los permisos vigentes. Una respuesta distinta sobre una oferta resuelta devuelve 409.

| Resultado de la oferta | Guarda y efecto |
| --- | --- |
| Aceptación | Para una respuesta nueva rigen las guardas anteriores. Además, el titular debe estar activo y tener membresía vigente, con excepción de la vigencia si el titular es gerente. La clase debe estar sin cancelar y todavía sin comenzar. El titular no debe tener una reserva solapada. Se crea una reserva confirmada y se vincula a la oferta. Oferta e inscripción quedan `ACEPTADA`. Un conflicto de aceptación no reasigna el lugar en esa operación. |
| Rechazo | Oferta pendiente y vigente, con permisos de respuesta. Marca la oferta `RECHAZADA` y la inscripción `RETIRADA`. Publica `CupoLiberado`. |
| Retiro | `USUARIO` o `GERENTE` puede retirar su propia entrada activa, con independencia de la vigencia de su membresía. Si estaba `OFERTADA`, rechaza la oferta si sigue pendiente, marca la entrada `RETIRADA` y publica `CupoLiberado`. Retirarse de la fila sin oferta no libera cupo. |
| Vencimiento | El job busca ofertas vencidas y vuelve a comprobar, con la clase bloqueada, que sigan pendientes y `ahora ≥ venceEn`. Marca la oferta y la inscripción `VENCIDA` y publica `CupoLiberado`. Una respuesta fuera de plazo devuelve conflicto aunque el job aún no haya actualizado la oferta. |

La letra **A** conecta el rechazo, retiro con oferta y vencimiento con una nueva evaluación del cupo liberado. Si se cancela administrativamente **la clase**, el flujo es distinto. Se cierran las reservas, las ofertas pendientes y la fila, y se emite `ClaseCancelada`.

## Aviso y consulta de la oferta

La oferta es un registro persistido. **Mis clases** muestra al usuario las ofertas pendientes y vigentes, con acciones para aceptar y rechazar. `NotificadorClase` recibe el evento real `OfertaGenerada` y programa el aviso para después del commit de la transacción de negocio. El adaptador activo por defecto, `NotificadorLog`, simula el aviso mediante una entrada en el log del servidor. El corte carece de un canal de entrega externo para esa notificación.

## Evidencia en el repositorio

| Elemento | Archivo y punto de lectura |
| --- | --- |
| Entrada HTTP, membresía y operaciones del usuario | [ClaseController.java](../../src/main/java/com/fitzonesports/clase/controller/ClaseController.java) · `reservarClase`, `incorporarListaEspera`, `salirListaEspera` y `responderOferta`. |
| Cupo, bloqueo, reserva y cancelación | [CuposClase.java](../../src/main/java/com/fitzonesports/clase/service/CuposClase.java) · `disponibles`. [ClaseGrupalRepository.java](../../src/main/java/com/fitzonesports/clase/repository/ClaseGrupalRepository.java) · `bloquear`. [ReservaClaseService.java](../../src/main/java/com/fitzonesports/clase/service/ReservaClaseService.java) · `reservar` y `cancelar`. [ClaseMapper.java](../../src/main/java/com/fitzonesports/clase/service/ClaseMapper.java) · representación de la cancelación en el DTO. |
| Inscripción, respuesta, retiro y vencimiento | [ListaEsperaService.java](../../src/main/java/com/fitzonesports/clase/service/ListaEsperaService.java) · `incorporar`, `responder`, `salir` y `vencerOferta`. [ReglasClase.java](../../src/main/java/com/fitzonesports/clase/service/ReglasClase.java) y [VencimientoOfertasJob.java](../../src/main/java/com/fitzonesports/clase/service/VencimientoOfertasJob.java) · plazos y tarea programada. |
| Publicación, suscripción y FIFO | [EventoClase.java](../../src/main/java/com/fitzonesports/clase/observer/EventoClase.java), [PublicadorClase.java](../../src/main/java/com/fitzonesports/clase/observer/PublicadorClase.java), [ObservadorClase.java](../../src/main/java/com/fitzonesports/clase/observer/ObservadorClase.java) y [GestorListaEspera.java](../../src/main/java/com/fitzonesports/clase/observer/GestorListaEspera.java) · `ofrecerLugares`. [InscripcionEsperaRepository.java](../../src/main/java/com/fitzonesports/clase/repository/InscripcionEsperaRepository.java) · selección por posición ascendente. |
| Estados de oferta y espera | [OfertaClase.java](../../src/main/java/com/fitzonesports/clase/model/OfertaClase.java), [InscripcionEspera.java](../../src/main/java/com/fitzonesports/clase/model/InscripcionEspera.java) y [V15__clases_grupales.sql](../../src/main/resources/db/migration/V15__clases_grupales.sql) · estados, posición y unicidad. |
| Oferta visible y aviso simulado | [MiActividadService.java](../../src/main/java/com/fitzonesports/clase/service/MiActividadService.java), [AgendaClases.jsx](../../frontend/src/modules/m3-clases/AgendaClases.jsx), [NotificadorClase.java](../../src/main/java/com/fitzonesports/clase/observer/NotificadorClase.java), [Notificador.java](../../src/main/java/com/fitzonesports/clase/observer/Notificador.java) y [NotificadorLog.java](../../src/main/java/com/fitzonesports/clase/observer/NotificadorLog.java). |
| Ampliación de capacidad y cancelación administrativa | [ClaseService.java](../../src/main/java/com/fitzonesports/clase/service/ClaseService.java) · actualización de cupo y `cancelar`. |

## Diferencias y precisiones frente al enunciado

RF-08 pide avisar al socio cuando se libera un lugar. El código publica el evento interno y ofrece el lugar en el portal. El envío externo queda simulado en logs. RF-07 describe reservas hasta 48 horas antes y cancelación sin penalidad hasta 2 horas antes. El código rechaza la inscripción desde el instante `inicio − 48 h` inclusive, y registra la cancelación con menos de 2 horas de anticipación como `CANCELADA_TARDIA`. La penalidad no forma parte del recorrido implementado.
