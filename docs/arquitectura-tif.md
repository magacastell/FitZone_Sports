# Arquitectura TIF — Índice y cierre de esta etapa

Edición documental: **2026-11-10**. Base inicial M1/M2: **`d4ceaa33bd7a8a588ccab2a9789a875a9f31ba15`**; referencias afectadas por M3 contrastadas con **`5f71e61cd86598a1318f88d231fe488ba80a3991`**. C4-1/2 **v3** reflejan esa incorporación; C4-3 M2 y secuencia offline conservan **v2** y su base funcional sin cambios. Preparación en `docs/arquitectura-tif` e integración a `main` conservando los commits de M3. Esta etapa cierra seis ADR en estado **Aceptado** y cuatro diagramas. Aceptado corresponde a la decisión técnica adoptada y materializada en la implementación; no certifica completitud funcional, ausencia de deuda ni cierre del TIF. Este trabajo documental no modifica implementación, contratos, migraciones, manuales, planificación ni bitácoras de otros responsables.

## Referencia normativa y alcance

Se consultaron los PDF originales locales, no sólo extracciones anteriores:

| Fuente | Edición identificada | Secciones utilizadas |
|---|---|---|
| `Lineamientos_Entrega_TIF_FitZone_Sports_2do_Cuatrimestre_2026.pdf` | **25 páginas**; SHA-256 `71d1eb3743e92af9b44f5c993722020860c856c5115b4527d762bae6b831f43b` | §5.2.1 p. 9: diez temas/números; §5.3 pp. 10–11: diagramas; Anexo B p. 19: plantilla; Anexo G pp. 23–24: checklist. |
| `Trabajo_Integrador_FitZone_Sports.pdf` | **21 páginas**; SHA-256 `04cc5dcc67ec05b82788a56402675edcb5dddbd73533b2a4d79b12aa89a93cf4` | RF pp. 9–11; RN p. 12; RNF p. 13; definición técnica pp. 14–15. |

Ambos se leyeron en la carpeta local `facultad/prog 5`; no se incorporan copias al repositorio. El hash permite reconocer la versión aunque cambie su ubicación. Una extracción anterior de lineamientos de **22 páginas** asignaba ADR-007 a pruebas y enumeraba nueve ADR: no se usa para esta serie. En la versión de 25 páginas, ADR-007 es sincronización, ADR-008 pruebas, ADR-009 despliegue y ADR-010 pagos. El Anexo B define la estructura, mientras la tabla de §5.2.1 define los temas.

Se mantienen los encabezados y campos del Anexo B. **Fecha** identifica la redacción documental; **Fecha histórica de decisión** distingue lo consignado en antecedentes de lo no acreditado. No se asignan reuniones ni una fecha de aprobación grupal. Autor y sprint permanecen pendientes donde no se acreditan. Los seis ADR registran decisiones técnicas ya adoptadas; esa aceptación conserva todas sus consecuencias negativas y limitaciones. Los seis integrantes autorizados son un dato aportado por el equipo; las referencias genéricas del enunciado a cuatro integrantes no se utilizan para reducirlo ni para reconstruir planificación.

## Serie oficial: seis ADR aceptados y cuatro pendientes

Se reserva el prefijo inequívoco `ADR-NNN-tif-`. No se crean archivos vacíos para decisiones aún no redactadas ni se renumeran los históricos.

