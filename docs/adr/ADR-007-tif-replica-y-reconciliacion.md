# ADR-007 — Réplica local acotada, cola de movimientos y reconciliación offline

- **Estado:** Propuesto
- **Fecha:** 2026-11-10 (redacción documental; fecha de ratificación pendiente)
- **Autor:** Pendiente de identificación y revisión grupal.
- **Sprint:** Pendiente de contraste con la planificación histórica.

## Contexto

La sede necesitaba conservar autorización operativa y movimientos durante una partición, recuperar la cola al reabrir el navegador e integrar lo capturado aunque hubiera reintentos o respuestas perdidas. RN-01 exigía evitar doble presencia entre sedes, pero una terminal aislada no podía conocer todos los ingresos simultáneos de otras. Era necesario definir qué copia local se usaba, su vigencia y cómo conservar evidencia de conflictos al reconectar.

La copia no podía convertirse en una réplica completa de identidades, fotografías, pagos o base central. El requisito y las opciones históricas constan en [C4 Nivel 3](https://docs.google.com/document/d/1vqBHYC_3TgRGiph4B1VeptCt6xAE5QYu/edit) y [Definición de Módulos](https://docs.google.com/document/d/1ytZBV5KiQJK5Xw6L2fmeCIRmAZiVYkasMku0qHQXLFc/edit). La implementación vigente y el descarte de agente local constan en [M2 offline](../m2-offline.md).

## Alternativas consideradas

| Alternativa | A favor | En contra | Por qué se descartó |
|---|---|---|---|
| Cuaderno y regularización manual | Infraestructura mínima. | Sin persistencia transaccional del QR ni integración automática/idempotente verificable. | Antecedente histórico superado; no es la operación actual. |
| Agente Java/SQLite por sede | Almacenamiento y ejecución locales fuera del navegador. | Instalación, actualización y operación adicionales por sede. | Descarte documentado por M2; se reutilizó el stack web. |
| PWA + IndexedDB/Dexie y sincronización por API | Sobrevive a reapertura, usa el navegador existente y permite transacciones locales. | Depende del perfil/equipo y requiere política explícita de reintento/conflicto. | Adoptada en el MVP. |

El antecedente nombró caché edge/Redis/SQLite como opciones a evaluar. No acredita una comparación implementada ni replicación física de PostgreSQL. No se inventa una evaluación de brokers, CRDT o servicios cloud.

## Decisión

Se conserva una copia firmada y acotada en IndexedDB, se capturan movimientos con UUID estable en una transacción local y se reconcilian mediante una inbox central transaccional e idempotente que conserva los conflictos para revisión.

### Qué se replica y con qué frecuencia

[TerminalOfflineService](../../src/main/java/com/fitzonesports/acceso/offline/TerminalOfflineService.java) registra un terminal y operador por sede y firma una copia versión 2 de hasta dos horas: revisión, IDs del terminal/operador/sede, cuenta del operador, capacidad, bloqueos conocidos y presencias abiertas conocidas de todas las sedes. Conserva hasta 1000 miembros/lotes anteriores con datos de compatibilidad; no son necesarios para admitir autorizaciones nuevas multisede. No replica fotografías, DNI, email de socios, contraseñas ni claves privadas. La lista de compatibilidad sí puede incluir nombres y períodos de esos miembros: no se promete anonimato total.

[TerminalOffline.jsx](../../frontend/src/modules/m2-acceso/TerminalOffline.jsx) permite preparación inicial autenticada, intenta sincronizar al abrir, al evento `online`, cada **10 s** y manualmente, y renueva la copia cuando tiene al menos **un minuto** y no hay pendientes. Con central disponible, antes de un ingreso sincroniza pendientes y vuelve a preparar. La frecuencia es un intento condicionado por red/sesión/pestaña activa, no una garantía en segundo plano ni un SLA. No hay Background Sync de Workbox. La copia expirada impide capturas nuevas, pero no elimina eventos anteriores.

### Captura y almacenamiento local

[db.js](../../frontend/src/services/offline/db.js) define Dexie `fitzone-m2-offline`, versión 1, con stores `meta`, `movimientos`, `presencias` y `usos`. [registrarLocal](../../frontend/src/services/offline/movimientos.js) escribe evento, presencia, consumo del `jti` y secuencia en una transacción que comparte esos stores. Dos pestañas no pueden confirmar el mismo ingreso conocido; un fallo de almacenamiento no produce éxito en UI. Se solicita persistencia al navegador y se informa si no la concede.

Cada evento conserva UUID, visita UUID local o referencia `central:<id>`, usuario, tipo, captura, revisión, QR como evidencia y secuencia. Sede/terminal/operador locales ayudan a la UI, pero el servidor deriva la autoridad del registro del terminal. El resultado y el aforo locales son provisionales. El lote del socio y su selección de token son estado durable diferente de la cola de Recepción.

### Envío, idempotencia y conflictos

- [sync.js](../../frontend/src/services/offline/sync.js) envía hasta **100** pendientes por lote a `POST /api/v1/accesos/offline/sincronizacion`. Prioriza por último intento/secuencia para que `EN_ESPERA` no impida enviar otros eventos. Web Locks coordina pestañas cuando está disponible; la garantía central no depende de esa API.
- Se requiere sesión central válida del operador original para enviar. Ante fallo de transporte, ACK perdido o cambio de sesión se conserva la cola. No se crea otro UUID al reintentar el mismo evento.
- [SincronizacionOfflineService](../../src/main/java/com/fitzonesports/acceso/offline/SincronizacionOfflineService.java) autoriza el terminal, lo bloquea y bloquea usuarios en orden. El escritor online comparte la exclusión por usuario. Inserta inbox, resultado y visita dentro de la misma transacción. Se verifica la copia original por revisión al instante de captura: recibirla después de caducar no invalida por sí solo lo capturado válidamente.
- Repetir UUID y contenido devuelve el resultado guardado con `repetido=true`. Reutilizar el UUID con otro payload registra `acceso_intento_incompatible` y devuelve conflicto, conservando el original. No existe una garantía de transporte exactamente una vez: se tolera entrega repetida con efecto central idempotente.
- `CONFIRMADO` integra el acceso; `CONFLICTO` conserva evidencia incompatible, incluido solapamiento entre sedes o QR usado; `RECHAZADO` conserva evidencia inválida; `EN_ESPERA` permite completar una visita desordenada. En el cliente este último permanece `PENDIENTE`.
- Además del índice central de presencia abierta de [V4](../../src/main/resources/db/migration/V4__qr_y_accesos_abiertos.sql), se comparan intervalos históricos y se comparte `qr_jti` mediante [V14](../../src/main/resources/db/migration/V14__uso_qr_multisede.sql). Un índice sólo sobre visitas abiertas no detecta solapamientos ya cerrados. El importador aplica el cierre diario al conciliar visitas antiguas.
- Al renovar la copia, [guardarCopia](../../frontend/src/services/offline/db.js) exige no tener pendientes y conserva presencias locales en conflicto de la sede hasta registrar salida; no las borra por reemplazar el snapshot. Las respuestas terminales permanecen para revisión. No hay consola general de resolución administrativa implementada.

El criterio favorece continuidad provisional y trazabilidad de lo ocurrido físicamente. No usa último escritor gana ni borra una visita central para forzar la aceptación de un evento offline.

## Consecuencias

- **Positivas:** recuperación tras cierre/reapertura; reintentos sin visitas duplicadas; evidencia original conservada; captura y aceptación central con fronteras transaccionales explícitas.
- **Negativas:** revocación y conocimiento de otras sedes diferidos; almacenamiento ligado al navegador; espera/revisión de conflictos. No se puede garantizar RN-01 global entre sedes completamente aisladas que siguen admitiendo.
- **Deuda asumida:** sin resolución administrativa completa, respaldo externo de cola ni rotación en caliente. Borrar el perfil/perder el dispositivo puede perder pendientes; no hay replicación entre terminales ni múltiples terminales autorizados por sede. Una copia firmada no prueba integridad de un equipo comprometido. Las dos horas acotan, pero no eliminan, el riesgo de credenciales al portador y estado comercial desactualizado.

## Requisitos relacionados

RNF-01 y RN-01 (disparadores oficiales), RF-04 y RF-05. [ADR-003](ADR-003-tif-validacion-qr-offline.md) explica la validación criptográfica, confianza y caducidad; este ADR explica persistencia y convergencia posterior, sin repetir el diseño de firma.

## Validación y límites

`OfflineIntegrationTest` cubre batch desordenado, egreso anticipado, UUID con payload distinto, sincronización tardía, suspensión diferida y conflictos multisede incluso de visitas cerradas. `test-offline.mjs` usa Node/fake-indexeddb para transacciones, replay y transporte incierto; no equivale a navegador. La E2E existente usa Chrome real, Spring/PostgreSQL aislados, caída de red, reapertura, reinicio con clave estable y respuesta perdida tras commit: [evidencia consultada](../arquitectura-tif.md#evidencia-de-validación-consultada). No se ejecutó de nuevo en esta tarea. No acredita SLA ni resistencia a robo/manipulación. Falta ratificar esta política de continuidad/conflicto, autor y sprint. Ver [secuencia UML](../diagramas/uml-secuencia-acceso-offline.svg).
