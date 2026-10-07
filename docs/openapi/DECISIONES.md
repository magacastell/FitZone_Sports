# Contratos API v1 — evidencia, decisiones técnicas y propuestas

El contrato sigue en `docs/openapi/openapi.yaml`. **Sus partes `stable` son la fuente técnica de referencia. Sus partes `draft` son interfaces de trabajo para revisión y mocks, sin convertir alternativas funcionales en obligaciones para otros módulos.** Los campos y ejemplos de un schema draft tampoco son evidencia de aprobación funcional.

Se separan dos ejes por operación:

| Eje | Valores | Significado |
|---|---|---|
| `x-implementation-status` | `implemented` / `stub` | Existe lógica funcional / existe la ruta, pero no el caso de uso. |
| `x-contract-status` | `stable` / `draft` | Interfaz suficientemente respaldada / hay reglas o representación funcional que el equipo debe validar. |

El estado no se deriva del otro: descargar comprobante es `stub + stable` para su representación PDF; registrar ingreso es `stub + draft`; consultar perfil es `implemented + stable`. `stable` no garantiza que el runtime ya cumpla todas las decisiones técnicas objetivo; las diferencias se explicitan en metadata.

La revisión conserva las **55 operaciones actuales**: **11 stable, 44 draft; 10 implemented, 45 stub**. No quedan rutas nuevas en `paths`. El 501 actual de los stubs aparece únicamente en `x-implementation-note`, nunca en `responses` del contrato objetivo.

Los D1–D20 del intercambio anterior fueron antecedentes de diseño. Esta revisión **no los presenta como acta ni aprobación inequívoca del equipo**. Sus aspectos técnicos se conservan y sus alternativas funcionales se trazan en P01–P12. No se encontraron en el checkout los textos completos de requisitos/ADR citados por las bitácoras; no se atribuye aprobación a documentos no leídos. Los prototipos frontend sólo aportan contexto.

## 1. Confirmado por el proyecto

Se considera confirmado lo verificable en estas fuentes locales, con su alcance limitado:

| Evidencia | Qué confirma | Límite de la evidencia |
|---|---|---|
| Controladores de Auth, usuario, sede, membresía, acceso, clase, reserva, pago y reporte en `src/main/java/com/fitzonesports/` | Existen las 55 operaciones incluidas y sus anotaciones de autorización. 45 retornan 501 sin caso de uso. | Una anotación de rol no implementa propiedad, sede, vigencia, precios ni cupos. |
| `auth/controller/AuthController.java`, `auth/dto/`, `usuario/dto/RegisterRequest.java`, `auth/security/SecurityConfig.java` | Login/registro públicos con JWT; campos de sus DTO; registro devuelve token con 201. Las demás rutas requieren autenticación en la configuración actual. | No confirma apertura pública de sedes ni una separación nueva de actores/roles. |
| `usuario/service/UsuarioService.java`, `usuario/dto/` | Registro asigna CLIENTE_EXTERNO; email duplicado produce 409; sede inexistente 404. Perfil propio deriva del JWT. Recepción lista/consulta usuarios de su sede, incluidos miembros del personal; sólo puede modificar SOCIO_ACTIVO/CLIENTE_EXTERNO. Gerente opera todas las sedes/roles. Nadie desactiva su propia cuenta. PATCH omitido/null no modifica. | Reglas de sede verificadas en usuarios no se generalizan automáticamente a los stubs de otros módulos. DNI único no tiene traducción explícita de excepción a 409. |
| `sede/service/SedeService.java`, `sede/dto/` | DTO de sede, nombre único sin distinguir mayúsculas, capacidad positiva y creación/modificación sólo Gerente. Lectura hoy autenticada. | No confirma una regla de rechazo de acceso por capacidad ni que capacidad sea pública. |
| V1/V2 en `src/main/resources/db/migration/` | Hay registros de usuario/sede, roles actuales, tablas iniciales de membresía/plan, acceso, clase, espera, penalización, cancha/turno, reservas, pago y comprobante; unicidad de DNI/email y de comienzo de turno por cancha. `duracion_meses` está en el esquema inicial. | Las tablas no prueban un workflow completo, reglas temporales, períodos históricos separados, fórmula de tarifa, compensación ni estado funcional definitivo. No equivalen a servicios implementados. |
| README y `LOGs/Orge-LOG.MD`, 04/10/2026 | Alcance modular, endpoints iniciales y validaciones de propiedad/sede/membresía pendientes; definición de acceso de Recepción a pagos/reembolsos pendiente. | Son documentación de baseline, no cierre de nuevas reglas funcionales. |
| `LOGs/Denis-LOG.md`, 18 y 23/09/2026 | Se investigó RN-02, diseño de errores/contratos, distintas opciones de concurrencia y contingencia offline con sincronización posterior. | No cierra estrategia de bloqueo, endpoint batch, límites, caché, tolerancia de reloj ni contratos concretos. |