| ADR / tema oficial | Archivo o nombre reservado | Evidencia principal / estado |
|---|---|---|
| 001 — Estilo arquitectónico | [ADR-001-tif-monolito-modular.md](adr/ADR-001-tif-monolito-modular.md) | Un artefacto backend Spring; paquetes de dominio y dependencias cruzadas reales. **Aceptado**. |
| 002 — Motor relacional e integridad | [ADR-002-tif-postgresql-e-integridad.md](adr/ADR-002-tif-postgresql-e-integridad.md) | PostgreSQL como motor y Flyway como gestión del esquema, comparados en apartados separados; RN-02 de reservas aún no acreditada. **Aceptado**. |
| 003 — Estrategia offline de acceso | [ADR-003-tif-validacion-qr-offline.md](adr/ADR-003-tif-validacion-qr-offline.md) | Emisor RS256 multisede, confianza aprovisionada, verificación local y caducidad. **Aceptado**. |
| 004 — Concurrencia de canchas | [ADR-004-tif-concurrencia-canchas.md](adr/ADR-004-tif-concurrencia-canchas.md) | **Aceptado, 11/11**. M4 usa bloqueo pesimista por cancha, índice parcial de ocupación, exclusión de turnos y coordinación SQL de mantenimiento en V16. Pruebas PostgreSQL de competencia real; los diagramas pendientes deben contrastarse con esta implementación. |
| 005 — Backend, IoC y ORM | [ADR-005-tif-spring-di-y-persistencia.md](adr/ADR-005-tif-spring-di-y-persistencia.md) | Spring Boot 4.1.1/Java 21; constructor/Clock; Spring Data JPA y SQL complementario. **Aceptado**. |
| 006 — Frontend, componentes y estado | [ADR-006-tif-react-componentes-y-estado.md](adr/ADR-006-tif-react-componentes-y-estado.md) | React, FitZoneUI propio, AuthContext, hooks y persistencia separada. Comparación histórica de estado/UI no acreditada. **Aceptado**. |
| 007 — Sincronización de terminal | [ADR-007-tif-replica-y-reconciliacion.md](adr/ADR-007-tif-replica-y-reconciliacion.md) | Copia firmada v2, Dexie/IndexedDB, UUID, inbox SQL, ACK y conflictos. **Aceptado**. |
| 008 — Pruebas, pirámide y umbral | Reservado: `ADR-008-tif-estrategia-pruebas.md` | **Pendiente**. Insumos: suites, reportes y brechas en [pruebas](pruebas.md); umbral grupal no acordado/verificado. Requiere integrar evidencia real M3/M4/M5 y definir pirámide/umbral; no derivarlo del porcentaje actual. |
| 009 — Despliegue, contenedores y reversión | Reservado: `ADR-009-tif-despliegue-y-reversion.md` | **Pendiente**. Compose sólo ejecuta PostgreSQL; Dockerfile construye backend. Falta despliegue integrado frontend/API, secretos persistentes, reversión y evidencia de entorno limpio. No hay pipeline versionado localizado en este corte. |
| 010 — Medios de pago/tokenización | Reservado: `ADR-010-tif-medios-de-pago.md` | **Pendiente**. Fake interno, referencias y PDF de membresías existentes; contrastar integración de reservas, ausencia de datos de tarjeta y alcance de tokenización con M5. No afirmar proveedor remoto ni tokenización real de tarjetas. |

### Preservación de los ADR históricos

[0007-actores-y-membresia.md](adr/0007-actores-y-membresia.md) queda **intacto**. Su ADR-007 es una serie histórica distinta: autoridades estables y condición comercial derivada, no reconciliación. En referencias nuevas se lo denomina **«ADR histórico H-0007 (archivo original 0007-actores-y-membresia.md)»**. El alias del índice no cambia su contenido, estado declarado ni identificador original.

Los ADR de Drive quedan en sus documentos originales y se citan por título/sección/URL. Esta tabla conserva las correspondencias sin moverlos, borrar sus duplicados de origen ni alterar sus estados históricos. Una futura decisión grupal puede archivar copias con prefijo histórico en una tarea separada; aquí no se importan documentos completos innecesarios.

| Referencia histórica | Correspondencia actual |
|---|---|
| Unidad I ADR-001 — Monolito modular | ADR-001 oficial; antecedente declara aceptación, no aislamiento comprobado. |
| Unidad I ADR-002 — PostgreSQL | ADR-002 oficial; motor fijado por la cátedra, sin comparativa de motores. |
| Drive ADR-003 — Spring Boot/JPA | ADR-005 oficial. |
| Drive ADR-004 — React | ADR-006 oficial; las fuentes no cerraban estado global/UI. |
| Drive ADR-005 — Flyway | Insumo de ADR-002 y ADR-005 oficiales, no el ADR-005 oficial por tema. |
| Drive ADR-006 / ADR-00X — JWT/Spring Security | Antecedente de seguridad; no equivale a ADR-006 oficial ni a la firma RS256 exclusiva de M2. |
| Unidad I ADR-00X — Concurrencia | Insumo para futuro ADR-004, requiere contraste M3/M4/M5. |
| Unidad I ADR-00X — Git/GitHub | Antecedente adicional, no se le asigna retroactivamente un número. |
| H-0007 local — Actores/membresía | Se conserva como decisión histórica adicional. |

