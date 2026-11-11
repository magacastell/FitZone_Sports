# Planificación y seguimiento del TIF de FitZone Sports

**Grupo consignado en los planes:** 2 · **Versión:** 0.1 · **Fecha de consolidación:** 11/11/2026  
**Corte Git:** `docs/cierre-tif`, `0cf3b5311f78e0a7017efaa81392f13a4c7422c3`.

Esta primera versión consolida planes, bitácoras y entregas recuperables para el §5.6 y el Anexo H de los lineamientos. Las fechas de una bitácora son las fechas declaradas para la actividad. Las fechas de Git identifican un commit en el historial. Una estimación por período expresa trabajo previsto. Un resultado de prueba histórico se atribuye a su fuente y a su corte. **PC** significa pendiente de confirmación.

## 1. Alcance y restricciones

El alcance del TIF comprende usuarios y membresías, acceso y aforo con contingencia offline, clases y lista de espera, reservas de canchas y pagos con comprobantes. La entrega incluye integración, pruebas, documentación, seguimiento y defensa. El desglose de este archivo se puede usar para rastrear las tareas del cierre. Las claves de historia se asignaron durante esta consolidación y falta vincularlas con las tarjetas originales. [N1, N2]

Para el corte revisado quedan fuera de la operación acreditada el cobro real con tarjetas y la entrega externa de notificaciones de M3. El portal responsive y el terminal de sede son el alcance de operación descrito por los lineamientos de entrega. El enunciado también menciona un APK/IPA entre sus entregables por unidad. La interpretación aplicable debe confirmarse con la cátedra. Los pendientes de M4/M5, penalidades y reportes siguen identificados como brechas y requieren acuerdo de cierre. [N1 pp. 4 y 11–12, N2 p. 20, V1]

La planificación oficial de referencia abarca 16 semanas. Para el cierre se toma como límite de trabajo el **19/11/2026 a las 18:00 de Argentina**, horario de portada, §2.1 y §3.1. La tabla de hitos de pp. 4–5 indica 23:59. La diferencia queda pendiente de confirmación. La propuesta interna del 09/11 plantea llegar al 15/11 y conserva su carácter de propuesta. [N1, P09]

## 2. Equipo y distribución documentada

Los planes de períodos 3 y 4 nombran a los seis integrantes y la bitácora grupal registra aportes de los seis. Las tareas de la tabla se atribuyen únicamente al plan o registro que las identifica. Los roles académicos P1–P4 del modelo oficial, su correspondencia con los seis integrantes y las horas comprometidas **por persona** quedan PC. [P3, P4, B0, V1]

| Integrante verificado | Asignaciones que figuran en los planes | Trabajo registrado y fuente |
| --- | --- | --- |
| **Magalí Castell Ziegler** | Líder del período 3. Arquitectura con Valentina y API con Ignacio. En período 4, arquitectura/API y patrones con Augusto. [P3, P4] | Revisión de módulos y C4, reorganización del tablero, elaboración del plan del período 3 y revisión del dossier en el cierre. [B1, H03, H04, H10] |
| **Valentina Martínez** | Arquitectura y backend en período 3. Arquitectura, M2/M4 y apoyo a persistencia en período 4. [P3, P4] | Preparó la planificación del período 2, trabajó la definición de módulos y registró el traspaso de liderazgo del 27/09. [B4, H02, H03] |
| **Ignacio Denis** | Contratos con Magalí y frontend con Augusto en período 3. Líder del período 4, con contratos y frontend. [P3, P4] | Investigación de concurrencia, enfoque Design First y base React/sesión. [B3, H02, H05] |
| **Bautista Orge Perilli** | Persistencia en ambos períodos. En período 4, M1/M3 y reportes iniciales, con tareas semanales de persistencia y pagos. [P3, P4] | Flyway, endpoints iniciales, planes, membresías y PDF/reembolso de membresías. [B5, H04, H05, H06] |
| **Claudio Cejas** | Backend y seguridad en período 3. En período 4, M5 en la tabla por áreas y trabajo en acceso/canchas con Valentina en la semana 2. [P3, P4] | Autenticación, usuarios, sedes, QR/aforo y clases con espera. [B2, H02, H05, H06, H09] |
| **Augusto Vidoni** | Frontend e integración en período 3. Frontend y patrones en período 4. El registro grupal lo identifica como líder inicial el 26/08. [P3, P4, B0] | Navegación, contrato OpenAPI, integración M1 y verificación de M2 online/offline. [B6, H01, H05, H07, H08, H09] |

