# Recepción, Clases y Canchas: preparación frontend

Base: feature/integracion-final-frontend, 47e131cea679197641ca783a4f513ac3b8d9f4fa,
limpia al iniciar. Bloque cerrado en `65e0eff`; las evidencias describen la revisión
previa al commit. Cliente/Socio cerrado y backend intacto. Estado consolidado en
[la entrega de integración](integracion-final-frontend.md).

## Fuentes y auditoría

Se inspeccionaron ClaseController, CanchaController, ReservaController, OpenAPI
(schemas y anotaciones x-contract-status), servicios/frontend existentes y v0 local:
diseno-de-interfaz-fit-zone.zip del Escritorio. Referencias: classes-admin-page,
classes-member-page, court-booking-page y courts-admin-page. Se portaron jerarquía,
filtros, paneles, navegación, pasos y estados vacíos; no datos DEMO, simulador de
estado, precios, reservas, Next/Tailwind/shadcn ni handlers ficticios.

No se encontró una copia del TP en el checkout ni archivos de referencia dentro
de sources del espejo de proyecto. Las expectativas del pedido se documentan como
propuestas cuando no están respaldadas por código/contrato estable. No se afirma
que todos los borradores OpenAPI sean reglas aprobadas por el equipo.

| Área | Runtime actual | Contrato |
|---|---|---|
| M2 ingreso/salida, QR y aforo | Implementado | DTOs Java y autorización reales |
| GET /sedes, GET /usuarios/me | Implementado | Contexto real de sede/perfil |
| GET/POST /clases, PATCH /clases/{id} | 501 | Schema draft Clase/ClaseRequest/ActualizarClaseRequest |
| POST /clases/{id}/cancelacion | 501 | MotivoRequest draft |
| POST /clases/{id}/reservas; DELETE /clases/{id}/reservas/{reservaId} | 501 | ReservaClase draft |
| GET /clases/{id}/reservas; PUT .../{reservaId}/asistencia | 501 | Listado/asistencia draft |
| POST .../lista-espera; DELETE .../lista-espera/me; POST .../ofertas/{ofertaId}/respuesta | 501 | Espera/ofertas draft |
| GET/POST /canchas; PATCH /canchas/{id} | 501 | Cancha/CanchaRequest draft |
| GET/POST /canchas/{id}/turnos | 501 | Turno/CrearTurnoRequest draft |
| POST /canchas/{id}/reservas; DELETE .../reservas/{reservaId} | 501 | ReservaCancha draft |
| POST .../mantenimientos; DELETE .../mantenimientos/{id} | 501 | Mantenimiento draft |
| GET /reservas y /reservas/me | 501 | Sin historial funcional |

M3/M4 no tienen servicios, repositorios ni DTO Java funcionales: controllers Void
retornan 501 después de autorizar rol. Reserva/lista de espera/ofertas M3 requieren
vigencia para USUARIO. Crear/editar requiere Recepción/Gerente. Canchas permite
consulta USUARIO/Recepción/Gerente; reservar USUARIO/Gerente; administración
Recepción/Gerente. Las anotaciones no implementan todavía propiedad/sede/reglas.

## Implementado en este bloque

- Sidebar Recepción: Admin de Sede → Control de acceso, Aforo, Clases, Canchas.
  Perfil sigue disponible; destino post-login y permisos JWT no cambian.
- Aforo separado reutiliza useAforoSede, TarjetaAforo y m2Service. Sede de perfil,
  sin selector arbitrario; conserva refresco, errores y cleanup existentes.
  No se reescribe scanner/ingreso/salida ni se agrega historial 501.
- Socio activo: enlaces Clases/Canchas. Clase directa sin vigencia muestra requisito
  de membresía y no consulta ese servicio. La vigencia sigue siendo autoridad M1.
- Cliente/VENCIDA: Canchas accesible, sede elegida explícitamente. No se altera
  membresía, rol ni transición; no se agregan links de Clases para estos estados.
- Socio: sede habitual como filtro inicial, selector libre para otra sede. Recepción:
  sólo sede de perfil, bloqueada en UI. No se infiere seguridad backend de ese filtro.
- GET reales para catálogos. 501 es estado pendiente, no vacío; 403 autorización,
  red/otros errores recuperables, loading y lista vacía real separados. Actualizar
  consulta conserva sede. Cleanup ignora respuestas de la selección anterior.
