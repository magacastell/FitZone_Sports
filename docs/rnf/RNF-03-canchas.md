# RNF-03 — Consulta de disponibilidad

Fecha: 11/11/2026. Evidencia de `CanchasIntegrationTest.consultaDisponibilidadConDatosRepresentativosYRegistraLatencia`.

## Método reproducible

- PostgreSQL 18 aislado; Java 25 local compilando el proyecto con release 21.
- 25 sedes, 100 canchas y 8400 turnos; datos descartables propios del test.
- Consulta del servicio completo para una cancha y siete días: 84 turnos, precio y disponibilidad calculados.
- 5 consultas de calentamiento, 30 muestras con `System.nanoTime`.
- No mide el transporte HTTP ni la conexión a una pasarela remota.

La medición se escribe en `target/rnf03-canchas.txt`. Primera ejecución completa:
mediana **3,84 ms**, p95 **5,69 ms**, máximo **7,44 ms**. Una repetición focalizada,
con generación y validación adicional de semillas, dio mediana **7,54 ms**, p95
**9,64 ms**, máximo **11,88 ms**. La suite final registró mediana **4,41 ms**,
p95 **5,88 ms** y máximo **6,18 ms**. Son observaciones locales; no un SLA ni garantía
para cualquier carga o entorno.

## Diseño de consulta

`CanchaService.turnos` consulta una sola cancha y un rango acotado. Un SELECT obtiene
los turnos con `NOT EXISTS` para reservas ocupantes y bloqueos activos; evita una
consulta de disponibilidad por cada turno. La vigencia y la estrategia se resuelven
una vez por listado, no por elemento. V16 agrega índices por sede, usuario y
vencimiento, un índice parcial de ocupación y la exclusión GiST de intervalos.

## Límites

El enunciado pide milisegundos sin fijar un número ni percentil. Esta evidencia
permite contrastar ese objetivo en el entorno indicado. Falta medir el despliegue
final con transporte HTTP, carga concurrente sostenida y distribución real de
reservas/mantenimiento; no se declara un umbral grupal de aprobación no acordado.