Operaciones stable: `iniciarSesion`, `registrarCliente`, `consultarPerfil`, `actualizarPerfil`, `listarUsuarios`, `consultarUsuario`, `actualizarUsuario`, `listarSedes`, `crearSede`, `actualizarSede` y `descargarComprobantePago`. Las diez primeras conservan DTO y reglas funcionales del código; la última estabiliza ruta/representación PDF como decisión técnica, dejando emisión/elegibilidad pendientes.

Las restantes 44 operaciones mantienen sus schemas útiles como draft. Su ruta y roles actuales están confirmados; sus propuestas de workflow, entradas/respuestas y alcance funcional se identifican por tema pendiente en el YAML.

## 2. Decisiones técnicas del contrato

Estas decisiones estructuran la interfaz y **no adjudican al equipo reglas comerciales**:

- OpenAPI 3.0.3, único punto de entrada `openapi.yaml`, servidor local `http://localhost:3000/api/v1`, paths relativos al prefijo, textos en español y operationId camelCase únicos.
- JWT/Bearer global, login/registro públicos. La seguridad de `GET /sedes` queda como en el código actual; apertura pública sólo como `x-propuesta-security: []` y P12. `x-roles-actuales` no se usa para inferir nuevos permisos. `x-propuesta-permisos` contiene alternativas futuras, sin ampliar autorización por sí mismo.
- Reutilización de schemas, responses, parameters, headers y securitySchemes. Los diez DTO implementados conservan campos/tipos/restricciones. Se mantiene `application/json` en PATCH con omitido/null = no modificar; no es JSON Merge Patch.
- Errores objetivo Problem Details con `code` y errores de campo: 400 formato/validación, 401 autenticación, 403 autorización, 404 inexistente, 409 conflicto, 412 sólo precondición de versión vieja. Backend actual aún no garantiza esa representación uniforme.
- 201 al crear, 200 con representación, 204 sin cuerpo. 501 no es respuesta del caso de uso objetivo; sólo información del estado actual del stub.
- Paginación selectiva base 0, size por defecto 20 y máximo 100. `/usuarios` usa envoltorio objetivo con items del DTO exacto; hoy devuelve array. Orden/detalles funcionales de colecciones futuras se conservan como propuesta.
- ETag/If-Match selectivo en usuario individual como decisión técnica objetivo, aún no implementada. No se inventan lecturas individuales para añadir ETag. La obligatoriedad en administración de membresía es propuesta draft ligada a P03, no imposición de un workflow de suspensión.
- `Idempotency-Key` en las interfaces monetarias objetivo, con repetición de intención sin duplicar y conflicto ante intención incompatible. Ámbito, retención, conciliación y deduplicación entre procesos se validarán con P08–P10; no se fija su duración.
- Comprobante como bytes `application/pdf` y descarga directa, sin JSON ni URL como respuesta. No se fija cuándo puede emitirse ni qué estados de pago lo habilitan.
- Los tipos de identificadores, formato de instantes y campos de trabajo permiten crear mocks. Un schema draft indica explícitamente qué lista de campos/estados era propuesta: `x-propuesta-required`, `x-propuesta-valores`, `x-propuesta-validacion` y `x-propuesta-descripcion`. No se mantienen como `required`/`enum` ni como límites/rangos/patrones de validación las alternativas funcionales no confirmadas. Esas validaciones se conservan como metadata de propuesta; se mantienen los tipos y formatos útiles para mocks. Las variantes provisionales no fuerzan un discriminador sin acuerdo.
- Las operaciones draft preservan el diseño anterior en `x-propuesta-funcional`. El cuerpo/los filtros temporales propuestos no se vuelven obligatorios por completar el schema. Las listas `x-contract-pending` trazan P01–P12. Tipos o ejemplos draft no son una política aprobada.