- Lectura objetivo preparada: Clase usa PaginaClases.items; Cancha usa array.
  Valida array y sede; una respuesta incompatible no se interpreta como catálogo vacío.
  Cambio de sesión remonta el contexto. No hay mocks productivos.

## Frontend preparado, pendiente de backend

m3Service/m4Service reutilizan fetchAPI, JWT, status y errores sin envolverlos.
Preparan rutas de lectura y operaciones existentes, cuerpos JSON, sin precios ni
UUID automáticos inventados. No se invocan mutaciones desde estas pantallas mientras
los contratos sigan draft/501. No se afirma haber implementado reservar/cancelar,
lista de espera, asistencia, creación/edición ni mantenimiento funcionales.

Se omiten formularios de creación ficticios: M3 necesita catálogos de tipos e
instructores (hoy sólo hay IDs draft), validación de sede/propiedad y errores reales.
La lectura objetivo puede mostrar referencia de instructor; no inventa su nombre.
Agenda inicial de 20 elementos y filtro local de fecha son preparación, no agenda
completa: paginación/rango de fechas requieren cerrar el contrato funcional.

M4 necesita disponibilidad real por fecha, Turno y una reserva/retención con precio
final calculado por backend; 201 de retención no equivale a pago confirmado.
No se implementa pago de cancha reutilizando engañosamente el alta de membresía.
Cancha draft sólo contiene id/nombre/tipo/sedeId/activa: no hay descripción, precio
base ni URL de imagen confirmados. No se muestran precios estimados inventados.

Tres SVG locales en public/canchas representan Pádel/Fútbol 5/Básquet; selección por
tipo PADEL/FUTBOL5/BASQUET, sin catálogos falsos ni descargas externas. Son ilustraciones
demo, no fotografías reales ni disponibilidad. Sólo acompañan una cancha recibida;
tipo desconocido queda sin imagen. No uploads, Cloudinary, storage ni nuevas tablas.

## Propuestas pendientes del equipo

- M3: Socio multisede, habitual como filtro; administración local, asistentes/espera
  y formularios conectados cuando existan catálogos y autorización funcional.
- M4: Cliente/VENCIDA tarifa externa; Socio beneficio multisede con cambio libre de
  sede. La pantalla no calcula descuentos, recargos ni elegibilidad comercial final.
- Cancha = recurso/identidad/estado; Disponibilidad = fecha y franjas;
  Reserva = titular/recurso/horario/precio final/estado. No se crean tablas.
- Strategy de precio (base, descuento Socio, horario pico) pertenece al backend.
  Queda pendiente quién define precio base y dónde se administra; el draft sugiere
  tarifas por tipo separadas de crear cancha, no un precio editable por reserva.
- Admin de Sede: propuesta de operación/mantenimiento de recursos propios.
  Gerencia Central: propuesta de supervisión global; no se construye en este bloque.
  Confirmar permisos, precio, estados, cuotas y reglas antes de habilitar mutaciones.

## Verificación

Frontend: 128 verificaciones dominio/Cliente/Socio/M2/actividades, 16 Planes,
14 transporte existente y 18 contratos nuevos M3/M4. Sin dependencias nuevas.
Las nuevas pruebas incluyen sede inicial/multisede, sede fija local, denegación,
501 vs vacío/error, sede incompatible, respuesta vieja/desmontaje, retry sin perder
selección, guards y aforo independiente, métodos/rutas/body y propagación de errores.

Build frontend y git diff --check correctos. Backend y migraciones sin cambios:
no se repite PostgreSQL completo. Revisión real: clases Socio y canchas Socio/Cliente
reciben 501 amigable, aforo Recepción real y sede asignada. Responsive en
390/768/1024/1440 sin overflow horizontal. Multisede probada por fixtures de tests;
BD dev sólo tiene Central, no se crearon sedes, clases, canchas ni reservas para fingirlo.

Vistas abiertas en puertos 5173 (Cliente Canchas), 5174 (Socio Clases/Canchas) y
5175 (Recepción). Misma aplicación/backend; orígenes separados sólo para sesiones.
Evidencias ignoradas en target/actividades-*.png y logs de pruebas; no se commitean.

Archivos: Layout.jsx, AppRoutes.jsx, AforoSede.jsx, AgendaClases.jsx, GrillaCanchas.jsx,
ServiciosSede.jsx/.css, m3Service.js, m4Service.js, tres SVG, test-dominio.mjs,
test-servicios-actividades.mjs, esta documentación y frontend-ui-guidelines.md.
No cambios en Auth, backend, modelo Cliente/Socio ni sus operaciones cerradas.
