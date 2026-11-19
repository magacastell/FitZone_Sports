# Bitácora — Cejas, Claudio — Rol P2 — Backend Developer (en la planificación figura como backend y seguridad)

> Las horas son **estimadas** (no se cronometraron): se calcularon por la actividad y los commits de cada día. Total estimado: ≈50 h.

> **Sprints sin entrada.** En los sprints 1 y 2 (10/08 al 06/09), que fueron de análisis y definición de arquitectura del equipo, no registré actividad propia en el repositorio: mi primer commit es del 10/09. Tampoco tengo entradas ni commits en el sprint 6 (19/10 al 01/11); entre el 13/10 y el 10/11 no hay actividad mía registrada.

## Sprint 3 — Unidad II — Semana del 2026-09-07

### 2026-09-09 · ≈2 h (estimadas)

**Actividad**
Inicialicé el proyecto Spring Boot del backend y lo integré al repositorio compartido.

**Decisión**
—

**Problema o bloqueo**
No registré bloqueos relevantes en esta sesión.

**Commits**
Sin commit propio ese día; los primeros son del 10/09 (`3ab431a`).

---

### 2026-09-10 · ≈4 h (estimadas)

**Actividad**
Implementé la autenticación del backend con Spring Security y JWT (login y roles). Configuré la base de datos y separé la configuración por ambiente (dev, staging y prod).

**Decisión**
Una configuración por perfil de ambiente en lugar de un único archivo de propiedades.

**Problema o bloqueo**
No registré bloqueos relevantes en esta sesión.

**Commits**
`3ab431a` autenticación con jwt y spring security · `d29990a` correcciones de copilot · `5912f0a` Log.md

---

### 2026-09-11 · ≈3 h (estimadas)

**Actividad**
Ajusté seguridad y calidad del módulo de autenticación (manejo de errores, permisos y configuración) y agregué el Dockerfile.

**Decisión**
—

**Problema o bloqueo**
No registré bloqueos relevantes en esta sesión.

**Commits**
`0bbc9af` cierro auth · `8158624` segunda corrección · `ae66ed0` ultimo fix · `455d2fd` docker · `6fc0e45` dockerfile · `00218c2` Log individual

---

## Sprint 4 — Unidad II — Semana del 2026-09-21

### 2026-09-27 · ≈3 h (estimadas)

**Actividad**
Completé la entidad Usuario (apellido, DNI y flag de activo), actualicé el esquema y el seed, y agregué el endpoint de registro (`/auth/register`) con sus DTOs y hasheo de contraseña.

**Decisión**
El registro público siempre asigna el rol de cliente externo y nunca deja elegir uno interno.

**Problema o bloqueo**
El login ignoraba el estado activo/inactivo del usuario; lo corregí en `CustomUserDetailsService`.

**Commits**
`0e1a300` ddl sql · `30d06df` entidad usuario y registro

---

## Sprint 4 — Unidad IV — Semana del 2026-09-28

### 2026-10-04 · ≈5 h (estimadas)

**Actividad**
Conecté el login del frontend con el backend (`POST /auth/login`) reemplazando el mock; el rol sale del JWT. Implementé el módulo `usuario` (perfil propio, listado, consulta y modificación) y moví la lógica de alta de `AuthController` a `UsuarioService`.

**Decisión**
Recepción opera solo sobre socios y clientes de su sede; el gerente opera sobre todo; nadie puede desactivar su propia cuenta.

**Problema o bloqueo**
El backend no tiene CORS, así que el frontend no podía llamarlo: agregué un proxy de Vite. Un token vencido dejaba la sesión rota: lo descarto al cargar y cierro sesión ante un 401.

**Commits**
`b8a8346` autenticación y comunicación con jwt front y back · `06d80cc` endpoints de usuario · `ef8d267` log · `01068aa` merge feature/frontend-base-ajustes

---

## Sprint 5 — Unidad IV — Semana del 2026-10-05

### 2026-10-05 · ≈3 h (estimadas)

**Actividad**
Implementé el módulo `sede` (listar, crear y modificar) y moví `Sede` y `SedeRepository` desde `auth`. Hice que el menú del frontend dependa del rol del JWT.

**Decisión**
Todos los roles listan sedes; solo el gerente las crea o modifica; el nombre es único.

**Problema o bloqueo**
No registré bloqueos relevantes en esta sesión.

**Commits**
`d9873bd` sede y mostrar opciones del modulo segun rol · `2bbbb6a` registro en front

---

## Sprint 5 — Unidad II — Semana del 2026-10-12

### 2026-10-13 · ≈5 h (estimadas)

**Actividad**
Implementé el QR de acceso (RF-04), el ingreso, la salida, el aforo por sede y el cierre diario de ingresos olvidados. En el frontend, `SocioQRModal` con cuenta regresiva y `ControlAccesoSede`.

**Decisión**
El QR vence a los 60 s y se guarda una sola fila por socio, así cada renovación invalida el anterior. Se firma con una clave derivada de `jwt.secret` para que no sirva como Bearer. RN-01 se garantiza en la base con un índice único parcial (migración V4).

**Problema o bloqueo**
El servidor corre en UTC y el cierre diario debía ser a las 23:59 de Buenos Aires: fijé la zona horaria en el `Clock`.

**Commits**
`284b718` qr y accesos

---

## Sprint 7 — Unidad III — Semana del 2026-11-09

### 2026-11-10 · ≈8 h (estimadas)

**Actividad**
Implementé M3 Clases grupales (RF-06, RF-07 y RF-08): agenda, alta, edición y cancelación por sede, instructores y tipos de clase, reservas y cancelaciones, y lista de espera con ofertas de lugar. Frontend de Clases.