Para trabajar en paralelo: implementar/consumir lo stable teniendo en cuenta divergencias del runtime; usar lo draft como interfaz de discusión y mocks, validando los temas indicados antes de depender de reglas, valores internos o campos comerciales. Una validación YAML exitosa no equivale a aprobación del equipo. Tras un acuerdo documentado, actualizar la propuesta y sólo entonces pasar esa operación/schema a stable.

Validación técnica: Redocly sin agregar dependencias, sintaxis YAML y claves duplicadas, referencias, path parameters, operationId, seguridad efectiva, cobertura de controllers, DTO, estados y ausencia de 501 funcional. README conserva exclusivamente los dos enlaces de esta tarjeta; no se modifican código, migraciones, frontend, dependencias ni configuración.

## 3. Propuestas pendientes de validación

### P01 — CLIENTE, SOCIO_ACTIVO y membresía (antecedente D3)

- **Tema:** identidad estable y habilitación de servicios.
- **Qué está confirmado:** existen roles SOCIO_ACTIVO/CLIENTE_EXTERNO/RECEPCIONISTA/GERENTE; registro asigna CLIENTE_EXTERNO. Membresía tiene tabla separada. Las bitácoras distinguen condición de membresía de rol.
- **Qué falta decidir:** representación futura del actor cliente, migración de permisos, estado de membresía consultable y operaciones permitidas al vencer/suspender; elegibilidad de QR/clases/otros servicios.
- **Propuesta actual:** cliente estable con vigencia/suspensión aparte; permitir cancelar recursos propios aunque venza membresía, sujeto a validación.
- **Motivo de la propuesta:** evitar confundir identidad con vigencia temporal.
- **Módulos afectados:** Auth, M1–M5 y frontend.
- **Impacto si cambia:** permisos, schemas de estado, guardas del frontend y criterios de acceso/reserva.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P02 — Alcance del personal y uso entre sedes (D4/D11/D19)

- **Tema:** aislamiento por sede fuera de los usuarios ya implementados.
- **Qué está confirmado:** usuarios y recursos del esquema están asociados a sedes; UsuarioService restringe Recepción y permite Gerente global. Los stubs tienen roles autorizados, sin validación de sede.
- **Qué falta decidir:** alcance exacto de cada operación de personal, cuándo derivar sede de sesión o aceptar sedeId, qué servicios puede usar un cliente en otras sedes y si Recepción accederá a reembolsos/pagos asistidos.
- **Propuesta actual:** Recepción sólo su sede operativa, Gerente global; sede de registro no limita por sí sola servicios de cliente. Recepción procesa devoluciones normales; Gerente autoriza excepciones financieras.
- **Motivo de la propuesta:** aislamiento operativo con administración global y permisos financieros explícitos.
- **Módulos afectados:** M1–M5 y reportes.
- **Impacto si cambia:** filtros, sedeId en entradas, autorización, visibilidad de recursos y frontend de personal. No cambia silenciosamente las reglas de usuarios ya implementadas.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P03 — Renovación e historial de membresías (D10)

