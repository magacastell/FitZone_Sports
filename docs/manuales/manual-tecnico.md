# Manual técnico de FitZone Sports

**Trabajo Integrador Final de Programación V**  
**Versión del manual:** 0.1 · **Fecha:** 11/11/2026  
**Base verificada:** rama `docs/cierre-tif`, commit `b6323ac91ab5537fb543f073e24df1f4e0d9af1e`.

Este manual sigue el Anexo F de los Lineamientos de Entrega (p. 22). Describe cómo está construido el sistema y dónde revisar el comportamiento de cada módulo. En las tablas, **implementado** indica lógica localizada en el código, **parcial** indica que solo una parte del módulo está operativa y **pendiente** indica que el flujo aún no está implementado o acreditado. La revisión de código y la ejecución de pruebas son evidencias distintas.

## Índice

1. [Visión arquitectónica](#1-visión-arquitectónica)
2. [Módulos funcionales](#2-módulos-funcionales)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Patrones de diseño](#4-patrones-de-diseño)
5. [Concurrencia de reservas](#5-concurrencia-de-reservas)
6. [Arquitectura offline](#6-arquitectura-offline)
7. [Guía de extensión](#7-guía-de-extensión)
8. [Pruebas](#8-pruebas)
9. [Pipeline CI/CD](#9-pipeline-cicd)
10. [Convenciones de desarrollo](#10-convenciones-de-desarrollo)

## 1. Visión arquitectónica

El navegador ejecuta un frontend React con vistas para clientes, socios, Recepción y Gerencia. La API REST es un único proceso Spring Boot con paquetes por dominio. PostgreSQL concentra los datos de las sedes. La operación offline añade una copia acotada y una cola en el navegador de Recepción. El mismo frontend ofrece el QR del socio y el terminal PWA.

El [ADR-001](../adr/ADR-001-tif-monolito-modular.md) justifica el monolito modular por el tamaño del equipo, la operación de un único backend y la necesidad de coordinar transacciones en una base relacional. El alta de membresía, el registro del cobro simulado y la persistencia del período ilustran esa coordinación. Los paquetes ayudan a ubicar responsabilidades, pero existen dependencias entre módulos y SQL sobre tablas compartidas. Una extracción a servicios separados exigiría definir contratos, fallos parciales y mecanismos de coordinación.

| Capa | Tecnologías y configuración |
| --- | --- |
| Backend | Java 21, Spring Boot 4.1.1, Maven Wrapper, Spring MVC, Spring Security, JJWT y PDFBox. La [configuración Spring](../../src/main/resources/application.properties) fija `/api/v1` y puerto 3000 por defecto. |
| Seguridad | La [cadena de seguridad](../../src/main/java/com/fitzonesports/auth/security/SecurityConfig.java) aplica JWT sin sesión de servidor, BCrypt y autorización de métodos. `USUARIO` es la autoridad de cliente y socio. La vigencia de la membresía habilita operaciones comerciales específicas. |
| Datos | PostgreSQL 18 en [Compose](../../docker-compose.yml), Flyway, Spring Data JPA y SQL con `JdbcTemplate`. |
| Frontend | React 18, React Router 6 y Vite 5. La PWA usa Dexie/IndexedDB, jose y Workbox. Las versiones se declaran en [package.json](../../frontend/package.json) y se fijan en [package-lock.json](../../frontend/package-lock.json). |
| Contrato | [OpenAPI 3.0.3](../openapi/openapi.yaml) y [decisiones del contrato](../openapi/DECISIONES.md). Consultar tanto `x-implementation-status` como el controlador. `stub` identifica una operación prevista cuya ruta puede responder `501`. |

### Diagramas disponibles

| Vista | Fuente | Exportación o notas |
| --- | --- | --- |
| C4 nivel 1 · Contexto | [draw.io](../diagramas/c4-01-contexto.drawio) | [SVG](../diagramas/c4-01-contexto.svg) |
| C4 nivel 2 · Contenedores | [draw.io](../diagramas/c4-02-contenedores.drawio) | [SVG](../diagramas/c4-02-contenedores.svg) |
| C4 nivel 3 · Acceso | [draw.io](../diagramas/c4-03-m2.drawio) | [SVG](../diagramas/c4-03-m2.svg) |
| C4 nivel 3 · Canchas | [draw.io](../diagramas/c4-03-canchas.drawio) | [SVG](../diagramas/c4-03-canchas.svg) |
| UML · Secuencia de acceso offline | [draw.io](../diagramas/uml-secuencia-acceso-offline.drawio) | [SVG](../diagramas/uml-secuencia-acceso-offline.svg) |
| UML · Estados de membresía | [draw.io](../diagramas/uml-estados-membresia.drawio) | [SVG](../diagramas/uml-estados-membresia.svg) · [notas](../diagramas/uml-estados-membresia.md) |
| UML · Actividad de lista de espera | [draw.io](../diagramas/uml-actividad-lista-espera.drawio) | [SVG](../diagramas/uml-actividad-lista-espera.svg) · [notas](../diagramas/uml-actividad-lista-espera.md) |

El C4 de contexto marca como prevista la integración con una pasarela externa. El adaptador simulado de M5 corre dentro del backend. El [índice de arquitectura](../arquitectura-tif.md) registra las vistas disponibles y los diagramas pendientes.

### Índice de ADR

| ADR oficial | Decisión o estado |
| --- | --- |
| [001](../adr/ADR-001-tif-monolito-modular.md) | Monolito modular. Aceptado. |
| [002](../adr/ADR-002-tif-postgresql-e-integridad.md) | PostgreSQL e integridad transaccional. Aceptado. |
| [003](../adr/ADR-003-tif-validacion-qr-offline.md) | Validación de QR offline. Aceptado. |
| [004](../adr/ADR-004-tif-concurrencia-canchas.md) | Concurrencia de reservas de canchas. Aceptado. |
| [005](../adr/ADR-005-tif-spring-di-y-persistencia.md) | Spring, inyección de dependencias y persistencia híbrida. Aceptado. |
| [006](../adr/ADR-006-tif-react-componentes-y-estado.md) | React, componentes y gestión de estado. Aceptado. |
| [007](../adr/ADR-007-tif-replica-y-reconciliacion.md) | Copia local y reconciliación del terminal. Aceptado. |
| [008](../adr/ADR-008-tif-estrategia-pruebas.md) | Estrategia de pruebas y cobertura. **Propuesto**. Pirámide, umbral y criterios de ejecución pendientes de aprobación. |
| 009 | Despliegue y reversión. Pendiente de estrategia y procedimiento comprobado. |
| 010 | Medios de pago y tokenización. Pendiente del alcance final de M5. |

El [ADR histórico de actores y membresía](../adr/0007-actores-y-membresia.md) registra la separación de autoridad y condición comercial. Es un registro adicional con numeración histórica.

## 2. Módulos funcionales

Las rutas de API de esta sección son relativas a `/api/v1`. El punto de entrada de navegación es [AppRoutes.jsx](../../frontend/src/routes/AppRoutes.jsx). Los servicios del navegador usan el [cliente HTTP común](../../frontend/src/services/api.js). Las reglas de autorización efectivas se aplican en el backend.

### M1 · Usuarios y membresías

**Implementado en el corte.** Los paquetes `auth`, `usuario` y `membresia` gestionan acceso al sistema, perfil, planes y vigencia. El catálogo de sedes se comparte mediante `sede`. [UsuarioService](../../src/main/java/com/fitzonesports/usuario/service/UsuarioService.java) y [FotoPerfilService](../../src/main/java/com/fitzonesports/usuario/service/FotoPerfilService.java) atienden identidad y foto. [PlanService](../../src/main/java/com/fitzonesports/membresia/service/PlanService.java) administra planes. [MembresiaService](../../src/main/java/com/fitzonesports/membresia/service/MembresiaService.java) contrata, renueva y recalcula vigencia, con cobro de M5 en la misma transacción. [RenovacionAutomaticaJob](../../src/main/java/com/fitzonesports/membresia/service/RenovacionAutomaticaJob.java) actualiza vencimientos y procesa cuentas habilitadas.

| Operación | Entradas comprobadas |
| --- | --- |
| Identidad y perfil | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /usuarios/me` y `GET/PUT /usuarios/me/foto`. [AuthController](../../src/main/java/com/fitzonesports/auth/controller/AuthController.java) · [UsuarioController](../../src/main/java/com/fitzonesports/usuario/controller/UsuarioController.java) |
| Administración de usuarios | `GET /usuarios`, `GET /usuarios/{usuarioId}` y `PATCH /usuarios/{usuarioId}`, para Recepción y Gerencia según los permisos aplicados por el servicio. [UsuarioController](../../src/main/java/com/fitzonesports/usuario/controller/UsuarioController.java) |
| Planes y sedes | `GET/POST /planes`, `PATCH/DELETE /planes/{planId}`, `GET/POST /sedes` y `PATCH /sedes/{sedeId}`, con permisos según operación. [PlanController](../../src/main/java/com/fitzonesports/membresia/controller/PlanController.java) · [SedeController](../../src/main/java/com/fitzonesports/sede/controller/SedeController.java) |
| Membresías | `GET /membresias/me`, `GET /membresias/{membresiaId}` para Recepción y Gerencia, `POST /membresias`, `POST /membresias/{membresiaId}/renovaciones`, `PATCH /membresias/{membresiaId}/estado` y `PUT /membresias/{membresiaId}/renovacion-automatica`. El arrepentimiento actúa mediante `POST /membresias/{membresiaId}/periodos/{periodoId}/cancelacion`. [MembresiaController](../../src/main/java/com/fitzonesports/membresia/controller/MembresiaController.java) |

La cuenta está `ACTIVA` con un período no cancelado cuyo inicio es inclusivo y fin exclusivo. La suspensión prevalece y conserva el calendario de vigencia. Una renovación anticipada agrega el siguiente período. El alta y la renovación manual usan `Idempotency-Key`. El frontend presenta cuenta y períodos en [MembresiaUsuario.jsx](../../frontend/src/modules/m1-usuarios/MembresiaUsuario.jsx) y llama a la API desde [m1Service.js](../../frontend/src/services/m1Service.js). Véanse las [reglas de membresía](../membresias.md) y el [UML de estados](../diagramas/uml-estados-membresia.md).

### M2 · Gimnasio y acceso

**Implementado para emisión, validación, ingresos, egresos, aforo y sincronización.** El paquete `acceso` consulta al usuario, su sede y su vigencia comercial. [AccesoService](../../src/main/java/com/fitzonesports/acceso/service/AccesoService.java) maneja el flujo central. [OfflineController](../../src/main/java/com/fitzonesports/acceso/offline/OfflineController.java) delega emisión, aprovisionamiento y reconciliación a los servicios descritos en [arquitectura offline](#6-arquitectura-offline). En React intervienen [ControlAccesoSede.jsx](../../frontend/src/modules/m2-acceso/ControlAccesoSede.jsx), [TerminalOffline.jsx](../../frontend/src/modules/m2-acceso/TerminalOffline.jsx) y [SocioQRModal.jsx](../../frontend/src/modules/m2-acceso/SocioQRModal.jsx).

- **En línea.** `GET /accesos/qr`, `POST /accesos/ingresos`, `POST /accesos/salidas` y `GET /accesos/sedes/{sedeId}/aforo`. [AccesoController](../../src/main/java/com/fitzonesports/acceso/controller/AccesoController.java)
- **Offline.** Bajo `/accesos/offline` hay `POST /credenciales/automaticas`, `POST /preparacion`, `POST /sincronizacion`, `GET /conexion` y la ruta de compatibilidad `POST /credenciales`.
- **Pendiente.** `GET /accesos` y `PATCH /accesos/{accesoId}` devuelven `501`. El aforo es informativo y, durante desconexión, provisional. La unicidad central de presencia no puede garantizar admisiones simultáneas en terminales aislados.

### M3 · Clases grupales

**Implementado para agenda, reservas y ofertas.** En `clase`, [ClaseService](../../src/main/java/com/fitzonesports/clase/service/ClaseService.java) administra agenda por sede. [CatalogoClaseService](../../src/main/java/com/fitzonesports/clase/service/CatalogoClaseService.java) maneja tipos e instructores. [ReservaClaseService](../../src/main/java/com/fitzonesports/clase/service/ReservaClaseService.java) controla reserva, cancelación, solapamiento y cupo. [ListaEsperaService](../../src/main/java/com/fitzonesports/clase/service/ListaEsperaService.java) administra inscripción, respuesta y vencimiento. El controlador consulta M1 para la elegibilidad del socio y los servicios usan repositorios de clases, reservas e inscripciones. [AgendaClases.jsx](../../frontend/src/modules/m3-clases/AgendaClases.jsx) usa [m3Service.js](../../frontend/src/services/m3Service.js).

- **Agenda y catálogos.** `GET/POST /clases`, `PATCH /clases/{claseId}`, `POST /clases/{claseId}/cancelacion`, `GET/POST /instructores` y `GET/POST /tipos-clase`.
- **Reservas y espera.** `GET /clases/me`, `GET/POST /clases/{claseId}/reservas`, `DELETE /clases/{claseId}/reservas/{reservaId}`, `POST /clases/{claseId}/lista-espera`, `DELETE /clases/{claseId}/lista-espera/me` y `POST /clases/{claseId}/ofertas/{ofertaId}/respuesta`. El [controlador](../../src/main/java/com/fitzonesports/clase/controller/ClaseController.java) define los permisos.
- **Parcial o pendiente.** La oferta persiste y se consulta en «Mis clases». El aviso externo se simula en log. El registro de asistencia devuelve `501` y la cancelación tardía queda registrada sin cálculo de penalidad. El código cierra reservas y espera en `inicio − 48 h` inclusive. El plazo y el canal de aviso deben cotejarse con el criterio de evaluación. [ReglasClase](../../src/main/java/com/fitzonesports/clase/service/ReglasClase.java) · [UML de lista de espera](../diagramas/uml-actividad-lista-espera.md)

### M4 · Canchas deportivas

**Implementado.** [CanchaService](../../src/main/java/com/fitzonesports/reserva/service/CanchaService.java) administra los recursos, calcula disponibilidad y resuelve el precio del turno con la vigencia de M1. [ReservaCanchaService](../../src/main/java/com/fitzonesports/reserva/service/ReservaCanchaService.java) retiene el turno, coordina el pago con M5 y aplica la política de cancelación. [GrillaCanchas.jsx](../../frontend/src/modules/m4-canchas/GrillaCanchas.jsx) muestra el importe de la API y confirma el pago dentro del modal. La administración comprueba el alcance por sede. [Mapa de endpoints y guía](../integracion-canchas-pagos.md)

### M5 · Pagos y facturación

**Implementado con pasarela simulada.** [PagoController](../../src/main/java/com/fitzonesports/pago/controller/PagoController.java) expone el cobro de reservas de cancha, consulta de pagos, comprobantes y reembolsos. [PagoCanchaService](../../src/main/java/com/fitzonesports/pago/service/PagoCanchaService.java) cobra el importe fijado por M4. [CobroMembresiaService](../../src/main/java/com/fitzonesports/pago/service/CobroMembresiaService.java) conserva el circuito de M1. [ComprobanteService](../../src/main/java/com/fitzonesports/pago/service/ComprobanteService.java) genera el PDF de cada concepto. [HistorialPagos.jsx](../../frontend/src/modules/m5-pagos/HistorialPagos.jsx) consume el historial del titular y descarga el PDF por identificador de pago. El adaptador simulado maneja referencias y el flujo de tarjetas reales sigue fuera de alcance.

## 3. Modelo de datos

Flyway administra el esquema y Hibernate valida su correspondencia al arrancar. El [perfil dev](../../src/main/resources/application-dev.properties) agrega la ubicación `db/demo` y aplica V17 de demostración una sola vez. Staging y producción usan las migraciones comunes V1–V16. La regla del repositorio es agregar una migración nueva para cada cambio y preservar las ya aplicadas. Conviven entidades JPA, repositorios Spring Data y consultas SQL explícitas. La [decisión de persistencia](../adr/ADR-005-tif-spring-di-y-persistencia.md) y el [README](../../README.md) explican ese criterio.

| Dominio | Relaciones y garantías del esquema |
| --- | --- |
| Usuarios y membresías | `usuario` referencia un rol y puede adquirir sede habitual en el alta comercial. DNI y correo son únicos. Hay una membresía por usuario y múltiples períodos con plan, precio y fechas de cada contratación. [Usuario](../../src/main/java/com/fitzonesports/usuario/model/Usuario.java) · [Membresia](../../src/main/java/com/fitzonesports/membresia/model/Membresia.java) · [PeriodoMembresia](../../src/main/java/com/fitzonesports/membresia/model/PeriodoMembresia.java) |
| Acceso | `registro_acceso` vincula usuario y sede. Un índice parcial limita a una visita abierta central por usuario. El circuito offline persiste terminal, revisiones y eventos recibidos; el identificador de QR también se controla en el registro central. [RegistroAcceso](../../src/main/java/com/fitzonesports/acceso/model/RegistroAcceso.java) · [RegistroAccesoRepository](../../src/main/java/com/fitzonesports/acceso/repository/RegistroAccesoRepository.java) |
| Clases | Cada clase referencia sede, tipo e instructor. Reserva, inscripción y oferta se vinculan a clase y usuario. V15 garantiza unicidad de reserva confirmada por usuario/clase, posición de espera por clase, inscripción activa por usuario/clase y oferta pendiente por inscripción. [ClaseGrupal](../../src/main/java/com/fitzonesports/clase/model/ClaseGrupal.java) · [ReservaClase](../../src/main/java/com/fitzonesports/clase/model/ReservaClase.java) · [OfertaClase](../../src/main/java/com/fitzonesports/clase/model/OfertaClase.java) |
| Canchas | `cancha` referencia `sede` y `tipo_cancha`. `reserva_cancha` referencia turno y usuario, guarda el importe aplicado y permite una sola reserva ocupante por turno. [V16](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql) |
| Pagos | `pago` registra titular, importe y referencia comercial. V5 agrega idempotencia de pago y vínculo del período al cobro. V6 agrega unicidad por pago de comprobante y reembolso. Estos flujos emplean `JdbcTemplate`. [CobroMembresiaService](../../src/main/java/com/fitzonesports/pago/service/CobroMembresiaService.java) · [ComprobanteService](../../src/main/java/com/fitzonesports/pago/service/ComprobanteService.java) |

### Migraciones versionadas

| Migraciones | Alcance |
| --- | --- |
| [V1](../../src/main/resources/db/migration/V1__crear_esquema_inicial.sql) · [V2](../../src/main/resources/db/migration/V2__insertar_roles.sql) | Esquema inicial y roles base. |
| [V3](../../src/main/resources/db/migration/V3__planes_membresia.sql) · [V4](../../src/main/resources/db/migration/V4__qr_y_accesos_abiertos.sql) | Reglas de planes y unicidad de QR/acceso abierto. |
| [V5](../../src/main/resources/db/migration/V5__membresias_y_periodos.sql) · [V6](../../src/main/resources/db/migration/V6__comprobantes_y_reembolsos.sql) | Períodos, auditoría de membresía, idempotencia, PDF y reembolsos. |
| [V7](../../src/main/resources/db/migration/V7__autoridad_usuario_estable.sql) · [V8](../../src/main/resources/db/migration/V8__sede_habitual_en_contratacion.sql) · [V9](../../src/main/resources/db/migration/V9__contexto_funciones_sede.sql) · [V10](../../src/main/resources/db/migration/V10__foto_perfil_persistente.sql) | Autoridad estable, sede habitual, contexto de sede y almacenamiento de foto. |
| [V11](../../src/main/resources/db/migration/V11__credenciales_m2_offline.sql) · [V12](../../src/main/resources/db/migration/V12__terminal_y_copia_m2.sql) · [V13](../../src/main/resources/db/migration/V13__reconciliacion_m2_offline.sql) · [V14](../../src/main/resources/db/migration/V14__uso_qr_multisede.sql) | Credenciales de compatibilidad, terminal y copia, reconciliación y unicidad de uso del QR. |
| [V15](../../src/main/resources/db/migration/V15__clases_grupales.sql) | Clases, reservas, espera, ofertas e índices correspondientes. |
| [V16](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql) | Tarifas, ocupación, mantenimiento y vinculación entre pagos y reservas de canchas. |
| [V17](../../src/main/resources/db/demo/V17__datos_demostracion.sql) | Datos de demostración versionados, exclusivos de `dev`. |

## 4. Patrones de diseño

| Patrón | Problema, participantes y límites |
| --- | --- |
| **Strategy · implementado en M4** | [PricingStrategy](../../src/main/java/com/fitzonesports/reserva/pricing/PricingStrategy.java) permite seleccionar tarifa estándar o de socio. [PrecioSocioStrategy](../../src/main/java/com/fitzonesports/reserva/pricing/PrecioSocioStrategy.java) aplica el 15 % a la tarifa con el recargo pico correspondiente. M4 consulta la vigencia de M1 para elegir estrategia (RF-11 y RN-03). |
| **Observer · implementado en M3** | [PublicadorClase](../../src/main/java/com/fitzonesports/clase/observer/PublicadorClase.java) distribuye eventos a [ObservadorClase](../../src/main/java/com/fitzonesports/clase/observer/ObservadorClase.java). [GestorListaEspera](../../src/main/java/com/fitzonesports/clase/observer/GestorListaEspera.java) responde a `CupoLiberado`, selecciona por posición FIFO y emite `OfertaGenerada`. [NotificadorClase](../../src/main/java/com/fitzonesports/clase/observer/NotificadorClase.java) prepara el aviso después del commit. La asignación dentro de la misma transacción conserva el cupo y desacopla a quien lo libera de quien lo ofrece. El despacho es síncrono y local al proceso, sin broker ni entrega durable de avisos. |
| **Repository · implementado** | [MembresiaRepository](../../src/main/java/com/fitzonesports/membresia/repository/MembresiaRepository.java), [PeriodoMembresiaRepository](../../src/main/java/com/fitzonesports/membresia/repository/PeriodoMembresiaRepository.java) y [ReservaClaseRepository](../../src/main/java/com/fitzonesports/clase/repository/ReservaClaseRepository.java) encapsulan consultas de dominio sobre JPA. Reducen SQL en servicios, aunque el esquema compartido, JPQL y consultas específicas conservan dependencia de la persistencia. |
| **Adapter · implementado** | [PasarelaPagoFake](../../src/main/java/com/fitzonesports/pago/pasarela/PasarelaPagoFake.java) implementa [PasarelaPago](../../src/main/java/com/fitzonesports/pago/pasarela/PasarelaPago.java) y se selecciona mediante configuración. [NotificadorLog](../../src/main/java/com/fitzonesports/clase/observer/NotificadorLog.java) implementa [Notificador](../../src/main/java/com/fitzonesports/clase/observer/Notificador.java). Ambos puertos permiten cambiar el adaptador sin alterar el caso de uso. Los adaptadores actuales simulan efectos y no acreditan integración externa. |
| **Builder · implementado** | [UsuarioService](../../src/main/java/com/fitzonesports/usuario/service/UsuarioService.java) y [AccesoService](../../src/main/java/com/fitzonesports/acceso/service/AccesoService.java) construyen `Usuario` y `RegistroAcceso` mediante sus builders. El código de construcción nombra los atributos y facilita leer el alta. Las reglas se siguen aplicando en servicio y base de datos. |

## 5. Concurrencia de reservas

**RN-02 · canchas.** La reserva serializa escrituras por cancha usando [bloqueo pesimista JPA](../../src/main/java/com/fitzonesports/reserva/repository/CanchaRepository.java). El índice único parcial de [V16](../../src/main/resources/db/migration/V16__canchas_reservas_y_pagos.sql) garantiza una sola ocupación por turno. El perdedor recibe un conflicto y el frontend recarga la grilla. [ADR-004](../adr/ADR-004-tif-concurrencia-canchas.md) · [Prueba concurrente](../../src/test/java/com/fitzonesports/reserva/CanchasIntegrationTest.java) · [UML](../diagramas/uml-secuencia-reserva-concurrente.md)

**Cupo de clases.** Es un caso implementado con una garantía diferente. [ClaseGrupalRepository](../../src/main/java/com/fitzonesports/clase/repository/ClaseGrupalRepository.java) toma un bloqueo pesimista de la fila de la clase. [ReservaClaseService](../../src/main/java/com/fitzonesports/clase/service/ReservaClaseService.java) comprueba duplicado, espera activa y solapamiento bajo bloqueo de usuario y cuenta cupos en la misma transacción. [CuposClase](../../src/main/java/com/fitzonesports/clase/service/CuposClase.java) suma reservas confirmadas y ofertas pendientes. [V15](../../src/main/resources/db/migration/V15__clases_grupales.sql) impide duplicados por usuario/clase y respalda las unicidades de espera y oferta. El límite total se aplica en servicio bajo el bloqueo. Se localizaron comprobaciones de elegibilidad en [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java). Falta una prueba de concurrencia de M3 que ejercite dos solicitudes por el último cupo y compruebe la persistencia final.

## 6. Arquitectura offline

La secuencia de acceso offline sigue el [UML](../diagramas/uml-secuencia-acceso-offline.svg), los ADR [003](../adr/ADR-003-tif-validacion-qr-offline.md) y [007](../adr/ADR-007-tif-replica-y-reconciliacion.md) y la [guía operativa M2](../m2-offline.md).

1. **Emisión y rotación.** [AutorizacionQrService](../../src/main/java/com/fitzonesports/acceso/offline/AutorizacionQrService.java) emite autorizaciones RS256 multisede en ventanas de hasta 60 segundos, acotadas a períodos de vigencia y a un horizonte de hasta dos horas. El portal selecciona la ventana vigente de un lote prefirmado. El terminal puede estar sin red mientras el socio obtiene el lote por su propia conexión. Si el socio también está desconectado, necesita un lote previo vigente. [QrTokenService](../../src/main/java/com/fitzonesports/acceso/service/QrTokenService.java) atiende el circuito de QR online legado.
2. **Aprovisionamiento y confianza.** [TerminalOfflineService](../../src/main/java/com/fitzonesports/acceso/offline/TerminalOfflineService.java) registra terminal y operador autorizado por sede y prepara una copia firmada de hasta dos horas. [FirmaOffline](../../src/main/java/com/fitzonesports/acceso/offline/FirmaOffline.java) mantiene la firma en backend. La clave privada se configura para sobrevivir a reinicios; en el navegador se conserva la clave pública de confianza obtenida durante el aprovisionamiento.
3. **Validación local y registro provisional.** [crypto.js](../../frontend/src/services/offline/crypto.js) verifica firma, clave, audiencia, tipo y ventanas de tiempo. [movimientos.js](../../frontend/src/services/offline/movimientos.js) aplica la información disponible de sede, permisos, bloqueo y presencia. Una transacción de [db.js](../../frontend/src/services/offline/db.js) registra presencia local y movimiento con UUID estable. Workbox precachea recursos estáticos de la aplicación mediante [sw.js](../../frontend/src/sw.js). El service worker no sustituye la réplica de datos en IndexedDB.
4. **Reconexión.** [sync.js](../../frontend/src/services/offline/sync.js) envía hasta 100 movimientos por lote con la sesión del operador. [SincronizacionOfflineService](../../src/main/java/com/fitzonesports/acceso/offline/SincronizacionOfflineService.java) valida la evidencia de captura, serializa por terminal y reconcilia visitas e intervalos en PostgreSQL. Al reenviar el mismo UUID con el mismo contenido, el servidor devuelve el resultado almacenado si ya es definitivo. Los eventos `RECIBIDO` o `EN_ESPERA` se vuelven a evaluar con los movimientos disponibles y pueden cambiar de estado. Reutilizar el UUID con contenido diferente genera un conflicto y conserva el evento original. Si falta un acuse válido, el cliente mantiene el movimiento como `PENDIENTE` para reintentar.
5. **Resultado.** El cliente aplica `CONFIRMADO`, `CONFLICTO` o `RECHAZADO` según la respuesta central. Una respuesta `EN_ESPERA` mantiene el movimiento como `PENDIENTE` en el cliente, por ejemplo cuando el servidor recibió un egreso antes de su ingreso. La reconciliación preserva evidencia de solapamientos entre sedes y rechaza reutilizaciones de QR según lo conocido en el registro central.

**Límites conocidos.** Un terminal principal y un operador autorizado por sede en el circuito actual. La copia caduca y el aforo offline es provisional. Una revocación central puede demorar en reflejarse. Dos sedes aisladas pueden tomar admisiones provisionales incompatibles que recién se detecten al reconciliar. La política operativa de resolución de esos conflictos sigue pendiente. La continuidad demostrable del circuito offline y la medición de disponibilidad del 99,5 % son verificaciones distintas. Tampoco está acreditada una garantía global de RN-01 durante una partición.

## 7. Guía de extensión

Los dos casos siguientes son propuestas de extensión sobre el contrato vigente de M4/M5.

### 7.1 Caso 1 incorporar canchas de tenis

**Escenario.** Gerencia habilita una cancha de tenis en una sede existente. El socio ve la disponibilidad y reserva con la misma operación que una cancha de pádel. El tipo se resuelve en el catálogo del servidor.

1. **Datos y API.** Usar el catálogo de tipos administrado por Gerencia y `POST /canchas` para crear el recurso en su sede. Mantener el contrato de [CanchaController](../../src/main/java/com/fitzonesports/reserva/controller/CanchaController.java). Si tenis exige una duración distinta, primero confirmar esa regla y los solapamientos.
2. **Frontend.** Reutilizar [m4Service.js](../../frontend/src/services/m4Service.js) y la grilla existente. La reserva envía la identidad del turno y presenta el importe del servidor.
3. **Criterios de aceptación.** La cancha aparece en su sede, una operación fuera del alcance del actor se rechaza y el mantenimiento respeta ocupaciones previas. Reservar y pagar debe producir el comprobante de la cancha y el horario elegidos.

### 7.2 Caso 2 incorporar una estrategia de precio

**Escenario.** El equipo incorpora una tarifa promocional de tenis para horarios valle. La elegibilidad, las franjas y los valores se acuerdan en el contrato de M4. Un turno fuera de la promoción conserva su tarifa aplicable.

1. **Contrato de cálculo.** Reutilizar `PricingStrategy` y resolver en el servidor la elegibilidad y los bordes horarios de la promoción. Conservar `BigDecimal`, la moneda y el redondeo del flujo.
2. **Selección de estrategia.** Inyectar las variantes en un servicio de precios y definir una política de selección explícita y determinista. Documentar si la promoción se combina con el descuento de socio o el recargo pico, cómo se resuelve una coincidencia múltiple y cuál es la tarifa por defecto. Añadir una estrategia de promoción con su propio criterio de aplicabilidad. El controlador y la vista consumen el resultado del servicio.
3. **Integración.** Fijar el importe al retener, como en el circuito vigente. M5 cobra el importe persistido y emite el comprobante de ese pago, aunque la tarifa de la cancha cambie después.
4. **Criterios de aceptación propuestos.** Probar tarifa base, promoción elegible y fuera de franja, socio vigente y vencido, límites de horario pico y precedencia de políticas. En integración, comprobar que la API, el importe persistido, el cobro y el comprobante coinciden, incluso si la tarifa cambia después de reservar.

## 8. Pruebas

| Nivel | Herramientas y ejemplos del repositorio |
| --- | --- |
| Backend unitario y capa web | JUnit 5, Spring Test/MockMvc y Maven Surefire. Ejemplos en [PlanServiceTest](../../src/test/java/com/fitzonesports/membresia/PlanServiceTest.java), [PlanControllerTest](../../src/test/java/com/fitzonesports/membresia/PlanControllerTest.java) y [ComprobantePdfRendererTest](../../src/test/java/com/fitzonesports/pago/ComprobantePdfRendererTest.java). |
| Integración backend | PostgreSQL aislado y Flyway. [MembresiaIntegrationTest](../../src/test/java/com/fitzonesports/membresia/MembresiaIntegrationTest.java), [OfflineIntegrationTest](../../src/test/java/com/fitzonesports/acceso/OfflineIntegrationTest.java), [PagosIntegrationTest](../../src/test/java/com/fitzonesports/pago/PagosIntegrationTest.java) y [OpenApiMembresiaContractTest](../../src/test/java/com/fitzonesports/membresia/OpenApiMembresiaContractTest.java) dan puntos de entrada para vigencia, sincronización, comprobantes y contrato. |
| Frontend | `npm test` encadena seis scripts para API, dominio, planes, actividades, gerencia y offline. [test-offline.mjs](../../frontend/scripts/test-offline.mjs) usa Node y fake-indexeddb. El listado ejecutable está en [package.json](../../frontend/package.json). |
| E2E | [e2e-m2-offline.mjs](../../frontend/scripts/e2e-m2-offline.mjs) usa Playwright con Chrome, backend Spring y PostgreSQL. El escenario está preparado para ejercitar aprovisionamiento, corte, persistencia local, reconexión y repetición tras pérdida del acuse. |

### Ejecución local

Desde la raíz, con Docker disponible, [el runner backend](../../scripts/pruebas-backend.ps1) prepara PostgreSQL 18 descartable, ejecuta Maven `clean verify` y recoge los reportes. Para Maven nativo se necesita Java 21. Las pruebas de integración con PostgreSQL requieren `PLAN_TEST_DB_URL` a una base vacía y descartable. Sin esa variable pueden omitirse. Consultar los parámetros y la zona horaria en [docs/pruebas.md](../pruebas.md).

~~~powershell
./scripts/pruebas-backend.ps1
# Alternativa local con JDK 21 y la base de prueba configurada
.\mvnw.cmd clean verify
~~~

Desde `frontend/`, con Node y npm:

~~~powershell
npm ci
npm test
npm run build
~~~

Para el E2E, ejecutar `./scripts/prueba-m2-offline.ps1` desde la raíz con dependencias del frontend instaladas, Docker, Chrome y la imagen `fitzone-tests:local` generada por el runner backend. El [runner E2E](../../scripts/prueba-m2-offline.ps1) construye la PWA y usa perfiles de navegador de prueba.

### Evidencia y lectura de cobertura

El [POM](../../pom.xml) configura JaCoCo. El runner copia Surefire y JaCoCo a `target/test-runs/<id>/`. Revisar primero cantidad de pruebas, errores, fallos y omitidas. En JaCoCo, comparar las líneas y ramas cubiertas con sus totales por paquete, registrando el commit y el alcance del run. El E2E deja `resultado.json` en `target/e2e-m2/<id>/`. Antes de usarlo como evidencia, comprobar el resultado y asociarlo al SHA probado.

[El historial de pruebas](../pruebas.md) registra la evidencia de concurrencia M4 y la ejecución en Chrome con Spring/PostgreSQL para la reserva, el pago y el PDF. Queda pendiente acordar el umbral de ADR-008 y ejecutar la validación sobre el corte final de entrega.

## 9. Pipeline CI/CD

| Elemento comprobado | Alcance |
| --- | --- |
| [Dockerfile](../../Dockerfile) | Construye el JAR en una etapa Java 21 JDK y lo copia a una imagen final Java 21 JRE. El build empaqueta con `-DskipTests`. |
| [docker-compose.yml](../../docker-compose.yml) | Levanta PostgreSQL 18, la API Spring en perfil dev y Nginx con la PWA. El proxy reenvía `/api/` a la API. Ver el [diagrama de despliegue](../diagramas/despliegue.svg). |
| [POM](../../pom.xml) y [runner backend](../../scripts/pruebas-backend.ps1) | Ejecutan pruebas y generan reportes localmente. |
| [package.json](../../frontend/package.json) y [build-pwa.mjs](../../frontend/scripts/build-pwa.mjs) | Ejecutan pruebas JS y generan el frontend y su service worker. |
| [runner E2E](../../scripts/prueba-m2-offline.ps1) | Orquesta localmente el recorrido offline. |

El [diagrama del pipeline CI/CD](../diagramas/pipeline-cicd.svg) propone GitHub Actions para los controles por PR y un runner Ubuntu con Docker Compose para las pruebas del commit integrado. El entorno duraría lo que dure la ejecución. Quedan pendientes el workflow versionado y los controles de merge. El [ADR-009](../adr/ADR-009-tif-despliegue-y-reversion.md) documenta la propuesta de reversión.

## 10. Convenciones de desarrollo

- **Backend.** Paquetes por dominio bajo `com.fitzonesports`. Se observan subpaquetes `controller`, `service`, `repository`, `model` y `dto`, según el módulo. Los controladores exponen DTO y permisos, los servicios concentran reglas y transacciones y los repositorios encapsulan acceso a datos. Se usa inyección por constructor. Véanse el [ADR-005](../adr/ADR-005-tif-spring-di-y-persistencia.md) y [ClaseController](../../src/main/java/com/fitzonesports/clase/controller/ClaseController.java).
- **Frontend.** Componentes en PascalCase y archivos `.jsx`. Vistas por módulo en `frontend/src/modules/`, servicios en `frontend/src/services/` y sesión en [AuthContext.jsx](../../frontend/src/context/AuthContext.jsx). Usar los [lineamientos de UI](../frontend-ui-guidelines.md) y la composición del [ADR-006](../adr/ADR-006-tif-react-componentes-y-estado.md).
- **Persistencia y API.** Migraciones `Vn__descripcion.sql`. Contrato OpenAPI con `operationId` en camelCase, rutas bajo `/api/v1` y metadatos de alcance. Registrar las decisiones y contrastar cada cambio con controladores y pruebas. [README](../../README.md) · [Decisiones de OpenAPI](../openapi/DECISIONES.md)
- **Git.** Se observan ramas temáticas y mensajes como `feat(m3): pantalla de clases con reservas, lista de espera y administración` y `docs: agregar diagramas UML de membresia y lista de espera`. `docs/cierre-tif` concentra el trabajo documental. Para la entrega, vincular el cambio con la tarjeta y el PR según la organización del equipo. Queda por confirmar qué reglas se aplican de forma automática en GitHub.

### Confirmaciones para el cierre

- **M4/M5.** Incorporar al dossier las pruebas y diagramas del [circuito validado](../integracion-canchas-pagos.md#6-referencias-de-implementación-para-el-dossier) y cerrar con el equipo el ADR-010 y la coordinación de ingreso por reserva con M2.
- **M3/M2.** Acordar con la cátedra el canal aceptable de aviso para RF-08 y el criterio de las 48 horas. Confirmar la política operativa para conflictos offline y el método de medición de disponibilidad.
- **Pruebas y operación.** Acordar pirámide y umbral de cobertura, generar evidencia del corte integrado y confirmar CI externo, despliegue y reversión.
- **Documentación de arquitectura.** Confirmar autores de diagramas y autoría y sprint de los ADR existentes.
