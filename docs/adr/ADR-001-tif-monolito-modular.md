# ADR-001 — Monolito modular para el backend de FitZone Sports

- **Estado:** Aceptado
- **Fecha:** 2026-11-10 (redacción documental).
- **Fecha histórica de decisión:** 2026-09-05, consignada en el antecedente de Unidad I.
- **Autor:** Pendiente de identificación y revisión grupal.
- **Sprint:** Pendiente de contraste con la planificación histórica.

## Contexto

El sistema necesitaba integrar usuarios y membresías (M1), acceso (M2), clases (M3), canchas (M4) y pagos (M5). RN-02 exigía evitar reservas concurrentes del mismo turno y RNF-04 permitía incorporar sedes sin detener el sistema. El equipo contaba con seis integrantes, según la información aportada para este cierre; no se reconstruye su dedicación ni su planificación.

El enunciado, p. 14, definía monolito modular y PostgreSQL. El antecedente [Unidad I, §3.1](https://docs.google.com/document/d/1sgUz-_ovSKQPJSD3dFt6M5ycwiDxV6LK/edit) registró la elección como aceptada el 2026-09-05. Ese registro histórico no prueba aislamiento efectivo entre módulos.

## Alternativas consideradas

Las dos primeras alternativas constan en el antecedente; no se atribuyen experimentos de rendimiento ni prototipos al equipo.

| Alternativa | A favor | En contra | Por qué se descartó |
|---|---|---|---|
| Microservicios | Permiten separar despliegues y escalado por dominio. | Distribuyen las operaciones que cruzan reservas, cobros y membresías; exigen coordinación y operación adicionales. | El antecedente priorizó transacciones locales y velocidad de desarrollo. No se afirma que todo microservicio necesariamente use BASE o carezca de ACID. |
| Monolito con partición exclusivamente técnica | Un proceso y una base simplifican la operación inicial. | La organización por controllers/services globales no expresa por sí sola fronteras de negocio. | El antecedente buscó módulos de dominio explícitos para reducir el acoplamiento. |
| Monolito modular | Transacciones locales y organización por dominio con despliegue backend conjunto. | Acoplamiento de despliegue y límites que deben mantenerse activamente. | Seleccionada; coincide con el enunciado y el código. |
| SOA y serverless | SOA puede exponer capacidades compartidas; serverless puede delegar operación y ejecutar funciones bajo demanda. | Añadirían contratos remotos o segmentación de ejecución a operaciones hoy locales. | La §5.2.1 exige el contraste, pero las fuentes leídas no acreditan su evaluación por el equipo. Se incluyen para revisión actual, no como descartes históricos confirmados. |

## Decisión

Se utiliza un único backend Spring Boot organizado por dominios, con PostgreSQL central compartido, para mantener las operaciones actuales dentro de transacciones locales y reducir la carga de integración del equipo.

### Evidencia y justificación

- [Aplicación Spring](../../src/main/java/com/fitzonesports/FitZoneSportsApplication.java) y [pom.xml](../../pom.xml): un proyecto Maven y un artefacto backend; no cinco servicios desplegables.
- Los paquetes `usuario`, `membresia`, `acceso`, `clase`, `reserva` y `pago` expresan dominios; `auth`, `sede` y `reporte` son capacidades adicionales. M1 comprende varios paquetes: no existe correspondencia de un paquete por cada M.
- M3 se incorporó a `main` en `5f71e61`: [ClaseController](../../src/main/java/com/fitzonesports/clase/controller/ClaseController.java) delega agenda, reservas y lista de espera en servicios del mismo backend. [PublicadorClase](../../src/main/java/com/fitzonesports/clase/observer/PublicadorClase.java) y sus observadores operan dentro del monolito; no introducen otro proceso ni broker. La incorporación no acredita por sí sola el cumplimiento completo de RF-06/07/08: asistencia continúa en 501, penalidades pendientes y avisos mediante [NotificadorLog](../../src/main/java/com/fitzonesports/clase/observer/NotificadorLog.java).
- [MembresiaService](../../src/main/java/com/fitzonesports/membresia/service/MembresiaService.java) coordina persistencia y cobro de membresía con `@Transactional`. [PasarelaPagoFake](../../src/main/java/com/fitzonesports/pago/pasarela/PasarelaPagoFake.java) se invoca dentro del proceso y no realiza cargos externos.
- [AccesoService](../../src/main/java/com/fitzonesports/acceso/service/AccesoService.java) consulta servicios de usuario, sede y membresía. [SincronizacionOfflineService](../../src/main/java/com/fitzonesports/acceso/offline/SincronizacionOfflineService.java) accede mediante SQL a tablas de otros dominios. La modularidad es organizativa y parcial, sin encapsulamiento estricto verificado.

El frontend es una aplicación separada y la terminal es una ejecución de esa misma aplicación en el navegador. La decisión de monolito se refiere al backend; no implica un único proceso para toda la solución. La continuidad de sede requiere el diseño adicional de [ADR-003](ADR-003-tif-validacion-qr-offline.md) y [ADR-007](ADR-007-tif-replica-y-reconciliacion.md).

## Consecuencias

- **Positivas:** operación backend sencilla; coordinación síncrona en memoria y transacciones SQL; permite distribuir trabajo por dominio sin introducir una plataforma distribuida.
- **Negativas:** recompilación y despliegue conjuntos; no hay escalado independiente de M1–M5; una falla del proceso afecta todos sus dominios online.
- **Deuda asumida:** revisar accesos SQL cruzados y fronteras de módulos. No hay evidencia de reglas automatizadas de arquitectura. Cambiar a pasarela remota requerirá otro diseño: rollback SQL no revierte un cargo externo.

## Requisitos relacionados

RN-02 y RNF-04 (disparadores oficiales); RF-01 a RF-14 como alcance funcional. La elección no acredita cumplimiento de todos ellos.

## Validación y límites

La topología se verificó inicialmente en `d4ceaa33bd7a8a588ccab2a9789a875a9f31ba15` y se contrastó la incorporación de M3 en `5f71e61cd86598a1318f88d231fe488ba80a3991`. La suite backend preexistente y sus límites se identifican en el [índice de arquitectura](../arquitectura-tif.md#evidencia-de-validación-consultada): sus resultados anteriores no se extrapolan al M3 integrado. No valida separación estricta de módulos ni RN-02 de M4: sus controllers siguen parcialmente en 501. La consideración histórica de SOA/serverless y los metadatos de autor/sprint no están acreditados. El estado Aceptado registra la decisión técnica adoptada, sin acreditar los requisitos pendientes. Ver [C4 de contenedores](../diagramas/c4-02-contenedores.svg).