- **Tema:** solicitud de contratación, períodos y suspensión.
- **Qué está confirmado:** hay rutas de alta/renovación/estado/renovación automática y campos iniciales de fechas, estado y duración de plan en meses. Son stubs.
- **Qué falta decidir:** recurso de solicitud de renovación, relación con pagos, historial, criterio exacto de inicio/fin, meses calendario y fin de mes, semántica de `/me`, estados/acciones administrativos, consentimiento y medio de renovación automática.
- **Propuesta actual:** conservar períodos históricos, crear vigencia sólo al aprobar pago, nuevo período al terminar el anterior o al aprobar si venció; 404 en `/me` sin período vigente; suspensión sin fabricar vigencia. Acción SUSPENDER/REACTIVAR e If-Match eran una alternativa, no únicas soluciones.
- **Motivo de la propuesta:** trazabilidad y separación de preferencia, pago y vigencia.
- **Módulos afectados:** M1, M5, Auth y frontend.
- **Impacto si cambia:** respuestas de membresía/renovación, estados, recurso pagable, fechas y persistencia.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P04 — Contingencia offline, sincronización y acceso (D11/D12)

- **Tema:** ingreso/salida durante desconexión y aforo.
- **Qué está confirmado:** accesos/QR/aforo tienen rutas; ingreso y salida están en el esquema. La bitácora del 23/09 contempla caché y sincronización posterior. No hay backend offline.
- **Qué falta decidir:** credencial o búsqueda admitida para ingreso, elegibilidad del cliente, barrera o carácter informativo de capacidad, caché, dispositivos, deduplicación, cronología, manejo de rechazo, tolerancia de reloj, protocolo y transporte de sincronización.
- **Propuesta actual:** aforo informativo; movimientos locales con ID único y reconciliación posterior. **POST `/accesos/sincronizacion` se retiró de paths**: un batch con resultados individuales y límite ilustrativo de 500 era una solución propuesta; endpoint, límite y formato no están aprobados. También puede resolverse mediante cola/eventos u otro protocolo.
- **Motivo de la propuesta:** sostener operación y evitar duplicar movimientos al reintentar.
- **Módulos afectados:** M2, frontend y reportes.
- **Impacto si cambia:** app de Recepción, almacenamiento local, modelo de acceso/aforo, protocolo de transporte y métricas.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P05 — Lista de espera, cupos y tiempos (D13)

- **Tema:** inscripciones, ofertas y aceptación.
- **Qué está confirmado:** existen rutas de reserva/lista/ofertas; tabla de inscripción con posición. No hay servicios de espera ni ofertas implementados.
- **Qué falta decidir:** apertura/cierre, criterio FIFO y desempate, requisitos de ingreso, duplicados, tratamiento del cupo durante una oferta, caducidad, recepción de notificaciones y condiciones de rechazo/aceptación.
- **Propuesta actual:** FIFO sin duplicados; cierre de inscripción 48 h antes; ofertas a inscritos previos hasta 1 h antes, vencen a las 8 h o al límite operativo, lo anterior. Esos números se conservan como propuesta en metadata, sin validaciones contractuales obligatorias. La frase del prototipo sobre apertura de reservas 48 h antes no resuelve esta política.
- **Motivo de la propuesta:** orden previsible y ofertas que puedan aprovecharse antes de la clase.
- **Módulos afectados:** M3, notificaciones y frontend.
- **Impacto si cambia:** cálculos temporales, UI de inscripción/respuesta, liberación de cupos y procesamiento de ofertas.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P06 — Faltas y penalizaciones (D14)

- **Tema:** cálculo de faltas, sanción y correcciones.
- **Qué está confirmado:** hay asistencia/reservas de clase y tabla de penalización; no existe lógica funcional que cierre ventana, umbral o duración.
- **Qué falta decidir:** qué cuenta como falta, margen de cancelación, umbral, ventana móvil, duración, reincidencia, correcciones, levantamiento y dónde exponer estado/configuración.
- **Propuesta actual:** tres faltas en 30 días; cancelación >= 2 h no cuenta y < 2 h tardía cuenta una vez; ausencia también cuenta; duración configurable. Exponer penalización en `/reservas/me` era una alternativa, sin hacerla campo obligatorio. Umbral, ventana y tiempos no son enums ni constantes normativas.
- **Motivo de la propuesta:** aplicación consistente y correcciones sin duplicar faltas.
- **Módulos afectados:** M3, M1 y frontend.
- **Impacto si cambia:** elegibilidad de reservas/ofertas, contadores, respuesta de historial y configuración.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P07 — Tarifas, planes y precio (D15 y prototipos)