**Decisión**
Para no exceder el cupo bloqueo la clase (`FOR UPDATE`) al contar y reservar; para evitar duplicados uso el índice único parcial `uk_reserva_clase_confirmada`. La lista de espera usa el patrón Observer (`PublicadorClase`, `GestorListaEspera`, `NotificadorClase`). Se reserva hasta 48 h antes y se cancela sin penalidad hasta 2 h antes. El nombre de la clase sale del tipo.

**Problema o bloqueo**
Un `target/` viejo hacía fallar `spring-boot:run`: compilé en copias limpias. Las pruebas del equipo fallaban por autenticación SCRAM: usé un Postgres descartable con acceso `trust`. Una prueba de membresía esperaba 501 en las rutas de clases: la actualicé a 404. En las pruebas de vencimiento la base usaba UTC y la aplicación hora local: lo corregí en el script.

**Commits**
`8d6577b` migración V15 · `6837fb6` DTOs y plazos · `d043c51` Observer · `12de7cc` administración (RF-06) · `5c51da6` reservas (RF-07) · `d2f9df1` lista de espera (RF-08) · `4d3d148` rutas · `291abbb` prueba de membresía · `9ffb970` servicios del frontend · `0854140` pantalla de clases · `0995f34` contrato OpenAPI · `a492725` log · `5f71e61` merge M3

---

## Sprint 8 — Unidad Cierre — Semana del 2026-11-16

### 2026-11-17 · ≈4 h (estimadas)

**Actividad**
Implementé el backend de reportes consolidados del Gerente Central (`GET /reportes/ocupacion` e `/ingresos`, antes 501): accesos (ingresos, personas distintas, pico simultáneo, permanencia, serie diaria) y cobros, devoluciones y neto en ARS por sede, concepto y día. Lo verifiqué con una prueba de integración contra PostgreSQL (`ReporteIntegrationTest`, 9 casos: dos sedes, filtros, período vacío, reembolsos, neto negativo y permisos), que luego incorporé al repositorio.

**Decisión**
SQL parametrizado con `JdbcTemplate` en lugar de JPA: son agregaciones entre varios módulos con una función de ventana. Período `[desde, hasta)` en hora argentina; cobros por fecha de pago y devoluciones por fecha de devolución (el neto puede ser negativo).

**Problema o bloqueo**
El pago no guarda su sede: la atribuyo por la membresía o la cancha, y los pagos sin vínculo van a una fila "sin sede". Los pagos rechazados quedan fuera de los importes.

**Commits**
Sin commit ese día: lo commiteé el 18/11 en `f45a292`.

---

### 2026-11-18 · ≈8 h (estimadas)

**Actividad**
Frontend de Reportes (período, sede, indicadores, gráficos y tablas) y resumen de 30 días en el Panel general. Agregué las tarifas de cancha y el recargo del horario pico dentro de Sedes. Recorrí Gerencia en el navegador con una base aislada y verifiqué las cifras contra SQL propio; medí rendimiento con `EXPLAIN` (8 a 21 ms con 600 mil ingresos).

**Decisión**
No agregué índices ni migraciones: el volumen medido no lo justifica. El gerente administra la agenda y no reserva clases.

**Problema o bloqueo**
La tabla de 25 sedes tapaba el gráfico (ahora muestra primero las sedes con movimientos), el formulario de edición de una sede quedaba fuera de pantalla y el gerente veía botones de reservar. Mi `node_modules` estaba desactualizado (faltaban `dexie` y `jose`): corrí las pruebas en una copia con `npm ci`.

**Commits**
`f45a292` gerencia y reportes

---

### 2026-11-19 · ≈5 h (estimadas)

**Actividad**
Atendí la revisión de Augusto: el recargo pico se lee desde la sede (`GET /sedes/{id}/recargo-pico`) y la membresía se consulta desde el usuario (`GET /membresias/usuarios/{id}`). Ocultué "Mis reservas" para el gerente y actualicé el contrato OpenAPI y `DECISIONES.md`. Saqué la carpeta de documentación de Gerencia del repositorio y de su historial. Reescribí esta bitácora al formato del Anexo C, con hashes de commit y horas estimadas. Volví a incorporar al repositorio la prueba de integración de reportes (`ReporteIntegrationTest`, 9 casos) y escribí la de M3 (`ClasesIntegrationTest`, 7 casos: cupo exacto con reservas simultáneas, una sola reserva por persona, cierre 48 h antes, cancelación a tiempo o tardía, y lista de espera con oferta FIFO). Las corrí en verde contra un PostgreSQL descartable y verifiqué que fallan si rompo a propósito el bloqueo de la clase, el plazo de 48 h o el margen de 2 h.

**Decisión**
Endpoints nuevos y simétricos a los existentes en lugar de modificar la entidad `Sede`, para no tocar otro módulo. Dejar las pruebas de reportes y de M3 en el repositorio: mis módulos no tenían pruebas propias y el ADR-008 declara como deuda la falta de evidencia de cupo, cancelación y ofertas en M3; con la prueba nueva esa deuda queda cubierta.

**Problema o bloqueo**
El botón "Mis reservas" del gerente quedaba cargando porque mi cambio previo dejó de pedir su actividad de clases. La sede nueva sin canchas no mostraba el recargo guardado. Esta bitácora no cumplía el Anexo C: no tenía hashes de commit, horas ni primera persona; la reescribí. Al probar M3 sin el bloqueo de la clase, el cupo se excedía (10 reservas en una clase de 3), lo que confirma que ese bloqueo es lo que garantiza la capacidad.

**Commits**
`cb2e50e` merge de feature/cierre-gerencia-reportes · `75dd7a9` arreglos · `059f105` openapi · [completar con los hashes de los commits de hoy que falten]

---
