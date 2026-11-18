# FitZone Sports — DER físico de PostgreSQL

| Versión | Fecha | Autor | Código de referencia |
| --- | --- | --- | --- |
| 1.1 · Revisión de presentación del DER 1.0 | 18/11/2026 | Pendiente de confirmación | `main` · `24936689aeba02c68a32729f3ad80c30e01a8ff1` |

[Fuente editable de diagrams.net](der-fisico.drawio) · [Vista integral SVG](der-fisico.svg)

El esquema `public` al finalizar V16 contiene 32 tablas de aplicación, 206 columnas, 32 claves primarias y 47 claves foráneas. Se conservaron los atributos, los tipos y las restricciones de las fichas originales. El editable contiene una página integral de referencia y cinco páginas A4 horizontales. Cada lámina muestra las relaciones cuyas FKs salen de las tablas de ese módulo. Para el dossier, abrí la vista correspondiente en el navegador e imprimí en A4 horizontal, a escala 100 %, sin encabezados ni pies del navegador.

- [M1 · Usuarios y membresías](der-fisico.svg#area-m1)
- [M2 · Acceso y operación offline](der-fisico.svg#area-m2)
- [M3 · Clases grupales](der-fisico.svg#area-m3)
- [M4 · Canchas y reservas](der-fisico.svg#area-m4)
- [M5 · Pagos y comprobantes](der-fisico.svg#area-m5)
- [Leyenda general del DER](der-fisico.svg#area-relaciones)

## Cómo leer las relaciones

Cada línea sólida parte de la columna marcada `FK` de la tabla hija y llega a la columna `id` (PK) de la tabla padre. Los anclajes de llegada se distribuyen por el borde para separar los conectores. Junto al padre, Crow’s Foot indica cuántos padres admite una hija. Junto a la hija, indica cuántas hijas admite un padre. La leyenda de cada lámina traduce los símbolos a exactamente uno (`1`), cero o uno (`0..1`) y cero o varios (`0..*`). Un salto en una línea indica que el cruce no conecta las dos relaciones.

Los recuadros discontinuos indican el módulo, la tabla y la clave de destino de una FK entre módulos. Cada referencia vuelve a la misma tabla física de su lámina principal. `pago.referencia_id` y `penalizacion_clase.usuarioid` se documentan sin conectores físicos.

`PK` marca la clave primaria y `?` indica que la columna admite `NULL`. `varchar`, `timestamp`, `timestamptz` y `time` son nombres o abreviaturas de PostgreSQL para `character varying`, `timestamp without time zone`, `timestamp with time zone` y `time without time zone`, respectivamente.

El extremo padre admite cero si la FK es nullable. El extremo hijo admite como máximo una fila cuando la FK es única para toda la tabla. Los índices únicos parciales aplican su predicado y no cambian la cardinalidad general. Por ejemplo, la FK `reserva_cancha.turno_canchaid` admite varias reservas históricas por turno, con hasta una ocupante. La PK compuesta de `acceso_intento_incompatible` contiene `evento_id` y `huella`, de modo que un evento puede tener varios intentos.

## M4 · Canchas, reservas y mantenimiento

- `reserva_cancha` referencia a `turno_cancha` y al `usuario` titular. `cancelada_por` es una FK opcional al mismo destino. Cada turno pertenece a una `cancha`, que a su vez referencia a `sede` y `tipo_cancha`. El histórico admite varias reservas del mismo turno cuando no hay más de una ocupante. [V1](../../src/main/resources/db/migration/V1__crear_esquema_inicial.sql) · [V16](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql#L16)
- El índice **`uk_reserva_cancha_ocupante`** es único sobre `reserva_cancha(turno_canchaid)` para `estado IN ('PENDIENTE_PAGO','CONFIRMADA')`. `vence_en` no forma parte del predicado. El servicio debe persistir la transición a `EXPIRADA` para que una retención vencida deje de ocupar el turno a efectos del índice. `ck_reserva_retencion` exige `vence_en` para `PENDIENTE_PAGO`. [V16, ocupación y vencimiento](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql#L38) · [ReservaCanchaService](../../src/main/java/com/fitzonesports/reserva/service/ReservaCanchaService.java)
- **`ex_turnos_superpuestos`** excluye por GiST las filas de `turno_cancha` con igual `canchaid` e intervalos que se cruzan. Usa `tsrange(fecha + hora_inicio, fecha + hora_fin, '[)')` con `&&` y `btree_gist` para la igualdad de la cancha. El límite superior abierto admite turnos contiguos. `ck_turno_horas` exige que `hora_fin > hora_inicio`. [V16, exclusión de turnos](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql#L13)
- `bloqueo_mantenimiento.canchaid` identifica la cancha y `creado_por` puede referenciar a un usuario. `ck_mantenimiento_fechas` admite fin abierto (`NULL`) o posterior a `fecha_inicio`. `ix_mantenimiento_cancha` indexa cancha e intervalo para filas activas. Los triggers **`validar_reserva_cancha`** y **`validar_mantenimiento_cancha`** están definidos para `BEFORE INSERT OR UPDATE` por fila y llaman a **`validar_ocupacion_cancha()`**. La función bloquea la fila de `cancha` con `FOR UPDATE` y rechaza con `23514` el cruce temporal entre un mantenimiento activo y una reserva ocupante, al escribir cualquiera de los dos. Los límites de las comparaciones permiten intervalos contiguos. [V16, mantenimiento y triggers](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql#L45)
- En la capa de aplicación, `CanchaRepository` declara `PESSIMISTIC_WRITE` para coordinar escrituras por cancha. La unicidad de `clave_operacion` respalda la idempotencia de reservas. Los campos `cancha_nombre`, `sede_nombre`, `tipo_nombre`, `inicio`, `fin` y `detalle_precio` conservan datos de la operación. Las referencias físicas de la reserva siguen en sus FKs. [CanchaRepository](../../src/main/java/com/fitzonesports/reserva/repository/CanchaRepository.java#L10) · [ReservaCanchaService](../../src/main/java/com/fitzonesports/reserva/service/ReservaCanchaService.java) · [ADR-004](../adr/ADR-004-tif-concurrencia-canchas.md)
- `ck_reserva_cancha_estado` admite `PENDIENTE_PAGO`, `CONFIRMADA`, `CANCELADA`, `RECHAZADA`, `EXPIRADA` y `CUMPLIDA`. El índice de ocupación solo considera los dos primeros. [V16, estados](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql#L38)

## M5 · Pagos, comprobantes y membresías

- `pago.usuarioid` es FK a `usuario.id`. `pago.referencia_id` es una referencia de aplicación. Con `tipo_referencia = 'RESERVA_CANCHA'` se vincula a `reserva_cancha.id` y con `tipo_referencia = 'MEMBRESIA'`, a `membresia.id`. El esquema aplica unicidad por referencia para el primer tipo con el índice parcial `uk_pago_reserva_cancha`. `periodo_membresia.pago_id` es una FK nullable y única que sí apunta a `pago.id`. [V5](../../src/main/resources/db/migration/V5__membresias_y_periodos.sql) · [V16, unicidad del pago de cancha](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql#L79) · [PagoCanchaService](../../src/main/java/com/fitzonesports/pago/service/PagoCanchaService.java#L27) · [CobroMembresiaService](../../src/main/java/com/fitzonesports/pago/service/CobroMembresiaService.java#L47)
- Un pago tiene como máximo un `comprobante` y un `reembolso_pago`, según las restricciones de unicidad de sus FKs. Puede tener varias filas en `referencia_pasarela`. El comprobante puede tener varias líneas en `detalle_facturacion`. La columna `porcentaje` del reembolso admite valores mayores a cero y hasta 100. [V1](../../src/main/resources/db/migration/V1__crear_esquema_inicial.sql) · [V6](../../src/main/resources/db/migration/V6__comprobantes_y_reembolsos.sql) · [V16, porcentaje](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql#L81) · [ComprobanteService](../../src/main/java/com/fitzonesports/pago/service/ComprobanteService.java)
- `pago.estado` es `varchar(255) NOT NULL` sin `CHECK` de valores. Los servicios revisados persisten `APROBADO`, `RECHAZADO`, `REEMBOLSADO` y `REEMBOLSADO_PARCIAL`. OpenAPI también admite `PENDIENTE` en la respuesta de pago. Si la pasarela simulada devuelve ese estado en un pago de cancha, el servicio responde `409` antes del `INSERT`. [PagoCanchaService](../../src/main/java/com/fitzonesports/pago/service/PagoCanchaService.java#L31) · [OpenAPI, estado de pago](../openapi/openapi.yaml#L3130)

## Integridad e índices en M1, M2 y M3

- **M1.** Un usuario puede tener como máximo una membresía por `uk_membresia_usuario`. El histórico usa `periodo_membresia`. `ck_periodos_sin_solapamiento` valida los períodos y la dupla de triggers de V9 protege la sede de personal. La FK `usuario.sedeid` conserva su nulabilidad física en el DER. `usuario_foto.usuario_id` es a la vez PK y FK con borrado en cascada. [V5](../../src/main/resources/db/migration/V5__membresias_y_periodos.sql) · [V9](../../src/main/resources/db/migration/V9__contexto_funciones_sede.sql) · [V10](../../src/main/resources/db/migration/V10__foto_perfil_persistente.sql)
- **M2.** `uk_registro_acceso_abierto` limita a una visita abierta por usuario. `uk_registro_acceso_qr_jti` aplica a los registros con `qr_jti` informado. Una terminal está vinculada a una sede por una FK única. El evento offline puede apuntar a `registro_acceso.id`; las visitas pueden identificar la terminal offline mediante otra FK opcional. [V4](../../src/main/resources/db/migration/V4__qr_y_accesos_abiertos.sql) · [V11–V14](#migraciones-reproducidas)
- **M3.** `reserva_clase.estado_reserva` admite `CONFIRMADA`, `CANCELADA`, `CANCELADA_TARDIA` y `CANCELADA_POR_ADMIN`. `estado_asistencia` se guarda aparte. Las reservas confirmadas y las inscripciones activas tienen índices únicos parciales. La tabla histórica `penalizacion_clase` tiene una columna `usuarioid` sin FK declarada. [V1](../../src/main/resources/db/migration/V1__crear_esquema_inicial.sql) · [V15](../../src/main/resources/db/migration/V15__clases_grupales.sql)

### Definiciones de índices seleccionados

| Tabla | Índice | Clave y condición de PostgreSQL |
| --- | --- | --- |
| `acceso_credencial_offline` | `ix_credencial_offline_sede` | `btree (sede_id, hasta)` |
| `acceso_evento_offline` | `ix_evento_offline_pendiente` | `btree (terminal_id, estado)` |
| `acceso_evento_offline` | `ix_evento_offline_qr` | `btree (qr_jti)` |
| `bloqueo_mantenimiento` | `ix_mantenimiento_cancha` | `btree (canchaid, fecha_inicio, fecha_fin) WHERE activo` |
| `cancha` | `ix_cancha_sede` | `btree (sedeid)` |
| `cancha` | `uk_cancha_nombre_sede` | `UNIQUE btree (sedeid, lower(btrim((nombre)::text)))` |
| `clase_grupal` | `ix_clase_grupal_instructor_horario` | `btree (instructorid, horario)` |
| `clase_grupal` | `ix_clase_grupal_sede_horario` | `btree (sedeid, horario)` |
| `comprobante` | `uk_comprobante_numero` | `UNIQUE btree (numero_comprobante)` |
| `comprobante` | `uk_comprobante_pago` | `UNIQUE btree (pagoid)` |
| `inscripcion_espera` | `ix_inscripcion_espera_fila` | `btree (clase_grupalid, estado, posicion)` |
| `inscripcion_espera` | `uk_inscripcion_espera_activa` | `UNIQUE btree (clase_grupalid, usuarioid) WHERE ((estado)::text = ANY ((ARRAY['EN_ESPERA'::character varying, 'OFERTADA'::character varying])::text[]))` |
| `inscripcion_espera` | `uk_inscripcion_espera_posicion` | `UNIQUE btree (clase_grupalid, posicion)` |
| `membresia` | `uk_membresia_usuario` | `UNIQUE btree (usuarioid)` |
| `oferta_clase` | `ix_oferta_clase_vencimiento` | `btree (estado, vence_en)` |
| `oferta_clase` | `uk_oferta_clase_pendiente` | `UNIQUE btree (inscripcion_esperaid) WHERE ((estado)::text = 'PENDIENTE'::text)` |
| `pago` | `uk_pago_idempotencia` | `UNIQUE btree (clave_idempotencia) WHERE (clave_idempotencia IS NOT NULL)` |
| `pago` | `uk_pago_reserva_cancha` | `UNIQUE btree (referencia_id) WHERE ((tipo_referencia)::text = 'RESERVA_CANCHA'::text)` |
| `periodo_membresia` | `ix_periodo_membresia_fechas` | `btree (membresia_id, inicio, fin)` |
| `registro_acceso` | `uk_registro_acceso_abierto` | `UNIQUE btree (usuarioid) WHERE (fecha_hora_salida IS NULL)` |
| `registro_acceso` | `uk_registro_acceso_qr_jti` | `UNIQUE btree (qr_jti) WHERE (qr_jti IS NOT NULL)` |
| `reserva_cancha` | `ix_reserva_cancha_usuario` | `btree (usuarioid, creada_en DESC)` |
| `reserva_cancha` | `ix_reserva_cancha_vencimiento` | `btree (vence_en) WHERE ((estado)::text = 'PENDIENTE_PAGO'::text)` |
| `reserva_cancha` | `reserva_cancha_clave_operacion_key` | `UNIQUE btree (clave_operacion)` |
| `reserva_cancha` | `uk_reserva_cancha_ocupante` | `UNIQUE btree (turno_canchaid) WHERE ((estado)::text = ANY ((ARRAY['PENDIENTE_PAGO'::character varying, 'CONFIRMADA'::character varying])::text[]))` |
| `reserva_clase` | `uk_reserva_clase_confirmada` | `UNIQUE btree (clase_grupalid, usuarioid) WHERE ((estado_reserva)::text = 'CONFIRMADA'::text)` |
| `tipo_cancha` | `uk_tipo_cancha_nombre` | `UNIQUE btree (lower(btrim((nombre)::text)))` |
| `turno_cancha` | `ex_turnos_superpuestos` | `gist (canchaid, tsrange((fecha + hora_inicio), (fecha + hora_fin), '[)'::text))` |
| `turno_cancha` | `uk_turno_cancha_horario` | `UNIQUE btree (canchaid, fecha, hora_inicio)` |

## Inventario de claves foráneas

| Tabla hija y columna | Restricción | Tabla padre y columna | Padres por hija | Hijas por padre |
| --- | --- | --- | --- | --- |
| `acceso_copia_offline.terminal_id` | `acceso_copia_offline_terminal_id_fkey` | `acceso_terminal.id` | 1 | 0..* |
| `acceso_credencial_offline.sede_id` | `acceso_credencial_offline_sede_id_fkey` | `sede.id` | 1 | 0..* |
| `acceso_credencial_offline.usuario_id` | `acceso_credencial_offline_usuario_id_fkey` | `usuario.id` | 1 | 0..* |
| `acceso_evento_offline.acceso_id` | `acceso_evento_offline_acceso_id_fkey` | `registro_acceso.id` | 0..1 | 0..* |
| `acceso_evento_offline.terminal_id` | `acceso_evento_offline_terminal_id_fkey` | `acceso_terminal.id` | 1 | 0..* |
| `acceso_intento_incompatible.evento_id` | `acceso_intento_incompatible_evento_id_fkey` | `acceso_evento_offline.id` | 1 | 0..* |
| `acceso_terminal.operador_id` | `acceso_terminal_operador_id_fkey` | `usuario.id` | 1 | 0..* |
| `acceso_terminal.sede_id` | `acceso_terminal_sede_id_fkey` | `sede.id` | 1 | 0..1 |
| `auditoria_membresia.membresia_id` | `auditoria_membresia_membresia_id_fkey` | `membresia.id` | 1 | 0..* |
| `auditoria_membresia.operador_id` | `auditoria_membresia_operador_id_fkey` | `usuario.id` | 1 | 0..* |
| `bloqueo_mantenimiento.canchaid` | `fkbloqueo_ma58773` | `cancha.id` | 1 | 0..* |
| `bloqueo_mantenimiento.creado_por` | `bloqueo_mantenimiento_creado_por_fkey` | `usuario.id` | 0..1 | 0..* |
| `cancha.sedeid` | `fkcancha514768` | `sede.id` | 1 | 0..* |
| `cancha.tipo_canchaid` | `fkcancha57615` | `tipo_cancha.id` | 1 | 0..* |
| `clase_grupal.instructorid` | `fkclase_grup575819` | `instructor.id` | 1 | 0..* |
| `clase_grupal.sedeid` | `fkclase_grup901111` | `sede.id` | 1 | 0..* |
| `clase_grupal.tipo_claseid` | `fkclase_grup750856` | `tipo_clase.id` | 1 | 0..* |
| `codigo_qr.usuarioid` | `fkcodigo_qr98568` | `usuario.id` | 1 | 0..1 |
| `comprobante.pagoid` | `fkcomprobant739681` | `pago.id` | 1 | 0..1 |
| `detalle_facturacion.comprobanteid` | `fkdetalle_fa331535` | `comprobante.id` | 1 | 0..* |
| `inscripcion_espera.clase_grupalid` | `fkinscripcio962232` | `clase_grupal.id` | 1 | 0..* |
| `inscripcion_espera.usuarioid` | `fkinscripcio475075` | `usuario.id` | 1 | 0..* |
| `membresia.plan_membresiaid` | `fkmembresia60619` | `plan_membresia.id` | 1 | 0..* |
| `membresia.sedeid` | `fkmembresia128458` | `sede.id` | 1 | 0..* |
| `membresia.usuarioid` | `fkmembresia738723` | `usuario.id` | 1 | 0..1 |
| `oferta_clase.clase_grupalid` | `fk_oferta_clase_clase` | `clase_grupal.id` | 1 | 0..* |
| `oferta_clase.inscripcion_esperaid` | `fk_oferta_clase_inscripcion` | `inscripcion_espera.id` | 1 | 0..* |
| `oferta_clase.reserva_claseid` | `fk_oferta_clase_reserva` | `reserva_clase.id` | 0..1 | 0..* |
| `oferta_clase.usuarioid` | `fk_oferta_clase_usuario` | `usuario.id` | 1 | 0..* |
| `pago.usuarioid` | `fkpago806410` | `usuario.id` | 1 | 0..* |
| `periodo_membresia.membresia_id` | `periodo_membresia_membresia_id_fkey` | `membresia.id` | 1 | 0..* |
| `periodo_membresia.pago_id` | `periodo_membresia_pago_id_fkey` | `pago.id` | 0..1 | 0..1 |
| `periodo_membresia.plan_id` | `periodo_membresia_plan_id_fkey` | `plan_membresia.id` | 1 | 0..* |
| `reembolso_pago.pago_id` | `reembolso_pago_pago_id_fkey` | `pago.id` | 1 | 0..1 |
| `referencia_pasarela.pagoid` | `fkreferencia44391` | `pago.id` | 1 | 0..* |
| `registro_acceso.offline_terminal` | `registro_acceso_offline_terminal_fkey` | `acceso_terminal.id` | 0..1 | 0..* |
| `registro_acceso.sedeid` | `fkregistro_a940368` | `sede.id` | 1 | 0..* |
| `registro_acceso.usuarioid` | `fkregistro_a164040` | `usuario.id` | 1 | 0..* |
| `reserva_cancha.cancelada_por` | `reserva_cancha_cancelada_por_fkey` | `usuario.id` | 0..1 | 0..* |
| `reserva_cancha.turno_canchaid` | `fkreserva_ca451621` | `turno_cancha.id` | 1 | 0..* |
| `reserva_cancha.usuarioid` | `fkreserva_ca826686` | `usuario.id` | 1 | 0..* |
| `reserva_clase.clase_grupalid` | `fkreserva_cl951980` | `clase_grupal.id` | 1 | 0..* |
| `reserva_clase.usuarioid` | `fkreserva_cl485327` | `usuario.id` | 1 | 0..* |
| `turno_cancha.canchaid` | `fkturno_canc933562` | `cancha.id` | 1 | 0..* |
| `usuario.rolid` | `fkusuario32982` | `rol.id` | 1 | 0..* |
| `usuario.sedeid` | `fkusuario576001` | `sede.id` | 0..1 | 0..* |
| `usuario_foto.usuario_id` | `usuario_foto_usuario_id_fkey` | `usuario.id` | 1 | 0..1 |

## Migraciones reproducidas

Se aplicó el SQL de las 16 migraciones en orden sobre una base temporal en memoria y se consultó el catálogo. Las migraciones iniciales son parte del esquema de los módulos posteriores.

- [V1 · Crear esquema inicial](../../src/main/resources/db/migration/V1__crear_esquema_inicial.sql)
- [V2 · Insertar roles](../../src/main/resources/db/migration/V2__insertar_roles.sql)
- [V3 · Planes membresia](../../src/main/resources/db/migration/V3__planes_membresia.sql)
- [V4 · Qr y accesos abiertos](../../src/main/resources/db/migration/V4__qr_y_accesos_abiertos.sql)
- [V5 · Membresias y periodos](../../src/main/resources/db/migration/V5__membresias_y_periodos.sql)
- [V6 · Comprobantes y reembolsos](../../src/main/resources/db/migration/V6__comprobantes_y_reembolsos.sql)
- [V7 · Autoridad usuario estable](../../src/main/resources/db/migration/V7__autoridad_usuario_estable.sql)
- [V8 · Sede habitual en contratacion](../../src/main/resources/db/migration/V8__sede_habitual_en_contratacion.sql)
- [V9 · Contexto funciones sede](../../src/main/resources/db/migration/V9__contexto_funciones_sede.sql)
- [V10 · Foto perfil persistente](../../src/main/resources/db/migration/V10__foto_perfil_persistente.sql)
- [V11 · Credenciales m2 offline](../../src/main/resources/db/migration/V11__credenciales_m2_offline.sql)
- [V12 · Terminal y copia m2](../../src/main/resources/db/migration/V12__terminal_y_copia_m2.sql)
- [V13 · Reconciliacion m2 offline](../../src/main/resources/db/migration/V13__reconciliacion_m2_offline.sql)
- [V14 · Uso qr multisede](../../src/main/resources/db/migration/V14__uso_qr_multisede.sql)
- [V15 · Clases grupales](../../src/main/resources/db/migration/V15__clases_grupales.sql)
- [V16 · Canchas reservas y pagos](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql)

## Correspondencia con la implementación

- **Decisiones de persistencia.** [ADR-002 · PostgreSQL, persistencia e integridad](../adr/ADR-002-tif-postgresql-e-integridad.md) y [ADR-004 · Concurrencia](../adr/ADR-004-tif-concurrencia-canchas.md).
- **Entidades JPA.** [Usuario](../../src/main/java/com/fitzonesports/usuario/model/Usuario.java), [Sede](../../src/main/java/com/fitzonesports/sede/model/Sede.java), [Membresia](../../src/main/java/com/fitzonesports/membresia/model/Membresia.java), [PeriodoMembresia](../../src/main/java/com/fitzonesports/membresia/model/PeriodoMembresia.java), [CodigoQr](../../src/main/java/com/fitzonesports/acceso/model/CodigoQr.java), [RegistroAcceso](../../src/main/java/com/fitzonesports/acceso/model/RegistroAcceso.java), [ClaseGrupal](../../src/main/java/com/fitzonesports/clase/model/ClaseGrupal.java), [ReservaClase](../../src/main/java/com/fitzonesports/clase/model/ReservaClase.java) y [Cancha](../../src/main/java/com/fitzonesports/reserva/model/Cancha.java).
- **Repositorios y SQL de aplicación.** [MembresiaRepository](../../src/main/java/com/fitzonesports/membresia/repository/MembresiaRepository.java), [RegistroAccesoRepository](../../src/main/java/com/fitzonesports/acceso/repository/RegistroAccesoRepository.java), [ClaseGrupalRepository](../../src/main/java/com/fitzonesports/clase/repository/ClaseGrupalRepository.java), [CanchaRepository](../../src/main/java/com/fitzonesports/reserva/repository/CanchaRepository.java), [ReservaCanchaService](../../src/main/java/com/fitzonesports/reserva/service/ReservaCanchaService.java) y [PagoCanchaService](../../src/main/java/com/fitzonesports/pago/service/PagoCanchaService.java). Las operaciones JDBC se reflejan en las fichas a partir del esquema instalado.
- **Contrato y documentación.** [OpenAPI, Canchas](../openapi/openapi.yaml#L2161), [OpenAPI, Pagos](../openapi/openapi.yaml#L2576), [Canchas y pagos backend](../canchas-pagos-backend.md) y [Guía de integración](../integracion-canchas-pagos.md).
- **Pruebas revisadas.** [PlanPersistenceTest](../../src/test/java/com/fitzonesports/membresia/PlanPersistenceTest.java), [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java), [CanchasIntegrationTest, escenarios concurrentes](../../src/test/java/com/fitzonesports/reserva/CanchasIntegrationTest.java#L188) y [PagosIntegrationTest, reembolsos concurrentes](../../src/test/java/com/fitzonesports/pago/PagosIntegrationTest.java#L212).

## Validación SQL

Los scripts originales V1 a V16 se ejecutaron en orden en PostgreSQL 18.6 mediante PGlite 0.5.16 con `btree_gist`. Se contrastaron columnas, tipos, nulabilidad, claves, índices y triggers del catálogo. Con datos sintéticos, el índice parcial rechazó la segunda reserva ocupante del mismo turno (`23505`), GiST rechazó turnos solapados (`23P01`) y los triggers rechazaron los cruces con mantenimiento en ambos órdenes de inserción (`23514`). El esquema aceptó turnos contiguos y el historial cancelado. La comprobación fue directa sobre SQL. Las pruebas de integración de Spring fueron consultadas como evidencia de implementación y permanecen sin ejecución en esta tarea.

## Validación de la revisión 1.1

Se volvieron a aplicar V1–V16 en una base PostgreSQL temporal. El catálogo confirmó los extremos y las columnas de las 47 FK. Siete permiten una referencia nula y siete limitan a una hija por padre mediante unicidad global. Se contrastó la notación de ambos formatos con ese catálogo y se revisaron las cinco vistas impresas como páginas A4 horizontales.