- **Tema:** precio final y su configuración.
- **Qué está confirmado:** esquema con precio de plan, costo base por cancha y precio aplicado a reserva; hay tipos de cancha. El prototipo muestra descuentos/horas pico sin servicio real.
- **Qué falta decidir:** fórmula, tarifas por tipo o por cancha, descuentos, horario pico, sedes, moneda/redondeo, vigencia de un precio consultado y administración del catálogo.
- **Propuesta actual:** servidor calcula precio final; cliente selecciona turno y no envía importe definitivo. Plan/tarifa/configuración y representación monetaria del borrador deben validarse. No se fija 15%, ventana pico, importe ni endpoint de tarifas globales.
- **Motivo de la propuesta:** evitar importes manipulables y preservar el precio efectivamente contratado.
- **Módulos afectados:** M1, M4, M5 y frontend.
- **Impacto si cambia:** DTO monetario, consulta de turnos, altas administrativas y cálculo/conciliación de pagos.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P08 — Coordinación reserva–pago y concurrencia (D8/D15/D16/D17)

- **Tema:** seleccionar turno, retener y confirmar.
- **Qué está confirmado:** rutas de turnos/reservas/pago y referencia de reserva al turno. V1 impide duplicar el mismo comienzo de turno por cancha. Las bitácoras investigaron control optimista y pesimista; no existe lógica de RN-02.
- **Qué falta decidir:** una o dos fases, retención, duración, estados, recurso pagable, mecanismo de concurrencia y garantía BD entre reservas/mantenimiento; alcance y retención de idempotencia.
- **Propuesta actual:** turno predefinido, retención PENDIENTE_PAGO con venceEn y luego M5; integridad BD con control optimista, 409 al competidor, sin lock durante espera externa. El temporizador de 10 min del frontend no cierra duración ni estrategia. Se conserva turnoId como campo propuesto, no una decisión del equipo atribuida al schema.
- **Motivo de la propuesta:** impedir sobreventa sin bloquear transacciones mientras se espera una pasarela.
- **Módulos afectados:** M4, M5, persistencia y frontend.
- **Impacto si cambia:** entradas de reserva/pago, estados, disponibilidad, temporizador y transacciones.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P09 — Pagos tardíos, pasarela y comprobantes (D18)

- **Tema:** aprobación asíncrona y recurso cuyo plazo venció.
- **Qué está confirmado:** existen pagos, referencia de pasarela y comprobantes en el esquema; operaciones de M5 son stubs. PDF directo es la decisión técnica de representación; cuándo emitirlo no está cerrado.
- **Qué falta decidir:** tokenización/callback autenticado, estados, orden de eventos, tratamiento de aprobación tardía, compensación/reembolso, reintentos, conciliación, unicidad y emisión del comprobante.
- **Propuesta actual:** no revivir una reserva expirada; mantener su estado e iniciar compensación automática. Es una alternativa de seguridad operacional, pendiente de acuerdo con M4/M5. La retención de claves por todo el ciclo monetario no se impone como política ya aprobada.
- **Motivo de la propuesta:** evitar reasignar un turno que otro cliente podría haber reservado.
- **Módulos afectados:** M4, M5, reportes y frontend.
- **Impacto si cambia:** estados y eventos, compensación, conciliación, disponibilidad de turnos y comprobantes.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P10 — Cancelaciones y reembolsos (D19)

