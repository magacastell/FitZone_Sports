# ADR-004 — Bloqueo de cancha y garantía SQL de ocupación

- **Estado:** Aceptado
- **Fecha:** 2026-11-11
- **Autor:** Bautista Orge Perilli
- **Sprint:** Cierre; numeración pendiente de contraste con la planificación del equipo.

## Contexto

M4 tenía controladores 501 y un catálogo de turnos único por comienzo, pero no garantizaba una ocupación por turno. Reservas y mantenimientos podían entrar simultáneamente sobre una misma cancha. El pago fake era síncrono y local; M1 y M5 ya implementaban cobros, documentos y devoluciones de membresías.

## Alternativas consideradas

| Alternativa | Ventaja | Costo / descarte |
|---|---|---|
| Consultar disponibilidad y luego insertar | Simple | Carrera entre lectura e insert; insuficiente para RN-02. |
| Solo índice único de reserva activa | Árbitro SQL final para un turno | No coordina intervalos de mantenimiento ni generación de turnos. Se conserva como segunda defensa. |
| Bloqueo optimista con @Version | Menos espera con baja contención | Reintentos y coordinación más complejos entre reserva y mantenimiento. No se adopta para este flujo. |
| Bloqueo pesimista por turno | Mayor paralelismo entre turnos | Mantenimiento cubre varios turnos y requiere un orden global de locks. |
| Bloqueo pesimista por cancha + restricciones SQL | Orden común para todos los cambios de ocupación | Serializa también turnos distintos de la misma cancha. Elegido por simplicidad y consistencia del alcance actual. |

## Decisión

Serializar las escrituras de ocupación con un bloqueo pesimista JPA sobre la cancha y respaldar RN-02 con un índice único parcial de reservas ocupantes, una exclusión GiST de turnos y triggers de compatibilidad con mantenimiento en PostgreSQL.

Las reservas PENDIENTE_PAGO y CONFIRMADA ocupan; CANCELADA, RECHAZADA, EXPIRADA y CUMPLIDA conservan historia sin ocupar. Las expiraciones se procesan bajo el mismo lock. Un intento competidor recibe 409; no se cobran dos reservas del mismo turno.

Strategy utiliza implementaciones intercambiables de tarifa estándar y socio; cada una contempla recargo pico, y la variante socio aplica 15% después. Se descarta una pila de Decorators para esta versión porque hay dos variantes estables y no promociones arbitrarias. Las reglas acumulativas siguen explícitas y probadas. La fachada de reservas orquesta sin transferir a M5 la propiedad de las reservas.

## Consecuencias

- **Positivas:** garantías también ante SQL directo, mismo orden de locks para mantenimiento, precios y recursos históricos preservados, idempotencia por reserva y pago.
- **Negativas:** mayor contención por cancha; extensión `btree_gist`; proyecciones y operaciones SQL complementan el catálogo JPA.
- **Deuda asumida:** el fake local se procesa dentro de la transacción. Si se incorpora una pasarela remota, se separarán solicitud y confirmación con compensación de pagos tardíos. No se espera red bajo lock. Un crecimiento de contención justificaría medir y reducir la granularidad.

## Requisitos relacionados

RF-09 a RF-14, RN-02, RN-03, RNF-02 y RNF-03.

## Verificación

`CanchasIntegrationTest` usa PostgreSQL: dos clientes simultáneos, pago repetido concurrente, mantenimiento frente a reserva, restricción SQL, vencimiento, cancelaciones y PDF. `PrecioCanchaTest` cubre estándar, socio, pico, combinación y límites. El ADR registra la decisión implementada; no sustituye los reportes ni declara cerrados los demás artefactos del TIF.