## Inventario de diagramas y reutilización

En el árbol Git del corte funcional `d4ceaa3` y en las referencias `origin/*` disponibles al elaborar esta documentación no se localizaron fuentes C4/UML independientes ni una carpeta `docs/diagramas/` previa. [m2-offline.md](m2-offline.md) contiene un esquema Mermaid embebido: queda intacto y sirve de síntesis operativa, no se contabiliza como otro diagrama obligatorio con exportación.

Se accedió realmente a las dos carpetas de Drive indicadas y a sus documentos relevantes. Se descargaron y leyeron las imágenes C4 de contexto/contenedores y el XML Archi; el DOCX C4-3 fue recuperado como texto, sin inspeccionar su figura incrustada. No se afirma una revisión visual de esa figura.

| Antecedente Drive | Consulta y aprovechamiento |
|---|---|
| [C4 contexto PNG](https://drive.google.com/file/d/1Hpmy3RS51YXgQYgY0iSG3seSAl8lu6Uy/view) y [diagrama.archimate](https://drive.google.com/file/d/18ii9T5brf7McwKzEgRm5APL3Kd2RnjcL/view) | Imagen y fuente inspeccionadas: cuatro actores y relaciones conservadas conceptualmente, corregidas según capacidades reales. El modelo Archi sólo contiene contexto; usa asociaciones Archi, no flechas C4 dirigidas. La vista actual se migra a draw.io con tipos/relaciones explícitos. No se añade una copia paralela del histórico al repositorio. |
| [C4 contenedores PNG](https://drive.google.com/file/d/1NycfVCo0rN5529JbItt53aYIq8quvZTO/view) | Imagen inspeccionada: se reutiliza la descomposición frontend/API/PostgreSQL, agregando terminal y persistencia local reales. No se encontró su fuente editable en la carpeta consultada; haría falta recibirla si se desea conservar la edición original en Archi. |
| [C4 NIVEL 3.docx](https://docs.google.com/document/d/1vqBHYC_3TgRGiph4B1VeptCt6xAE5QYu/edit) | Texto leído: responsabilidades de M1–M5 y necesidad de terminal/caché/movimientos/sincronizador. La propuesta de aislamiento estricto no se atribuye al código actual. Para revisar visualmente su figura original faltaría inspeccionar el DOCX renderizado y disponer del modelo editable si existe. |
| [Unidad I — Arquitectura.docx](https://docs.google.com/document/d/1sgUz-_ovSKQPJSD3dFt6M5ycwiDxV6LK/edit) | Texto leído: ADR y descripciones C4; sustenta alternativas históricas de arquitectura, backend, React y Flyway. |
| [ADRs](https://docs.google.com/document/d/1q0KQEPx2GLgVTCo24nMkRuCKm-tUyrN_KnfwJTvSewA/edit) | Texto leído; se separan las numeraciones y estados de sus borradores. |
| [Definición de Módulos](https://docs.google.com/document/d/1ytZBV5KiQJK5Xw6L2fmeCIRmAZiVYkasMku0qHQXLFc/edit) | Texto leído; delimita responsabilidades y conserva preguntas/acuerdos, varios previos al M2 actual. |
| [Guía técnica y acuerdos semana 1](https://docs.google.com/document/d/1JJn9r6VbySSuWiNn6TGJiUk9Sb1nTCnzvDS7LQ34q-M/edit) | Texto leído; propuestas de concurrencia, esquema por módulo y OpenAPI. No se convierten sus ejemplos SQL en evidencia de migraciones ejecutadas. |

No se consultó ni reconstruyó el contenido de planificación ni se hicieron escrituras en Drive. No hubo archivos necesarios de esos antecedentes rechazados por permisos; las limitaciones son la figura C4-3 no revisada visualmente y fuentes editables no localizadas.

### Diagramas de esta etapa

Cada archivo `.drawio` es XML editable no comprimido y cada `.svg` es su representación vectorial correspondiente. Abrir el editable en diagrams.net/draw.io; exportar como SVG conservando el tamaño de página y la leyenda. No se añade ninguna dependencia de producción ni se requiere instalar una para leerlos. Fecha/versión/base constan en el pie; **autor nominal pendiente de revisión grupal**, sin atribuirlo a un integrante.

| Alcance | Fuente editable | Exportación |
|---|---|---|
| C4-1 — Contexto completo: capacidades actuales y previstas | [c4-01-contexto.drawio](diagramas/c4-01-contexto.drawio) | [SVG](diagramas/c4-01-contexto.svg) |
| C4-2 — Contenedores y operación desconectada | [c4-02-contenedores.drawio](diagramas/c4-02-contenedores.drawio) | [SVG](diagramas/c4-02-contenedores.svg) |
| C4-3 — Componentes del backend M2 | [c4-03-m2.drawio](diagramas/c4-03-m2.drawio) | [SVG](diagramas/c4-03-m2.svg) |
| UML — Acceso offline y reconciliación | [uml-secuencia-acceso-offline.drawio](diagramas/uml-secuencia-acceso-offline.drawio) | [SVG](diagramas/uml-secuencia-acceso-offline.svg) |

La secuencia es obligatoria en §5.3.2 de la versión de 25 páginas; no sustituye otra secuencia. Explicita que el socio puede obtener el lote con conexión propia después del corte de Recepción, siempre que el terminal conserve aprovisionamiento vigente. Si el socio también está desconectado, necesita ventanas previamente guardadas. La captura provisional, la cola durable, el ACK perdido y el reintento idempotente conservan su funcionamiento.

En C4-1 se muestran las responsabilidades de M1–M5 y los cuatro actores; Socio y Cliente corresponden a una autoridad técnica estable USUARIO con distinta condición comercial. Agenda, reservas y espera de clases están incorporadas en M3; asistencia y penalidades siguen pendientes y los avisos son simulados por log. La reserva de canchas sin membresía del cliente externo se identifica como capacidad prevista. La pasarela externa requerida figura como **integración prevista/no implementada**, con relación discontinua. `PasarelaPagoFake` sigue siendo interna al backend y no se representa como servicio remoto. Las relaciones actuales y futuras están rotuladas por separado; «actual» identifica código incorporado, no cumplimiento completo de requisitos.

C4-2 representa un solo frontend React con instancias en distintos navegadores/dispositivos. IndexedDB y Cache Storage son mecanismos locales del navegador, visualmente distintos de los contenedores principales. C4-3 descompone únicamente la API backend M2: frontend/terminal y PostgreSQL quedan fuera de su límite. El detalle JavaScript continúa descrito en ADR-003/007 y en la secuencia, sin generar una quinta vista ni nuevos procesos de despliegue.

### Inventario obligatorio restante

La tabla de §5.3 enumera 14 diagramas obligatorios: cuatro C4, siete UML y tres de datos/despliegue/integración. Esta etapa actualiza cuatro de esos catorce; los diez siguientes permanecen pendientes. **No se declara completo el inventario obligatorio.**

| Diagrama restante | Dependencias de cierre |
|---|---|
| C4-3 — Canchas/M4 | Servicio de reservas, PricingStrategy, repositorios y bloqueo reales; revisión M4/M5. |
| UML — Clases del dominio | M3 ya aporta entidades y Observer; falta elaborar el diagrama conjunto con multiplicidades y Strategy/Repository y contrastar M4/M5. |
| UML — Secuencia reserva de cancha con pago | Precio, retención, cobro y PDF de cancha implementados; M4/M5. |
| UML — Secuencia reserva concurrente | Bloqueo y respuesta del perdedor demostrados, garantía SQL RN-02; M4. |
| UML — Estados de membresía | Estados derivados, suspensión y disparadores actuales de M1; pendiente de elaboración, no de desarrollo en esta tarea. |
| UML — Estados de reserva | Ciclo real de clases/canchas, pagos/cancelación/penalidad; M3/M4/M5. |
| UML — Actividad lista de espera | Diagramar el Observer incorporado de M3, ofertas FIFO y avisos por log; validación funcional pendiente. No se crea en esta tarea. |
| DER físico | V1–V15 incorporadas, incluida la evolución de clases/ofertas de M3; contrastar futuras migraciones M4/M5. No confundir catálogo único de turnos con reserva única. |
| Despliegue | Compose completo, red, secretos, PWA y terminales; contraste con responsable de despliegue. C4-2 no lo sustituye. |
| Pipeline CI/CD | Etapas y entorno de pruebas reales; no se encontró configuración CI versionada en el corte. |

C4-4/PricingStrategy es opcional y permanece fuera de esta etapa.

## Evidencia de validación consultada

La revisión inicial inspeccionó código backend/frontend, Flyway V1–V14, entidades/repositorios, [OpenAPI](openapi/openapi.yaml), tests y documentos operativos [M2](m2-offline.md), [Recepción](m2-recepcion.md), [pruebas](pruebas.md) y el ADR histórico local en `d4ceaa3`. El cierre añade únicamente el contraste de las referencias afectadas por la incorporación de M3 en `5f71e61`.

### Incorporación de M3 y alcance de su evidencia

- [ClaseController](../src/main/java/com/fitzonesports/clase/controller/ClaseController.java), `ClaseService`, `ReservaClaseService` y `ListaEsperaService` incorporan agenda, administración por sede, reservas/cancelaciones y lista de espera con ofertas. El registro de asistencia continúa en 501; las penalidades siguen pendientes. No se describe M3 completo como stub ni se declaran RF-06/07/08 íntegramente acreditados.
- [PublicadorClase](../src/main/java/com/fitzonesports/clase/observer/PublicadorClase.java) publica eventos en el mismo proceso; [GestorListaEspera](../src/main/java/com/fitzonesports/clase/observer/GestorListaEspera.java) genera ofertas en orden de espera. [NotificadorClase](../src/main/java/com/fitzonesports/clase/observer/NotificadorClase.java) difiere avisos hasta después del commit y [NotificadorLog](../src/main/java/com/fitzonesports/clase/observer/NotificadorLog.java) los simula en el log, sin correo ni proveedor externo implementado. La existencia del patrón no prueba entrega externa de notificaciones.
- [V15](../src/main/resources/db/migration/V15__clases_grupales.sql) incorpora evolución de clases, reservas, espera y ofertas; [AgendaClases](../frontend/src/modules/m3-clases/AgendaClases.jsx) y [m3Service](../frontend/src/services/m3Service.js) incorporan las vistas y operaciones correspondientes. Los plazos existentes en `ReglasClase` y sus pendientes de acuerdo se conservan según [decisiones del contrato](openapi/DECISIONES.md), sin redefinirlos aquí.
- No se ejecutaron nuevas pruebas de negocio ni se acreditó una suite completa de M3. El cambio recibido en `MembresiaIntegrationTest` sustituye expectativas 501 por 404 para una clase inexistente; su código no acredita por sí solo cupos, concurrencia, ofertas, notificaciones ni el recorrido completo de M3. Los reportes siguientes corresponden al corte anterior y no se extrapolan al código incorporado.

Además de leer fuentes, se abrieron reportes **preexistentes**, ignorados por Git; no se ejecutaron nuevamente suites de negocio por este cambio documental:

- `target/test-runs/7f6c2d508d8d4f7dbadcf765e186ff68/surefire-reports/TEST-*.xml`: 15 suites, **101 tests, 0 fallos, 0 errores, 0 omitidos**. Incluye FirmaOfflineTest (2) y OfflineIntegrationTest (14). Es una ejecución anterior con Java 21/PostgreSQL aislado según el runner/documentación, no una ejecución de esta rama documental.
- `target/test-runs/7f6c2d508d8d4f7dbadcf765e186ff68/jacoco/jacoco.xml`: **1003/1145 líneas (87,60 %) y 462/644 ramas (71,74 %)**. No hay umbral grupal deducible de esos porcentajes ni cobertura JS medida. Los XML no contienen una certificación autónoma del SHA de código; su asociación al cierre QR automático está documentada en `pruebas.md`.
- `target/e2e-m2/6c80484a-2d95-41eb-afa6-7341af712749/resultado.json`: `aprobada=true`, Chrome real headless, registro del socio posterior al corte de Recepción, espera real de 65 s, reapertura offline, reinicio Spring con clave persistente, respuesta perdida y replay; **2 visitas, 4 eventos, 0 duplicados**. No demuestra ausencia global de doble presencia bajo partición ni SLA 99,5 %.
- `frontend/scripts/test-offline.mjs` y scripts VM: verifican firma, almacenamiento/transacciones y transporte con Node/fake-indexeddb; no son todos E2E React. Las seis suites y el build PWA tienen resultados históricos en `pruebas.md`, sin una nueva ejecución atribuida a este cierre.

Los reportes locales pueden desaparecer; el repositorio conserva pruebas, runners y referencias en documentación operativa para reproducirlos. No se versionan XML/capturas duplicados ni se transcriben tokens o secretos. La validación de esta tarea comprende enlaces, XML/SVG, correspondencia fuente/exportación, inspección visual, alcance exclusivamente documental y `git diff --check`.

## Contradicciones y puntos de revisión grupal

| Hallazgo | Tratamiento en esta base |
|---|---|
| Lineamientos 22 vs. 25 páginas | Se usa el PDF original de 25 páginas identificado por hash; diez ADR y secuencia offline obligatoria. |
| Numeraciones históricas incompatibles | Serie oficial `ADR-NNN-tif-`, alias H-0007 y correspondencias; originales preservados. |
| Propuesta manual/consentimiento por sede vs. QR automático actual | Se documenta automático multisede como principal; circuitos anteriores sólo como compatibilidad. |
| Propuesta de firmar en el móvil | No implementada: privada sólo en backend, móvil selecciona autorizaciones prefirmadas. |
| Pasarela externa REST en C4 históricos | El fake es un bean interno sin red; la pasarela externa se distingue como integración prevista/no implementada, pendiente de contraste M5. |
| Fronteras de módulo estrictas propuestas | El código incluye SQL cruzado y base compartida; modularidad parcial, no aislamiento certificado. |
| Esquema SQL por módulo propuesto en guía | Las migraciones reales usan tablas compartidas; no se representa un esquema `canchas_deportivas` inexistente. |
| Unicidad de turno vs. ausencia de sobreventa | V1 no garantiza una reserva ocupante por turno; ADR-004 y pruebas RN-02 pendientes. |
| RN-01 global vs. continuidad offline | La decisión técnica adoptada conserva la prevención local y conciliación posterior; no garantiza doble presencia global ausente durante partición. La resolución administrativa de conflictos permanece pendiente. |
| QR rotativo como prevención de capturas | Reduce ventana; no impide uso de capturas vigentes ni acredita identidad física. Revocación diferida. |
| Históricos de pruebas incompletos vs. M2 actual | Se usa la sección más reciente y se inspeccionan reportes; no se afirma que las brechas antiguas sigan todas abiertas. |
| Comentario de perfil obligatorio sin default vs. configuración | `spring.profiles.active` realmente tiene fallback `dev`; no se afirma fallo por ausencia de perfil ni se modifica la configuración. |

Los seis ADR de esta etapa quedan Aceptados como decisiones técnicas adoptadas, manteniendo deuda y limitaciones. Faltan identificar autores/sprints no acreditados, conservar explícita la falta de evidencia de ciertas comparaciones históricas (SOA/serverless y estado/UI), validar los pendientes y la evidencia integral del M3 incorporado, contrastar M4/M5 y completar los cuatro ADR y diez diagramas inventariados como pendientes. Los metadatos nominales de los diagramas tampoco se inventan. Este cierre parcial no completa el checklist global del TIF. La planificación y las bitácoras quedan fuera de esta tarea.
