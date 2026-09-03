# ADR-002 — Utilizar PostgreSQL como base de datos relacional

## Estado

Aceptado

## Fecha

[AAAA-MM-DD]

## Contexto

FitZone Sports debe gestionar reservas de canchas y pagos manteniendo la integridad y consistencia de los datos. En particular, el sistema debe evitar la sobreventa de turnos: si dos usuarios intentan reservar la misma cancha para el mismo horario de manera concurrente, solo una operación debe tener éxito. Este comportamiento forma parte explícita de las reglas de negocio del sistema.

Además, las operaciones relacionadas con pagos requieren mantener estados consistentes y preservar la integridad de la información. La definición técnica del proyecto vincula el uso de una base de datos relacional con la integridad de pagos y la consistencia del inventario de canchas.

La cátedra establece el uso de PostgreSQL como base de datos relacional para el proyecto. Por lo tanto, el equipo no debe seleccionar un motor entre distintas alternativas, sino adoptar PostgreSQL y definir correctamente cómo utilizar sus capacidades dentro de la arquitectura de FitZone Sports.

## Decisión

Vamos a utilizar PostgreSQL como base de datos relacional de FitZone Sports.

El esquema de datos utilizará las capacidades relacionales y transaccionales del motor para representar las entidades y relaciones del dominio, preservar la integridad referencial y dar soporte a las operaciones de reservas y pagos.

La concurrencia de reservas deberá resolverse mediante un diseño adecuado de transacciones, restricciones y mecanismos de control de concurrencia, de modo que dos operaciones simultáneas sobre la misma cancha y horario no puedan generar una doble reserva.

## Consecuencias positivas

- PostgreSQL proporciona soporte para un esquema de datos estructurado y relacional, adecuado para representar las entidades y relaciones del dominio.
- Permite definir restricciones de integridad, como claves primarias, claves foráneas y restricciones de unicidad.
- Proporciona soporte transaccional para operaciones que deben confirmarse o revertirse de manera consistente.
- Sus mecanismos transaccionales y de concurrencia pueden utilizarse para implementar la regla que establece que, ante dos reservas simultáneas sobre la misma cancha y horario, solo una debe tener éxito.
- Permite gestionar de forma controlada la evolución del esquema mediante migraciones.
- Permite utilizar índices para optimizar consultas críticas, como la disponibilidad de canchas, cuyo tiempo de respuesta es un requisito no funcional del sistema.
- La decisión se encuentra alineada con la definición técnica establecida por la cátedra, que identifica como consecuencias esperadas un esquema estructurado, soporte transaccional robusto y migraciones controladas.

## Consecuencias negativas

- Será necesario diseñar correctamente el esquema, las relaciones, las claves y las restricciones de integridad.
- PostgreSQL no evita automáticamente las reservas duplicadas. La consistencia ante operaciones concurrentes dependerá del diseño de las transacciones, restricciones y mecanismos de bloqueo o control de concurrencia implementados.
- Será necesario definir y mantener una estrategia de migraciones a medida que evolucione el modelo de datos.
- El rendimiento no queda garantizado únicamente por elegir PostgreSQL; será necesario diseñar consultas e índices adecuados para cumplir los requisitos de respuesta.
- La disponibilidad del sistema y el funcionamiento offline del control de acceso requieren soluciones adicionales y no quedan resueltos por la elección del motor de base de datos.
- La escalabilidad y la incorporación de nuevas sedes también deberán resolverse mediante decisiones de arquitectura y configuración adicionales.
- El equipo deberá gestionar tareas operativas asociadas al motor, como configuración, respaldo, recuperación, monitoreo y mantenimiento.

## Alternativas consideradas

No aplica.

PostgreSQL fue establecido por la cátedra como la base de datos relacional a utilizar en el proyecto, por lo que el equipo no realizó una evaluación comparativa de otros motores de base de datos.

Por este motivo, no se documentan alternativas como si hubieran sido analizadas y descartadas por el equipo.