- **Tema:** elegibilidad, permisos y movimiento financiero.
- **Qué está confirmado:** hay cancelaciones de clases/canchas y ruta de reembolsos; no hay ruta de cancelación de membresía. M5 hoy autoriza SOCIO_ACTIVO/CLIENTE_EXTERNO/GERENTE, sin Recepción. La bitácora deja pagos asistidos/permisos pendientes.
- **Qué falta decidir:** política por servicio, margen temporal, devolución total/parcial/ninguna, estados separados, dueño de elegibilidad y ejecución, excepciones, auditoría y permisos de personal.
- **Propuesta actual:** >= 2 h a tiempo, < 2 h tardía para servicios con inicio; M1/M4 decide y M5 devuelve; excepciones financieras auditables por Gerente. **POST `/membresias/{membresiaId}/cancelacion` se retiró de paths**: es una solución sugerida para una necesidad a validar; cancelar la membresía podría tener otro recurso/comando o flujo. No se obliga a crear esa ruta, deshabilitar una preferencia o usar determinados estados por inferencia.
- **Motivo de la propuesta:** separar decisión de negocio, cancelación y devolución de dinero.
- **Módulos afectados:** M1, M3, M4, M5, reportes y frontend.
- **Impacto si cambia:** DTO de cancelación/reembolso, permisos, compensación, contabilidad, reglas temporales y nuevas rutas.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P11 — Métricas y alcance de reportes (D20)

- **Tema:** definición de ingresos y ocupación.
- **Qué está confirmado:** reportes de ingresos/ocupación existen como stubs exclusivos de GERENTE; esquema tiene fechas de pagos/accesos/reservas y relación a sedes.
- **Qué falta decidir:** período y zona, evento contable tomado, política de devoluciones, monedas, vista global, métricas de ocupación, denominadores, tratamiento de mantenimiento y eventos offline/correcciones.
- **Propuesta actual:** ingresos = pagos aprobados − reembolsos completados, por instante del movimiento y moneda; con sedeId por sede y sin filtro global. Ocupación histórica, separada del aforo, con promedio temporal/máximo de accesos, asistencia de clases y minutos de cancha. Fórmulas, campos y obligatoriedad del período son draft; se pueden sustituir por otras métricas antes del acuerdo.
- **Motivo de la propuesta:** lectura comprensible y trazabilidad de cifras.
- **Módulos afectados:** reportes, M2–M5 y frontend.
- **Impacto si cambia:** campos/filtros, consultas agregadas, interpretación de ingresos y comparación por período/sede.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### P12 — Sedes públicas para registro (D5)

- **Tema:** elección de sede sin sesión.
- **Qué está confirmado:** el registro exige sedeId existente; GET /sedes devuelve DTO y requiere autenticación actualmente, también en @PreAuthorize.
- **Qué falta decidir:** abrir esa misma ruta, crear una proyección pública mínima u otra forma de elegir sede; campos visibles antes de autenticación, incluida capacidad.
- **Propuesta actual:** abrir GET /sedes para registro y evitar una sede hardcodeada. No se cambia su seguridad normativa mientras se valida; `x-propuesta-security: []` conserva la alternativa sin falsear el backend.
- **Motivo de la propuesta:** permitir selección de sede en registro sin exigir una sesión previa.
- **Módulos afectados:** Auth, M1/sede y frontend.
- **Impacto si cambia:** seguridad, proyección pública y formulario de registro.
- **Estado:** PENDIENTE DE VALIDACIÓN DEL EQUIPO.

### Trazabilidad de los antecedentes D1–D20

| Antecedente | Tratamiento de esta revisión |
|---|---|
| D1/D2 | Alcance, fuente técnica y cobertura conservados; autoridad de stable separada de draft. |
| D3/D4/D5 | P01/P02/P12; baseline y propuestas de evolución separados. |
| D6/D7/D9 | Convenciones técnicas conservadas; aplicación de If-Match a estado de membresía queda draft P03. |
| D8 | RN-02 investigada, estrategia concreta pendiente P08. |
| D10 | P03: renovación/historial no se declaran aprobados por tabla o stub. |
| D11/D12 | P04/P11; endpoint nuevo fuera de paths. |
| D13/D14 | P05/P06: tiempos, umbrales y sanciones como propuestas. |
| D15/D16 | P07/P08: selección, precio y coordinación con pago. |
| D17 | Convención técnica de clave conservada; alcance/retención/integración P08–P10. |
| D18/D19 | P09/P10; nueva cancelación de membresía fuera de paths. |
| D20 | PDF como representación técnica stable; emisión P09/P10 y métricas P11. |
