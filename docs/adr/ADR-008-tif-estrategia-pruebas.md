# ADR-008 — Estrategia de testing y cobertura

- **Estado:** Propuesto
- **Fecha:** 2026-11-11 (redacción documental).
- **Fecha histórica de decisión:** No acreditada para la estrategia integral ni para el umbral de cobertura.
- **Autor:** Pendiente de identificación y revisión grupal.
- **Sprint:** Pendiente de contraste con la planificación histórica.

## Contexto

El equipo necesitaba detectar regresiones en reglas de negocio, contratos HTTP y persistencia sin depender en cada cambio del entorno completo. Algunas garantías exigían PostgreSQL real, como las restricciones de integridad, las migraciones y la idempotencia transaccional. El flujo M2 también requería probar en navegador la continuidad offline, la persistencia local y la resincronización.

Al preparar el cierre, el proyecto ya tenía pruebas en varios niveles y una configuración de cobertura Java. Los resultados registrados correspondían a cortes anteriores. El índice de arquitectura y los manuales dejaban abierta la definición de la pirámide, el umbral mínimo y el criterio de integración. La §5.2.1 de los lineamientos del TIF exige registrar esas decisiones en ADR-008. El [índice de arquitectura](../arquitectura-tif.md), el [historial de pruebas](../pruebas.md) y el [Manual Técnico](../manuales/manual-tecnico.md#8-pruebas) documentan el punto de partida.

## Alternativas consideradas

La comparación se presenta para revisión del equipo. Los antecedentes consultados no acreditan descartes históricos de estas alternativas.

| Alternativa | A favor | En contra | Por qué se descartó |
| --- | --- | --- | --- |
| Concentrar la suite en pruebas aisladas con dobles | Retroalimentación rápida, control de entradas y diagnóstico localizado. | Deja sin verificar SQL, bloqueos, migraciones y comportamiento de un navegador desconectado. | Se propone conservarla como base de la pirámide. Por sí sola deja riesgos críticos sin comprobar. |
| Concentrar la suite en integración HTTP y E2E | Comprueba el recorrido con componentes reales y detecta problemas de configuración. | Aumenta el tiempo, los requisitos de entorno y el costo de aislar fallos. | Se propone reservar estos niveles para riesgos que requieren varias capas o el navegador completo. |
| Pirámide por riesgo con pruebas aisladas, integración y E2E selectiva | Combina diagnóstico rápido con verificación de base de datos y recorridos críticos. Reutiliza suites y runners existentes. | Requiere mantener fixtures, coordinar entornos y decidir qué se ejecuta en cada momento. | Opción propuesta. La distribución y sus criterios de aprobación siguen pendientes. |

## Decisión

Se propone adoptar una pirámide orientada a riesgos, con una base amplia de pruebas rápidas, integración sobre PostgreSQL para contratos y garantías de persistencia, y E2E selectiva para recorridos críticos. El criterio de asignación es usar el nivel más pequeño que pueda demostrar el comportamiento y elevar el alcance cuando la garantía dependa de varias capas.

### Evidencia y justificación

| Nivel | Implementación comprobada | Alcance de la evidencia |
| --- | --- | --- |
| Unitarias y capa web aislada | JUnit Jupiter, Mockito y Spring Test/MockMvc. [PlanServiceTest](../../src/test/java/com/fitzonesports/membresia/PlanServiceTest.java) usa un repositorio doble. [PlanControllerTest](../../src/test/java/com/fitzonesports/membresia/PlanControllerTest.java) comprueba HTTP con servicio doble. [ComprobantePdfRendererTest](../../src/test/java/com/fitzonesports/pago/ComprobantePdfRendererTest.java) verifica el PDF generado. | Aíslan reglas, DTO y representación. Las pruebas con dobles dejan fuera la persistencia y el servidor completo. |
| Integración backend y contrato | Spring Boot Test, PostgreSQL 18 aislado y Flyway. [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java), [PlanPersistenceTest](../../src/test/java/com/fitzonesports/membresia/PlanPersistenceTest.java), [OfflineIntegrationTest](../../src/test/java/com/fitzonesports/acceso/OfflineIntegrationTest.java) y [PagosIntegrationTest](../../src/test/java/com/fitzonesports/pago/PagosIntegrationTest.java) comprueban, entre otros, persistencia, permisos, idempotencia y reembolsos de membresía. [OpenApiMembresiaContractTest](../../src/test/java/com/fitzonesports/membresia/OpenApiMembresiaContractTest.java) parsea el YAML y comprueba los `$ref` locales. | Las clases con `@EnabledIfEnvironmentVariable` se omiten si falta `PLAN_TEST_DB_URL`. La comprobación de referencias del YAML tiene un alcance distinto de verificar cada respuesta HTTP contra el contrato. |
| Frontend aislado | [package.json](../../frontend/package.json) encadena seis suites con `npm test`. Los scripts usan Node, `node:assert/strict`, módulos VM y esbuild según el caso. [test-offline.mjs](../../frontend/scripts/test-offline.mjs) usa fake-indexeddb. [test-servicios-actividades.mjs](../../frontend/scripts/test-servicios-actividades.mjs) verifica el transporte de M3/M4 con un doble de la API. | Comprueban lógica, estados, transporte y persistencia simulada. Sus contadores describen casos de los scripts. El contrato de transporte de M4 puede probarse aunque las rutas del servidor sigan en `501`. |
| E2E selectiva | [e2e-m2-offline.mjs](../../frontend/scripts/e2e-m2-offline.mjs) ejecuta Playwright con Chrome, la PWA, Spring y PostgreSQL aislados. Incluye corte de red, reapertura, reinicio, pérdida del acuse y reintento. | Ejercita un recorrido real de M2. El build de Vite/PWA es un paso de preparación. El escenario no mide disponibilidad ni certifica los demás módulos. |

El uso de PostgreSQL real permite verificar comportamientos que un repositorio doble no reproduce. El reloj inyectable y el puerto de pagos facilitan controlar vigencias y respuestas del proveedor en pruebas. El navegador real cubre el service worker y la continuidad del perfil. [ADR-002](ADR-002-tif-postgresql-e-integridad.md) · [ADR-005](ADR-005-tif-spring-di-y-persistencia.md) · [ADR-007](ADR-007-tif-replica-y-reconciliacion.md)

### Ejecución y cobertura

- **Backend:** ejecutar `./scripts/pruebas-backend.ps1` desde la raíz con Docker. El [runner](../../scripts/pruebas-backend.ps1) prepara PostgreSQL descartable, ejecuta Maven `clean verify` y recoge Surefire. Si Maven termina correctamente, también recoge el reporte JaCoCo en `target/test-runs/<id>/jacoco`. Una ejecución filtrada o con integraciones omitidas debe identificarse con ese alcance.
- **Frontend y E2E:** ejecutar `npm --prefix frontend ci` y `npm --prefix frontend test`. Para E2E, `./scripts/prueba-m2-offline.ps1` construye la PWA y llama al escenario con Chrome. Requiere Docker, Chrome y la imagen local del runner backend. Ver [comandos y requisitos](../pruebas.md#ejecutar-y-reutilizar) y [guía M2](../m2-offline.md#ejecución-y-demostración-reproducible).
- **Cobertura existente:** [JaCoCo 0.8.14](../../pom.xml) prepara el agente Java y ejecuta `report` en `verify`. El POM carece de una ejecución `check` y de un umbral configurado. La [sección histórica de QR multisede](../pruebas.md#qr-automático-multisede--10112026) registra 87,60 % de líneas y 71,74 % de ramas para una ejecución previa a M3. Esos porcentajes son antecedentes. La cobertura JS no está instrumentada en la configuración actual. Los casos de Node y la E2E se registran por separado.

### Criterios pendientes de aprobación

La auditoría independiente del commit `8dff43678e78cec32338a75020dd0f0752275ae0` informó **147 pruebas backend aprobadas** y cobertura JaCoCo de **74,62 % de líneas**, **59,41 % de ramas** y **75,17 % de instrucciones**. Estos valores son una medición del corte auditado.

La repetición local del 19/11/2026, con la corrección de Compose y sin cambios en el código Java ni en las pruebas, aprobó las **147 pruebas** sin omisiones. Su reporte JaCoCo registró **74,65 % de líneas** (1602/2146), **59,41 % de ramas** (723/1217) y **75,19 % de instrucciones** (12217/16248).

1. **Pirámide y ejecución.** Acordar qué suites se requieren en cada revisión y cuáles en el candidato de entrega. Se propone ejecutar pruebas rápidas en cada cambio, integración real cuando cambien persistencia, permisos o contratos, y E2E en recorridos críticos o cambios de la PWA. Antes de la entrega, se propone una corrida completa sobre el mismo SHA, con las integraciones habilitadas.
2. **Criterio de cobertura propuesto para el cierre.** Usar la medición del corte auditado como línea base y revisar toda caída de líneas o ramas en corridas comparables de la suite backend completa, con PostgreSQL habilitado. Las ramas ayudan a identificar decisiones de negocio sin ejercitar. Para aceptar el candidato, exigir además las pruebas de escenarios críticos, como concurrencia, permisos y reconciliación offline. Registrar numeradores, denominadores, exclusiones justificadas y SHA. El criterio se propone a partir de esta revisión, requiere aprobación y todavía carece de un bloqueo automático en Maven.
3. **Integración continua y evidencia.** Acordar si un control automatizado impedirá fusionar, cuándo se ejecutará y cómo se conservarán sus reportes. Se propone registrar SHA, fecha, entorno, filtros, resultados y pruebas omitidas. No se localizó un workflow CI/CD versionado en este corte. [Manual Técnico](../manuales/manual-tecnico.md#9-pipeline-cicd) · [Manual de Instalación y Operación](../manuales/manual-instalacion-operacion.md#6-despliegue-y-reversión)

## Consecuencias

- **Positivas:** fallos localizables por nivel, verificación de garantías SQL con el motor real y posibilidad de reproducir los recorridos críticos sobre un corte identificado.
- **Negativas:** costo de sostener fixtures, contenedores y navegador. La cobertura de líneas y ramas indica ejecución de código y requiere leerse junto con las aserciones, los casos omitidos y las garantías probadas.
- **Deuda asumida:** repetir sobre el candidato final la suite completa y las pruebas críticas de integración. El corte auditado ya incluye pruebas de clases, de concurrencia RN-02 y de cobro, reintento y comprobante de cancha. Sigue pendiente la aprobación del criterio de cobertura.

## Requisitos relacionados

Unidad V (disparador oficial). RF-02, RF-04, RF-07, RF-08, RF-10, RF-13 y RF-14 por las reglas y recorridos involucrados. RN-01 y RNF-01 orientan la verificación de acceso y reconciliación offline. RN-02 orienta la futura prueba concurrente de canchas.

## Validación y límites

Se revisaron el POM, suites, runners y documentación de QA de `0cf3b53`. La revisión de este ADR fue estática. Los reportes históricos citados en [docs/pruebas.md](../pruebas.md) no están disponibles en este clon y no se atribuyen al corte actual. Queda pendiente la validación del equipo sobre pirámide, umbral, controles de integración y metadatos de autor y sprint.
