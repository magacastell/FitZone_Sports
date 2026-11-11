# ADR-002 — PostgreSQL, persistencia e integridad de datos

- **Estado:** Aceptado
- **Fecha:** 2026-11-10 (redacción documental).
- **Fecha histórica de decisión:** 2026-09-03 para PostgreSQL, consignada en el antecedente de Unidad I; no acreditada para la adopción de Flyway.
- **Autor:** Pendiente de identificación y revisión grupal.
- **Sprint:** Pendiente de contraste con la planificación histórica.

## Contexto

El sistema necesitaba conservar identidades, membresías, períodos pagados, visitas y comprobantes relacionados. La integridad de pagos y la consistencia de reservas motivaban el modelo relacional; RNF-03 exigía consultas de disponibilidad rápidas, sin fijar una medición obtenida por el equipo. El enunciado, p. 14, establecía PostgreSQL. El [ADR-002 histórico de Unidad I](https://docs.google.com/document/d/1sgUz-_ovSKQPJSD3dFt6M5ycwiDxV6LK/edit) indicaba aceptación el 2026-09-03 y explicitaba que no hubo selección comparativa de motores.

Era necesario, además, reproducir la evolución del esquema entre entornos. El [antecedente de Flyway](https://docs.google.com/document/d/1q0KQEPx2GLgVTCo24nMkRuCKm-tUyrN_KnfwJTvSewA/edit) documentaba alternativas reales de gestión del esquema. No se inventa una evaluación PostgreSQL/MySQL/MongoDB para satisfacer la plantilla.

## Alternativas consideradas

### Motor de base de datos

PostgreSQL fue definido por el enunciado y justificado por integridad transaccional. Las fuentes no acreditan una selección comparativa entre motores; no se atribuye al equipo un descarte de MySQL, MongoDB u otro producto.

| Alternativa | A favor | En contra | Por qué se descartó |
|---|---|---|---|
| PostgreSQL relacional | Restricciones, relaciones y transacciones adecuadas al dominio; coincide con el enunciado. | Exige diseñar consultas, índices, migraciones y operación del motor. | Adoptada por definición técnica; no fue el resultado de un benchmark de motores. |
| Otros motores | No consta evaluación comparativa. | No consta análisis del equipo. | No se afirma descarte técnico: quedan fuera de la elección fijada por la cátedra. |

### Gestión de la evolución del esquema

Esta comparación corresponde a herramientas y procedimientos de migración sobre PostgreSQL. Es una decisión complementaria a la elección del motor; sus alternativas históricas proceden del antecedente de Flyway.

| Alternativa | A favor | En contra | Por qué se descartó |
|---|---|---|---|
| SQL aplicado manualmente | Control directo sobre cada cambio. | No registra automáticamente orden y estado de aplicación en cada entorno. | Antecedente Flyway: riesgo de omisiones y divergencias. |
| Hibernate `ddl-auto=update` | Facilita evolución inicial desde entidades. | No ofrece el historial SQL revisable requerido para coordinar el esquema. | Antecedente Flyway: se prefirió control explícito. |
| Liquibase | También permite versionar el esquema y usar distintos formatos. | Más posibilidades/configuración que las necesarias según el antecedente. | La fuente eligió la integración sencilla de Flyway con SQL. |
| Flyway SQL + Hibernate `validate` | Migraciones versionadas y comprobación del mapeo sin DDL automático de Hibernate. | Requiere coordinar versiones y resolver fallos de migración. | Adoptada en el código. |

## Decisión

Se persiste el estado central en PostgreSQL mediante un esquema relacional evolucionado con Flyway, entidades JPA/Hibernate y SQL explícito para las operaciones que lo requieren, dejando las garantías de integridad críticas también en la base.

### Evidencia y justificación

- [Configuración](../../src/main/resources/application.properties): Flyway habilitado, `baseline-on-migrate=false`, `clean-disabled=true`, validación de migraciones y `spring.jpa.hibernate.ddl-auto=validate`. `data.sql` se activa en dev y se desactiva en staging/prod; no es una migración estructural.
- [V1](../../src/main/resources/db/migration/V1__crear_esquema_inicial.sql): PK, FK, unicidad de DNI/email y de turno por cancha/fecha/inicio. Las tablas están en un esquema compartido, no en cinco esquemas SQL por módulo.
- [V4](../../src/main/resources/db/migration/V4__qr_y_accesos_abiertos.sql): índice parcial único por usuario cuando la salida es null, garantía central de una presencia abierta (RN-01).
- [V5](../../src/main/resources/db/migration/V5__membresias_y_periodos.sql) y [V6](../../src/main/resources/db/migration/V6__comprobantes_y_reembolsos.sql): períodos, operaciones de membresía y evolución de comprobantes/reembolsos. El precio histórico del período se conserva; no se recalcula desde un plan modificado.
- [V10](../../src/main/resources/db/migration/V10__foto_perfil_persistente.sql) y [FotoPerfil](../../src/main/java/com/fitzonesports/usuario/model/FotoPerfil.java): fotografía persistida en PostgreSQL, no un servicio remoto de archivos.
- [V11](../../src/main/resources/db/migration/V11__credenciales_m2_offline.sql), [V12](../../src/main/resources/db/migration/V12__terminal_y_copia_m2.sql), [V13](../../src/main/resources/db/migration/V13__reconciliacion_m2_offline.sql) y [V14](../../src/main/resources/db/migration/V14__uso_qr_multisede.sql): credenciales anteriores, terminal/copia firmada, inbox/intentos incompatibles y unicidad parcial de `qr_jti` compartida por admisión online y reconciliación.
- [Membresia](../../src/main/java/com/fitzonesports/membresia/model/Membresia.java) y [RegistroAcceso](../../src/main/java/com/fitzonesports/acceso/model/RegistroAcceso.java) mapean tablas centrales; varios vínculos se expresan como IDs escalares y las FK son responsabilidad del SQL. No se presume que todas las tablas tengan entidad JPA.

El negocio necesita conservar una sola versión central de cobros y visitas, y reproducir el esquema al integrar ramas. IndexedDB es un almacenamiento local adicional y acotado, descrito en [ADR-007](ADR-007-tif-replica-y-reconciliacion.md); no replica PostgreSQL a nivel físico.

## Consecuencias

- **Positivas:** integridad referencial y unicidad comprobables en SQL; cambios estructurales versionados; confirmación atómica del inbox y visitas al reconciliar.
- **Negativas:** dependencia del motor central y de SQL específico; bloqueos pueden producir espera; una migración inválida impide iniciar. Los respaldos y la recuperación requieren operación adicional.
- **Deuda asumida:** el índice de turnos de V1 evita duplicar el catálogo de turnos, pero no impide por sí solo dos filas de `reserva_cancha` para un mismo turno. ADR-004/RN-02 siguen pendientes. No se acredita rendimiento RNF-03 ni recuperación de desastre. El almacenamiento temporal `timestamp` se interpreta con el `Clock` de la aplicación; no se presume soporte de zonas independientes por sede.

## Requisitos relacionados

RNF-03 (disparador oficial), RN-01, RN-02, RF-01, RF-02, RF-04, RF-05, RF-13 y RF-14. RNF-01 necesita mecanismos adicionales al motor relacional.

## Validación y límites

Se consultaron las 14 migraciones, entidades y repositorios del corte `d4ceaa3`, las pruebas de persistencia/integración y los reportes existentes citados en el [índice](../arquitectura-tif.md#evidencia-de-validación-consultada). No se ejecutaron nuevas pruebas de negocio ni se fijó un umbral de rendimiento. El estado Aceptado registra el uso técnico adoptado de PostgreSQL y Flyway; siguen pendientes los metadatos de autor/sprint y la evidencia de RN-02/RNF-03. Ver [ADR-005](ADR-005-tif-spring-di-y-persistencia.md).