## 3. Desglose del trabajo

WBS consolidada a partir del enunciado, los planes y el alcance verificable. Las subtareas y criterios indican cómo comprobar el resultado. Las estimaciones históricas disponibles se conservan por bloque en [seguimiento](#5-seguimiento-de-capacidad-esfuerzo-y-desvíos). La estimación por historia/subtarea, los IDs del tablero y las asignaciones ausentes quedan PC.

| Épica | Historia o entrega y subtareas técnicas | Criterio de aceptación verificable | Asignación documentada |
| --- | --- | --- | --- |
| Arquitectura | **AR-01** Documentar contexto, contenedores, componentes y decisiones. Contrastar dependencias, mantener fuentes editables y exportaciones. | Diagramas y ADR identificados y contrastados con el código de entrega. | Valentina y Magalí para C4-3 [P3, P4]. Autoría final por artefacto PC. |
| Base técnica | **BT-01** Levantar persistencia y seguridad. Versionar esquema, validar mapeos y configurar permisos. **BT-02** Definir y revisar OpenAPI, DTO y estados de implementación. | Una base limpia aplica migraciones. Las rutas declaradas implementadas responden y respetan el contrato y los permisos. | Bautista en datos y Claudio/Valentina en backend [P3]. Magalí/Ignacio para contrato [P3, P4]. |
| M1 | **M1-01** Registrarse y gestionar perfil. **M1-02** Contratar, renovar y consultar vigencia. Incorporar períodos e idempotencia. | El perfil se persiste. Reintentar una contratación con la misma clave deja un cobro y un período. Un período vencido o suspendido pierde vigencia. | Bautista para M1 backend [P4]. Frontend con Ignacio/Augusto [P4]. |
| M2 | **M2-01** Validar QR, ingreso/egreso y aforo multisede. **M2-02** Preparar terminal, operar sin red y reconciliar eventos. | Una visita online se registra una vez y refleja el aforo. En contingencia, los movimientos sobreviven a reapertura y un reintento conserva un único efecto central. | Valentina para M2 en el plan por áreas [P4]. Claudio y Augusto figuran en la evidencia de implementación [H06, H08, H09]. |
| M3 | **M3-01** Administrar agenda. **M3-02** Reservar y cancelar con cupo. **M3-03** Gestionar espera, oferta y respuesta con Observer. | La agenda filtra por sede y fecha. Dos intentos por el último cupo no lo exceden. La primera entrada en espera recibe una oferta. Se verifica la elegibilidad al aceptar y el vencimiento vuelve a liberar el cupo. | Bautista en el plan por áreas [P4]. El aporte integrado en noviembre está registrado por Claudio [H09]. |
| M4 | **M4-01** Administrar canchas y mantenimiento. **M4-02** Consultar grilla y reservar sin sobreventa. **M4-03** Calcular tarifa base, descuento y recargo. | Solo un intento concurrente confirma un turno. La mora aplica tarifa externa. El mantenimiento bloquea disponibilidad futura según el alcance. | Valentina en la tabla por áreas y Claudio con apoyo de Valentina en la segunda semana [P4]. Responsable actual PC. |
| M5 | **M5-01** Cobrar por pasarela simulada y registrar referencias. **M5-02** Emitir y descargar comprobante, con control de reintentos. | Un reintento de pago conserva un único efecto. El PDF de cancha contiene cancha, horario e importe correctos. | Claudio en la tabla por áreas y Bautista con apoyo de Claudio para pago/PDF en semana 2 [P4]. Alcance integrado parcial en membresías [H06]. |
| Frontend y reportes | **UI-01** Integrar navegación, sesión y vistas por perfil con la API. **UI-02** Consultar información de administración, aforo e ingresos. | Las vistas de negocio disponibles leen la API y reflejan permisos y errores. Los reportes pendientes se identifican en la interfaz. | Augusto/Ignacio en frontend. Bautista con apoyo de Claudio en reportes por área [P4]. |
| QA y entrega | **QA-01** Ejecutar suites, publicar cobertura y probar RN/RNF. **QA-02** Preparar arranque integrado, semilla y CI/CD. **DOC-01** Consolidar manuales, planificación, bitácoras, dossier y defensa. | Un clon limpio reproduce el arranque. Evidencia vinculada al SHA y requisitos. Dossier y repositorio reflejan el mismo corte. | Integración prevista para todo el equipo [P3, P4]. Coordinación y responsables actuales por confirmar [P09]. |

## 4. Cronograma de ocho sprints

La vista siguiente agrupa **por pares las semanas del cronograma docente** para cubrir las ocho posiciones del Anexo H. Sirve como referencia de objetivos y entregables. La correspondencia con los sprints que usó el equipo, sus fechas reales, capacidad comprometida y criterios de cierre requieren el calendario y las tarjetas. Las evidencias de la última columna corresponden al tema de cada fila y conservan sus fechas de origen. Las etiquetas históricas `S1`, `S2`, `S3` y `S4` se preservan aparte tal como aparecen en cada bitácora. [N1, N2 pp. 18–20, B3, B5, B6]

**Mapa de ruta docente:** `S1 Arquitectura → S2 Frameworks → S3 Patrones → S4 Servicios/UI → S5 Integración frontend → S6 QA/CI → S7 Offline → S8 Cierre y defensa`.

| Sprint de referencia | Semanas y fechas disponibles | Objetivo y entregable de referencia | Capacidad y cierre del equipo |
| --- | --- | --- | --- |
| **S1** | Semanas 1–2. Fechas de sprint PC. | Decisiones de arquitectura, C4 de contexto/contenedores y ADR iniciales. | PC. Hay registros fechados de Unidad I del 26/08 al 05/09 [H01]. |
| **S2** | Semanas 3–4. Fechas de sprint PC. | Base backend, IoC, ORM, entidades y API inicial. | PC. Hay evidencia de frameworks en septiembre y principios de octubre [H02, H04, H05]. |
| **S3** | Semanas 5–6. Fechas de sprint PC. | Refactor y justificación de patrones, especialmente Strategy y Observer. | PC. El plan P4 incluye ese objetivo. El Observer se integró en noviembre [H09]. |
| **S4** | Semanas 7–8. Fechas de sprint PC. | Repository, servicios y base de componentes frontend. | PC. La bitácora de Augusto usa `S4` para una sesión de integración M1 del 29/10 [E05]. |
| **S5** | Semanas 9–10. Fechas de sprint PC. | Estado compartido y consumo de API. Entregable de frontend integrado y documentado. | PC. Hay entregas de frontend fechadas, con alcance modular parcial [H07]. |
| **S6** | Semanas 11–12. Fechas de sprint PC. | Suites unitarias/integración, cobertura, CI/CD y contenedores. | PC. Hay runners y reportes históricos. El pipeline versionado queda pendiente [H08, V2]. |
| **S7** | Semanas 13–14. Lineamientos recomiendan 02–08/11 para portal/acceso y 09–15/11 para integración, manuales y plan. | Persistencia local y acceso offline reproducible. Integración adelantada según el reacomodamiento docente. | PC. M2 offline y M3 tienen hitos comprobables del 09–10/11 [H08, H09]. |
| **S8** | Semanas 15–16. Tramo original 16–29/11. Congelamiento oficial 16–19/11 y defensa 23–29/11. | Corte integrado, dossier, checklist y defensa. | PC. Hay documentación en la rama al corte [H10]. La fecha interna del 15/11 es propuesta [P09]. |

Las ventanas de equipo acreditadas en planes son **Período 3**, inicio previsto 28/09/2026 y duración de dos semanas, y **Período 4**, previsto 12–25/10/2026. El registro de Valentina indica un plan del período 2 elaborado el 12–13/09, con reparto por semana e integrante. Falta recuperar ese plan. Ninguna de esas referencias fija por sí sola la numeración de los ocho sprints. [P3, P4, B4]

## 5. Seguimiento de capacidad esfuerzo y desvíos

### Capacidad prevista en los planes recuperados

Las horas de estas tablas son **estimaciones de bloque**. Trabajo y estudio se mantienen en columnas distintas. Los totales calculados se distinguen de los declarados.

| Área | Período 3 trabajo / estudio | Período 4 trabajo / estudio |
| --- | ---: | ---: |
| Arquitectura | 5 / 3 h | 2 / 0 h |
| Contratos/API | 11 / 5 h | 4 / 1 h |
| Datos y persistencia | 10 / 4 h | 6 / 2 h |
| Backend | 15 / 5 h | 3 / 5 h |
| Frontend | 10 / 4 h | 8 / 2 h |
| Integración | 7 / 1 h | 7 / 1 h |
| Patrones | 2 / 2 h, condicionales | 7 / 3 h |
| Reportes | Sin bloque separado | 3 / 0 h |
| **Suma de filas por área** | **60 + 24 = 84 h-persona** | **40 + 14 = 54 h-persona** |

- **P3.** El plan declara 84 h-persona y un promedio orientativo de 14 h por integrante. Las dos listas semanales suman 50 y 34 h. Incluyen 4 h de patrones condicionadas al avance de Frameworks. [P3, H04]
- **P4.** El plan declara 84 h-persona, desglosadas en 70 de trabajo y 14 de estudio. Las listas semanales suman 42 + 42 h. La tabla por áreas suma 54 h. La diferencia de **30 h es entre dos estimaciones**, y falta determinar qué base usó el equipo para seguir el período. La semana 2 mezcla «revisión/estudio» en una fila, por lo que sus totales no reconstruyen por sí solos la división declarada. [P4, H06]

### Esfuerzo real registrado

| ID | Persona y fecha de entrada | Etiqueta literal y esfuerzo acreditado por la bitácora | Fuente |
| --- | --- | --- | --- |
| E01 | Ignacio Denis · 18 y 23/09 | `S1`, **10,5 h** sumadas de seis registros. | B3, entradas 18 y 23/09. |
| E02 | Augusto Vidoni · 23/09 | `S1`, **4 h** sumadas de cuatro registros. | B6, entrada 23/09. |
| E03 | Ignacio Denis · 28/09 | `S3`, **4,5 h** sumadas de tres registros. | B3, entrada 28/09. |
| E04 | Augusto Vidoni · 01 y 06/10 | `S2`, **2,5 h** de estructura/navegación el 01/10. **4 h** de contrato OpenAPI el 06/10, sin etiqueta de sprint en esa actividad. | B6, entradas 01 y 06/10. |
| E05 | Augusto Vidoni · 29/10 | `S4`, **aprox. 2 h** de integración frontend M1. | B6, entrada 29/10. |
| E06 | Augusto Vidoni · 07/11 | **Aprox. 3 h** de cierre local RF-01/RF-02, identificadas por él como efectivas. Numeración de sprint PC. | B6, entrada 07/11. |

Ignacio suma **15 h** en las entradas citadas y Augusto **aprox. 15,5 h**. Son subtotales de registros con duración disponible. Para Magalí, Valentina, Bautista y Claudio hay aportes registrados sin un total de esfuerzo recuperable. Las entradas de Augusto del 09–10/11 dejan las horas PC. Falta un registro que permita comparar, para cada uno de los ocho sprints, comprometido, completado y horas efectivas bajo la misma unidad. Por eso la velocidad y el desvío acumulado quedan **PC**. Los commits permiten comprobar entregas, pero no miden horas ni puntos.

Los rótulos ilustran la discrepancia de calendario. La entrada de Ignacio del 28/09 figura como `S3` en un archivo encabezado por Período 2. Augusto registra `S2` el 01/10 bajo Período 3. Se conservan ambas etiquetas y se solicita la equivalencia oficial del equipo. [E03, E04]

## 6. Trazabilidad de los datos históricos

Cada fila identifica qué se puede sostener y su fuente. Los hashes cortos son resolubles en el historial del corte auditado con `git show <hash>`. Los documentos del kit permanecen fuera de Git. Para cada uno se indica el nombre y la sección que permite recuperar el dato.

| ID | Fecha o período de la fuente | Dato y tipo de evidencia | Fuente precisa |
| --- | --- | --- | --- |
| H01 | 26/08–05/09 | **Registro de actividad.** Inicio de organización el 26/08, elección de liderazgo inicial y discusión de stack. Durante los primeros días de septiembre se registran aportes de arquitectura de los seis integrantes. | B0, Unidad I, entradas 26/08, 03/09, 04/09 y 05/09. B1 y B4, 05/09. Git `4f5b28c`, `7d21b72` y `571b3da` respaldan registros versionados. |
| H02 | 09–23/09 | **Registro de actividad.** Claudio registra base Spring/autenticación/perfiles. Valentina registra el plan P2 del 12–13/09 y el encuentro del 17/09. Ignacio registra concurrencia y Design First. Augusto registra revisión de ADR y flujo de colaboración. | B2, 09–11/09. B4, 12–13 y 17/09. B3, 18 y 23/09. B6, 23/09. Git `3ab431a` y `b3078c1`. |
| H03 | 19–28/09 | **Registro y revisión.** Definición de módulos y ER. Valentina registra revisión de tareas pendientes, aprobación del alcance de la primera iteración de módulos/BD y traspaso a Magalí el 27/09. Magalí registra reorganización del Kanban, contratos y preparación del plan. | B4, 19, 21, 26, 27 y 28/09. B1, 25–28/09. Git `9849ebf` y `68b3b12`. |
| H04 | Desde 28/09 · P3 | **Plan y trabajo registrado.** P3 previó Frameworks, OpenAPI, C4, React e integración. Se registraron Flyway, estructura React y avance de C4. Las estimaciones de P3 proceden de sus tablas. | P3, «Objetivo», «Tareas programadas» y «Estimación». B1, 28 y 30/09. B3/B5, 28/09. Git `2338318` y `b89f8da`. |
| H05 | 01–12/10 | **Entregas e integración.** Navegación, conexión de login, usuarios, sedes, contrato y planes. Las rutas iniciales por módulos incluyeron respuestas `501`. El alcance de C4 y decisiones de API continuó en revisión según el resumen siguiente. | P4, «Resumen del período anterior». B6, 01, 06 y 12/10. B2, 04–05/10. B5, 04 y 11/10. Git `b8a8346`, `b58ee7c`, `a7504c3`, `06d80cc`, `d9873bd`, `5602bbf`, `1dcd68a`, `ddc69a5`. |
| H06 | 12–25/10 · P4 | **Plan y entregas parciales.** El plan priorizó cancha → pago → PDF, con previsiones por área y semana. El historial acredita QR/aforo, membresías y PDF/reembolsos para membresías. El flujo de cancha seguía pendiente en el corte. | P4, «Tareas programadas», «Semana 1», «Semana 2» y «Resultado esperado». B2, 13/10. B5, 18 y 25/10. Git `284b718`, `52ef8b8`, `becd81d`. V1, pendientes M4/M5. |
| H07 | 29–30/10 | **Integración y bloqueo.** Augusto registra que la comprobación manual de contratación se vio limitada por falta de planes activos/UI de administración. Siguieron gestión de planes y ajustes de actor, membresía y sede habitual. La documentación de integración delimita pantallas y operaciones pendientes. | B6, 29–30/10. [Integración frontend](../integracion-final-frontend.md). Git `3ee92e8`, `6f599c4`, `b5a7e9c`, `e12e846` y `03f904e`. |
| H08 | 07–09/11 | **Integración, correcciones y QA.** Cierre local RF-01/RF-02, integración M1/M2 online, foto en Recepción, auditoría de pruebas y E2E offline. La coordinación del 09/11 describe pendientes a ese momento y propone responsables por frente sin nombres. | B6, 07 y 09/11. P09, §§2–7. V2. Git `08ecb29`, `e4fe538`, `d294674`, `1e4afc5` y `e5769c8`. |
| H09 | 10/11 | **Entregas integradas.** QR automático multisede y M3 con agenda, reservas y espera. La notificación de M3 se simula en log. Asistencia y penalidades siguen pendientes. El cierre de arquitectura incorporó seis ADR y cuatro diagramas. | B2 y B6, 10/11. V1 y [decisiones OpenAPI](../openapi/DECISIONES.md). Git `d4ceaa3`, `5f71e61`, `a492725` y `a367a8d`. |
| H10 | 10–11/11 | **Cierre documental en la rama.** Magalí registró revisión del dossier y pendientes. Al corte están versionados los dos UML adicionales y los manuales Técnico y de Instalación y Operación. | B1, 10/11 y Git `6fa661f`. Git `b6323ac` y `0cf3b53`. [Manual Técnico](../manuales/manual-tecnico.md) · [Instalación y Operación](../manuales/manual-instalacion-operacion.md) |
| E01–E06 | 18/09–07/11 | **Horas declaradas.** Fechas, etiquetas y subtotales reproducibles en la tabla de esfuerzo. | B3, 18, 23 y 28/09. B6, 23/09, 01/10, 06/10, 29/10 y 07/11. Git `4eff24c` y `d2541f6` respaldan entradas de Augusto. |
| N1, N2, P09 | Calendario de cierre | **Hitos normativos y propuestos.** El límite de 18:00 y la discrepancia de horario proceden de los lineamientos. La defensa y el reacomodamiento proceden de su §2.2. Las fechas internas 12–15/11 proceden de una propuesta de coordinación. | N1, portada y §§2.1, 2.2 y 3.1, pp. 4–6. N2, pp. 18–20. P09, §§5–7. |

## 7. Trazabilidad de requisitos a historias y pruebas

Los IDs corresponden al desglose de este documento. La columna de evidencia distingue archivos de prueba, documentación y brechas. Una prueba existente puede requerir una nueva ejecución para el corte de entrega. [N1 §5.6.1, N2 pp. 7–13, V2]

| Requisito | Historia | Prueba o evidencia disponible y validación pendiente |
| --- | --- | --- |
| RF-01 · Registro y perfil | M1-01 | [RegistroIdentidadIntegrationTest](../../src/test/java/com/fitzonesports/usuario/RegistroIdentidadIntegrationTest.java) y [verificación RF-01/RF-02](../rf01-rf02-experiencia-verificacion.md). |
| RF-02 · Membresías | M1-02 | [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java) y [UML de estados](../diagramas/uml-estados-membresia.md). |
| RF-03 · Acceso multisede | M2-01, M2-02 | [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java) y [OfflineIntegrationTest](../../src/test/java/com/fitzonesports/acceso/OfflineIntegrationTest.java). |
| RF-04 · QR | M2-01, M2-02 | [OfflineIntegrationTest](../../src/test/java/com/fitzonesports/acceso/OfflineIntegrationTest.java) y [E2E offline](../../frontend/scripts/e2e-m2-offline.mjs). |
| RF-05 · Aforo | M2-01, UI-02 | [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java) y [guía de Recepción](../m2-recepcion.md). |
| RF-06 · Agenda de clases | M3-01 | [ClaseController](../../src/main/java/com/fitzonesports/clase/controller/ClaseController.java). [Script de actividades](../../frontend/scripts/test-servicios-actividades.mjs) comprueba transporte. Falta prueba integral de agenda. |
| RF-07 · Reserva y cancelación de clases | M3-02 | [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java) comprueba elegibilidad ante una clase inexistente. Falta prueba de cupo, cancelación y límites temporales con clase real. |
| RF-08 · Lista de espera | M3-03 | [UML de actividad](../diagramas/uml-actividad-lista-espera.md) traza Observer y oferta. Falta prueba integral de FIFO, vencimiento y canal de aviso. |
| RF-09 · Recursos de cancha | M4-01 | [CanchaController](../../src/main/java/com/fitzonesports/reserva/controller/CanchaController.java) expone rutas `501`. Falta prueba de CRUD y sede. |
| RF-10 · Turnos y reservas | M4-02 | [CanchaController](../../src/main/java/com/fitzonesports/reserva/controller/CanchaController.java). Falta prueba de disponibilidad y confirmación sobre el turno. |
| RF-11 · Precio dinámico | M4-03 | Strategy pendiente en [Manual Técnico](../manuales/manual-tecnico.md). Falta prueba de base, descuento, recargo y bordes horarios. |
| RF-12 · Mantenimiento | M4-01 | Rutas de mantenimiento en [CanchaController](../../src/main/java/com/fitzonesports/reserva/controller/CanchaController.java). Falta probar efecto sobre disponibilidad futura. |
| RF-13 · Pago simulado | M5-01 | [PasarelaPagoFakeTest](../../src/test/java/com/fitzonesports/pago/PasarelaPagoFakeTest.java) y [PagosIntegrationTest](../../src/test/java/com/fitzonesports/pago/PagosIntegrationTest.java) respaldan el simulador y pagos de membresía. Falta integrar y probar cancha. |
| RF-14 · Comprobante | M5-02 | [ComprobantePdfRendererTest](../../src/test/java/com/fitzonesports/pago/ComprobantePdfRendererTest.java) y [PagosIntegrationTest](../../src/test/java/com/fitzonesports/pago/PagosIntegrationTest.java) cubren PDF de membresía. Falta PDF de cancha con horario e importe. |
| RN-01 · Presencia única | M2-01, M2-02 | [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java) y [OfflineIntegrationTest](../../src/test/java/com/fitzonesports/acceso/OfflineIntegrationTest.java). La reconciliación conserva conflictos entre sedes aisladas. |
| RN-02 · Sin sobreventa | M4-02, QA-01 | [V1](../../src/main/resources/db/migration/V1__crear_esquema_inicial.sql) hace único el turno. Falta la garantía de ocupación y la prueba de dos intentos con una sola confirmación. |
| RN-03 · Mora | M1-02, M3-02, M4-03 | Elegibilidad de clases en [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java). Falta probar tarifa externa de cancha con membresía vencida. |
| RNF-01 · Disponibilidad | M2-02, QA-01 | [E2E offline](../../frontend/scripts/e2e-m2-offline.mjs) ejercita contingencia. Falta medir disponibilidad operativa del 99,5 %. |
| RNF-02 · Datos de tarjeta | M5-01 | [SolicitudCobro](../../src/main/java/com/fitzonesports/pago/pasarela/SolicitudCobro.java) modela el fake sin campos de tarjeta. Falta validar tokenización y tratamiento del flujo final. |
| RNF-03 · Rendimiento | M4-02, QA-01 | Índice de turno en [V1](../../src/main/resources/db/migration/V1__crear_esquema_inicial.sql). Falta medir disponibilidad con volumen representativo. |
| RNF-04 · Alta de sede | UI-02, QA-01 | [SedeService](../../src/main/java/com/fitzonesports/sede/service/SedeService.java) guarda el alta con el sistema iniciado. Falta ensayo operativo con una sede existente en servicio. |

## 8. Desvíos impedimentos y decisiones registradas

| Tema | Desvío o impedimento sustentado | Acción y resultado sustentados | Fuente |
| --- | --- | --- | --- |
| Arrastre P2 → P3 | El P3 declara pendientes en contratos, persistencia, backend, seguridad y frontend. | Se redistribuyeron actividades para trabajar en paralelo. Valentina registra revisión de avance y traspaso el 27/09. | H03, H04, P3 |
| Cierre P3 | P4 todavía registra C4 nivel 3, contratos e integración como pendientes. La existencia de rutas iniciales acreditó un esqueleto con stubs. | Se revisó el contrato contra código, separando madurez del contrato de implementación. Planes y varias rutas de usuarios/sedes pasaron a lógica real. | H05, V3 |
| Flujo prioritario P4 | Se esperaba cerrar cancha → pago → PDF. El corte acredita pagos y PDF de membresía, mientras M4 conserva rutas `501`. | Quedó un flujo reutilizable en M1/M5. P09 propone coordinar M4/M5 como frente conjunto. El acuerdo final de responsables y fecha sigue PC. | H06, P09, V1 |
| Comprobación frontend M1 | El 29/10 Augusto dejó constancia de que no pudo completar la contratación manual sin planes activos ni UI administrativa disponible. | Registró verificaciones aisladas y build. Git acredita la adición posterior en el historial de gestión de planes. En noviembre se registró la verificación integrada de M1. | H07, H08 |
| Integración tardía de M2 offline y M3 | P09 los identifica como faltantes del código observado al 09/11. | El historial posterior del 09–10/11 registra E2E offline y la integración de M3. Siguen abiertos la resolución operativa de conflictos, las penalidades y la validación integral de clases. | H08, H09, V1, V2 |

**Retrospectivas.** Hay revisiones recuperables, especialmente la reunión y el traspaso que Valentina registró el 27/09, el resumen de P3 que figura al inicio de P4 y la revisión de calidad registrada en noviembre. La agenda de P09 es una propuesta de reunión. Falta confirmar si se realizó y recuperar actas o retrospectivas formales por sprint. [H03, H05, H08, P09]

**Análisis preliminar del §5.6.3.** El primer problema cuantificable está en la base de estimación de P4, con 30 h de diferencia entre dos tablas de planificación. Las horas reales faltantes impiden atribuir ese número a sobreesfuerzo. El desvío funcional acreditado es el flujo de canchas y pagos que se esperaba en P4 y sigue abierto. El equipo llegó a integrar membresías y sus comprobantes, y la coordinación propuso concentrar M4/M5. Como propuesta de replanificación para validar, conviene cerrar primero el recorrido concurrente de un turno con cobro y PDF, y asignar capacidad explícita a sus pruebas e integración. Falta que el equipo confirme la causa de la estimación, la mitigación acordada y quién toma el pendiente. [P4, H06, P09, V1]

## 9. Riesgos y seguimiento

Probabilidad e impacto históricos quedan **PC** cuando las fuentes carecen de una calificación. La mitigación propuesta se identifica como tal.

| Riesgo identificado | Probabilidad / impacto históricos | Mitigación documentada o propuesta | Qué ocurrió al corte |
| --- | --- | --- | --- |
| Sobreventa de canchas y cruces con mantenimiento | PC / PC | Investigación de bloqueos y restricciones [B3, B5]. P4 prevé integrar concurrencia y mantenimiento. | Sigue pendiente la garantía de ocupación y su prueba RN-02 [H06, V1]. |
| Desacople entre contrato, backend y pantallas | PC / PC | P3/P4 prevén revisión de OpenAPI e integración progresiva. Se registró clasificación de rutas y estados [H05]. | Se integraron flujos de M1–M3. M4 y reportes siguen pendientes. M5 quedó parcial [V1, V3]. |
| Pérdida de conectividad y movimientos pendientes | PC / PC | Copia firmada acotada, persistencia local y reconciliación [H08, H09, V1]. | Hay evidencia histórica de contingencia. Persiste el riesgo de admisiones incompatibles durante una partición y falta resolución operativa [V2]. |
| Llegar al corte sin arranque integrado ni evidencia completa | PC / PC | P09 propone integración y pruebas de aceptación antes del congelamiento interno. | Runners y manuales disponibles. Compose completo, CI/CD, prueba desde clon limpio y carga de 25 sedes quedan pendientes [V1, V2]. |
| Seguimiento incompleto y carga individual no comparable | PC / PC | P3/P4 prevén Kanban y revisión entre pares. Se propone recuperar el export y el plan base de P4. | Planes parciales, dos bases de estimación en P4, sin export consultado ni acumulado por sprint. [H03, P3, P4, E01–E06] |

## 10. Pendientes del cierre

1. **Solicitar al equipo** el calendario real de los ocho sprints y su correspondencia con períodos y etiquetas, los planes originales faltantes (incluido P2), las capacidades y asignaciones confirmadas y el criterio para resolver la diferencia del P4.
2. **Recuperar el tablero o registro de la cátedra** con tarjetas, responsables, fechas de creación/cierre, estimaciones y actividad por sprint. La bitácora del 27/09 y los planes mencionan Kanban. Los commits `b3078c1` y `ddc69a5` acreditan integración mediante PR según sus mensajes. La revisión por pares figura como procedimiento previsto en los planes. La actividad del tablero requiere su propio export. [B1, P3, P4]
3. **Confirmar con cada integrante** horas reales por sprint, bloqueos, decisiones y retrospectivas registradas. Verificar con la cátedra el formato para seis integrantes, los roles académicos y la hora límite. [N1, P09, B0]
4. **Completar el cierre técnico** con M4/M5, las evidencias RN/RNF, QA sobre el SHA candidato, arranque reproducible y carga de 25 sedes. Confirmar responsables, pruebas y criterios de aceptación. [V1, V2, H06]
5. **Completar el cierre documental** con los ADR y diagramas restantes, Manual de Usuario, bitácoras consolidadas, tablero exportado, dossier y ensayo de defensa. Contrastar el contenido de la rama con el futuro tag de entrega. [N1, V1, H10]

## Fuentes

| Clave | Fuente consultada |
| --- | --- |
| N1 | Kit local, `01_Lineamientos_Oficiales.pdf`, 25 pp. Portada, §§2–3, §5.6 y Anexo H. |
| N2 | Kit local, `02_Enunciado_FitZone.pdf`, pp. 7–13 y 17–20. |
| P3 | Kit local, `06_Plan_Periodo_3.docx`, «Tareas programadas», «Estimación de dedicación», «Semana 1», «Semana 2» y «Resultado esperado del período». |
| P4 | Kit local, `07_Plan_Periodo_4.docx`, «Resumen del período anterior», «Tareas programadas», «Estimación de dedicación», «Semana 1», «Semana 2» y «Resultado esperado del período». |
| P09 | Kit local, `04_Informe_Coordinacion_09-11.pdf`, §§2–7. Informe reconstruido de estado y propuesta de coordinación, con el alcance declarado en su portada. |
| B0 | [Bitácora grupal](../../LOGs/LOG.md), Unidad I. |
| B1 | [Bitácora de Magalí Castell Ziegler](../../LOGs/CastellZiegler-LOG.md). |
| B2 | [Bitácora de Claudio Cejas](../../LOGs/Cejas-LOG.md). |
| B3 | [Bitácora de Ignacio Denis](../../LOGs/Denis-LOG.md). |
| B4 | [Bitácora de Valentina Martínez](../../LOGs/Martinez-LOG.md). |
| B5 | [Bitácora de Bautista Orge Perilli](../../LOGs/Orge-LOG.MD). |
| B6 | [Bitácora canónica de Augusto Vidoni](../bitacoras/LOG-vidoni.md). El [archivo histórico](../../LOGs/Vidoni-LOG.md) redirige a esta bitácora. |
| V1 | [Índice de arquitectura](../arquitectura-tif.md) y [Manual Técnico](../manuales/manual-tecnico.md). |
| V2 | [Ejecución y evidencia de pruebas](../pruebas.md) y [guía M2 offline](../m2-offline.md). |
| V3 | [OpenAPI](../openapi/openapi.yaml) y [decisiones de contrato](../openapi/DECISIONES.md). |
