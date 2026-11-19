# Recepción y M2 — alcance de cierre

Base integrada: `origin/main` `a2396a893441ced27671452367e7c46546b695e1` (PR #3).
Fuentes: Trabajo Integrador FitZone Sports, págs. 5, 7, 8, 12 y 13.
Lineamientos de Entrega, §§5.2, 5.4 y 5.5 y Anexo D, §§4 y 5.

## Responsabilidades y requisitos

Recepción opera su sede, valida ingresos y egresos, consulta el aforo y atiende
incidentes de acceso. El socio puede ingresar en distintas sedes con su membresía
vigente (RF-03). RF-04 pide QR dinámico cada minuto y validación central de
membresía. RF-05 pide aforo actual y máximo por sede. RN-01 prohíbe la presencia
simultánea en dos sedes. RNF-01 pide continuidad cuando falla Internet y un
objetivo de disponibilidad de 99,5 %. Una prueba de corte demuestra continuidad
en ese escenario. Para acreditar el porcentaje hace falta una medición operativa.

## Implementación actual

### Operación central

`ControlAccesoSede` obtiene la sede del operador. `LectorAcceso` llama a los
servicios centrales de ingreso y salida. El backend verifica al operador, sede,
QR, membresía y presencia. El operador elige **Ingreso** o **Salida** y pulsa
**Escanear QR**. La primera lectura cierra la cámara y envía automáticamente
la operación seleccionada. Cada apertura admite una sola lectura. El aviso
del resultado dura cuatro segundos y el lector permite comenzar otro escaneo
cuando termina el envío. La interfaz requiere un QR vigente para ambos
movimientos. El contrato de egreso del backend conserva las opciones previas
para sus integraciones autorizadas.

El escáner usa `qr-scanner` (MIT, carga diferida), prioriza la cámara trasera
y libera las pistas tras la primera lectura, cancelación o error. En móvil
requiere un origen HTTPS de confianza y permiso en el navegador.

`useAforoSede` comparte la consulta en curso. Tras confirmar un movimiento
descarta una lectura anterior y programa una única consulta posterior si
había una en curso. El número mostrado siempre proviene del servidor.

El panel combina lector, aforo y movimientos confirmados de la sede. Clases y
mantenimiento mantienen sus pantallas específicas. Las rutas anteriores
`/recepcion/aforo` y `/terminal-offline` redirigen al panel de Recepción.

`GET /accesos/sedes/{sedeId}/movimientos` lista hasta 12 eventos de la sede del
recepcionista de las últimas 24 horas. `GET /accesos/me/movimientos` consulta sólo
la cuenta autenticada, a partir de una marca del reloj central obtenida al
abrir Mi QR. Mi QR consulta cada tres segundos mientras está abierto, descarta
lecturas repetidas por ID y tipo, muestra el aviso con la sede durante cuatro
segundos y cancela la consulta al cerrar. El historial
incluye egresos asentados por cierre diario. En desconexión el socio recibe
confirmación sólo después de la reconciliación, si el evento es posterior a la
apertura de su seguimiento y Mi QR sigue abierto.

### Contingencia

El mismo lector del panel pasa a contingencia cuando la sonda confirma una
falla de transporte y la copia firmada sigue vigente. Una terminal sin copia
válida muestra el motivo y deja el lector bloqueado. La PWA permite volver
al mismo panel durante un corte con el navegador preparado y la sesión
de Recepción vigente. El backend emite las ventanas QR de hasta 60 s
por un horizonte acotado y firma con RSA/RS256. Solo el backend recibe y conserva
la clave privada persistente. El socio selecciona un QR vigente en el navegador
sin firmar uno nuevo. Recepción verifica con la clave pública aprovisionada, revisa
la ventana, los bloqueos, la presencia conocida y el uso local previo. Una copia
firmada de hasta dos horas vincula terminal, operador y sede. La vigencia de dos
horas es una decisión de la implementación.

IndexedDB/Dexie conserva la copia, los movimientos, las presencias y los usos.
La escritura del movimiento provisional y la actualización del aforo local son
transaccionales. Cada evento conserva UUID y referencia de visita. La cola se
conserva al reabrir el navegador. En sincronización se retira un pendiente solo
tras una respuesta central que confirma, rechaza o marca conflicto. `EN_ESPERA`
mantiene el elemento pendiente. La inbox central deduplica y preserva los
conflictos. Consulte los detalles en [M2 offline](../m2-offline.md),
[ADR-003](../adr/ADR-003-tif-validacion-qr-offline.md) y
[ADR-007](../adr/ADR-007-tif-replica-y-reconciliacion.md).

## Corrección de este cierre

**Problema.** Un sondeo anterior podía indicar desconexión cuando el servidor
había vuelto, o clasificar cualquier HTTP inesperado como caída. Una captura
podía entrar en contingencia con esa información obsoleta, antes de conocer una
denegación del servidor.

**Alternativas.** Mantener el estado periódico como autoridad, cambiar toda la
API de movimientos o consultar la sonda existente antes de cada captura.
Elegimos la sonda existente. Una respuesta HTTP ambigua, incluido 503, bloquea
la captura y se presenta como respuesta no verificada. Esto restringe la
contingencia si el proxy todavía responde pero la aplicación está caída. Un error
de transporte o timeout permite intentar la validación local con copia vigente.

| Estado | Acción en Recepción |
|---|---|
| Consultando | Esperar el resultado de la sonda antes de capturar. |
| Disponible (204) | Reconciliar pendientes automáticamente con la aplicación abierta y actualizar el aforo central tras la respuesta. |
| Sesión requerida (401/403 o cambio de sesión) | Volver a ingresar con una cuenta habilitada. Bloquea la captura. |
| Respuesta no verificada | Verificar la incidencia con el servidor. Bloquea la captura. |
| Sin comunicación | Activar la contingencia en el mismo panel si la copia sigue vigente. |
| Movimiento central confirmado | Mostrar confirmación y aforo central. |
| Movimiento provisional | Conservar evento y mostrar aforo local y pendientes. |
| Rechazado o conflicto | Mostrar el resultado y conservar evidencia para revisión. |
| Resultado online desconocido | El POST pudo persistir. La terminal conserva el bloqueo al recargar y pide volver a verificar el registro central antes de continuar. |

### Permisos de operación

| Acción | Sede propia | Sede ajena o cuenta sin el rol |
|---|---|---|
| Validar acceso y consultar aforo y movimientos | Recepción | Acceso denegado a otra sede. El endpoint de movimientos requiere Recepción. |
| Consultar y gestionar agenda | Recepción | Acceso denegado para la operación de sede ajena. |
| Inhabilitar cancha por mantenimiento | Recepción | Acceso denegado para una cancha de otra sede. |
| Alta de cancha de un tipo existente | Recepción en su sede o Gerencia | Recepción recibe 403 al enviar una sede ajena. Se conserva la [regla operativa de M4](../canchas-pagos-backend.md#reglas-operativas). |
| Crear sedes, editar tarifas globales y consultar reportes de cadena | Gerencia | Acceso denegado a Recepción. |
| Ver avisos de ingreso y egreso de Mi QR | Socio autenticado | El servidor deriva la identidad de la sesión. Otras cuentas obtienen sus propios movimientos. |

El comportamiento de aforo sigue RF-05. El contador compara ocupación y
capacidad, e informa si se alcanzó el máximo. El requisito original no define
un rechazo automático de ingresos por ese umbral.

### Verificación del flujo final

- **Aceptación funcional de Augusto, 19/11/2026.** Augusto probó el flujo
  físico con una notebook en sesión de Socio y un celular en sesión de
  Recepción. Confirmó la lectura del QR con la cámara, el ingreso y egreso,
  los cambios de aforo y los avisos en ambas sesiones. La evidencia es su
  confirmación de aceptación. La prueba de corte y resincronización se
  respalda por separado con el E2E automatizado.
- El 19/11/2026 pasaron 72 pruebas focalizadas de membresía, acceso offline y
  canchas con PostgreSQL aislado. Pasaron también las seis suites frontend
  (201 casos de dominio), el build PWA y `git diff --check`.
- El E2E con Chrome, Spring Boot y PostgreSQL aislado
  (`target/e2e-m2/f8fb34c1-9681-4f71-a23d-001da97db709/resultado.json`)
  comprobó el envío desde el escáner, avisos temporales, aforo y rechazo de
  duplicados. Comprobó también QR vencido, reapertura durante el corte,
  persistencia de pendientes, reconexión automática y recuperación sin
  duplicados tras perder la respuesta. Las rutas anteriores devolvieron al
  mismo panel. La cámara era virtual y la detección del QR se inyectó en
  Chrome. La validación del QR, los permisos HTTP y la persistencia usaron
  el backend real.
- Se verificaron alta de cancha y mantenimiento en sede propia, y los
  rechazos de administración ajena, alta de sede, tarifa global, recargo
  pico y reportes consolidados para Recepción. El código de este recorrido
  está en `f0d6c67` y `880a843`.
- El cierre de integración repitió únicamente el build PWA, el empaquetado
  backend con Java 21 y `git diff --check`. Se conservó la evidencia de las
  pruebas anteriores.

### Evidencia de la integración anterior

- En `f0d6c67`, el E2E M2 con Chrome, Spring Boot y PostgreSQL aislado
  (`target/e2e-m2/ee2d94ae-b810-456b-9779-a44b3c9c007d/resultado.json`)
  verificó la terminal sin preparar, el mismo panel durante el corte, la
  captura provisional, la sincronización automática al reconectar, el
  aislamiento de avisos del socio y el bloqueo de otro envío tras perder
  una respuesta central y recargar. También repitió las pruebas de rotación,
  reapertura, ACK perdido y replay del circuito autónomo.
- Con HTTP real se comprobaron la agenda y el alta de clases de sede propia,
  el mantenimiento propio y los rechazos por sede ajena. Recepción obtuvo
  403 al crear una sede, cambiar el recargo pico o consultar el reporte
  consolidado. Otra cuenta de socio obtuvo sólo su propio seguimiento.
- El runner con PostgreSQL aislado aprobó 123 pruebas de backend. Pasaron
  las seis suites frontend y el build PWA. El contrato OpenAPI pudo cargarse
  como YAML y contiene las dos consultas nuevas.
- La regresión M4/M5 con Chrome y HTTP comprobó los recorridos de Socio,
  Cliente Externo y Gerencia y la navegación de Recepción con aforo integrado.
  Evidencia local en `target/e2e-m4-m5/b715770b-b184-4a82-9b24-a7f3c0ecdc17/resultado.json`.
- La instancia de prueba por HTTPS respondió con cuentas ficticias de ambos
  roles. Esa corrida automatizada usó cámara de prueba.

### Evidencia anterior del cambio de conectividad

El código del commit `584a469` pasó las seis suites frontend (185 casos de
dominio), el build PWA y `git diff --check`. `test-offline.mjs` cubre clasificación
de estados, sesión cambiada y persistencia. El E2E con Chrome, Spring Boot y
PostgreSQL aislado (`target/e2e-m2/9ac67f7f-9f4b-419e-b05c-be8f4a6a37ec`)
comprobó corte real, rotación luego de 65 s, rechazo del QR previo, socio nuevo
sin padrón, reapertura, egreso, ACK perdido y reenvío con dos visitas, cuatro
eventos y cero duplicados. También inyectó 403 y 503 en el proxy de prueba y
comprobó que ambas respuestas bloquean la captura con la cola intacta. No se
utilizaron un teléfono físico ni un lector óptico.

## Propuestas y límites

- El lector enruta al circuito central o provisional antes de enviar el
  movimiento. Ante un POST incierto, el operador debe revisar el registro
  central. La opción de retomar depende de esa verificación humana. Un
  protocolo de reconciliación online por identificador requeriría trabajo propio.
- Durante una partición dos sedes pueden admitir provisionalmente al mismo
  titular usando información incompleta. Al reconectar, el central preserva el
  conflicto y su evidencia. La conciliación no revierte el acceso físico. RN-01
  se comprueba con el central disponible y queda limitada entre sedes aisladas.
- Un QR auténtico robado puede usarse durante su ventana. Robar un lote de
  autorizaciones puede permitir esperar ventanas futuras. La firma acredita
  emisión, no identidad física. Un dispositivo comprometido puede exponer el
  estado del operador y sus datos locales. La revocación desconocida puede quedar
  diferida hasta el vencimiento de la copia o autorización.
- Borrar datos del navegador, usar modo privado, perder el perfil o quedar sin
  espacio puede eliminar o impedir persistir la cola. La copia expirada impide
  nuevas capturas. Los pendientes históricos deben conservarse y se pueden
  reenviar al recuperar red y la sesión del operador original.
- Para producción quedan pendientes una política de protección del equipo y su
  perfil, rotación de claves, resolución operativa de conflictos y medición de
  disponibilidad. Las dos horas limitan la operación autónoma. El aviso del
  socio depende de que Mi QR esté abierto y pueda consultar al servidor.

## Procedimiento operativo y transferencia

1. Iniciar sesión como Recepción de la sede, preparar la terminal y comprobar
   copia vigente, conectividad y aforo. Elegir Ingreso o Salida y abrir el escáner.
2. Al perder comunicación, continuar en el panel. Registrar con QR vigente y
   comprobar el aviso provisional y el contador. Mantener el perfil y
   la cola. Si el resultado de un POST central es incierto, verificarlo antes de
   volver a registrar el mismo movimiento.
3. Reconectar con la cuenta original, esperar la sincronización o reintentar.
   Contrastar el aforo central, revisar conflictos y verificar los ACK.
4. Para reproducir, seguir la guía de [pruebas](../pruebas.md) y ejecutar
   `frontend/scripts/e2e-m2-offline.mjs` con Docker y Chrome, sobre una base
   descartable. Conservar SHA, resultado y capturas bajo `target/`.
5. Para la prueba física, conectar notebook y celular a la misma Wi-Fi y abrir
   la misma URL HTTPS. El proxy debe entregar la PWA y `/api` bajo el mismo
   origen. Con una CA local, transferir únicamente el certificado público de
   la CA a los dispositivos de prueba y confiar en él. La clave privada queda
   en el equipo que hospeda el proxy. En iOS habilitar confianza completa en el
   certificado raíz. En Android instalarlo como certificado de CA. Quitar esa
   confianza al terminar la demo.
6. En la notebook ingresar como socio y abrir Mi QR. En el celular ingresar
   como Recepción, abrir Control de acceso y dar permiso de cámara. Escanear
   como Ingreso, verificar aforo y aviso del socio. Intentar un segundo ingreso
   y luego escanear como Salida. Verificar aforo y aviso de egreso. Un QR que
   rota entre pasos puede reemplazarse por el código vigente.
7. Para probar contingencia, actualizar la terminal y esperar un QR nuevo
   después del ensayo online. Mantener ambos paneles abiertos y cortar sólo
   la red del celular. Escanear y observar el movimiento provisional sin
   aviso central en la notebook. Restaurar la Wi-Fi y esperar que la sonda
   detecte la conexión y se vacíe la cola. Un HTTP 503 del proxy se conserva
   como error del servidor.

### Entorno local de la demostración

Usar una base PostgreSQL exclusiva de la demo, backend Java 21 con perfil
`staging` y build PWA. Preparar la clave RSA persistente y el secreto JWT
mediante [la configuración del módulo](../m2-offline.md#clave-privada-y-continuidad-tras-reiniciar-spring)
y usar cuentas ficticias. El Socio necesita una membresía vigente y
Recepción debe estar asignada a la sede de prueba. Servir el build y
`/api` bajo el mismo origen HTTPS en la LAN, con la CA de prueba
instalada en ambos dispositivos. En la notebook usada para el ensayo,
`:5443` redirigía la API a `127.0.0.1:3002` y a la base
`fitzone_m2_celular`. El entorno de `:5173` apuntaba a una base distinta.
Las cuentas, el certificado y las claves se conservan localmente fuera de Git.

Al cerrar la demo se detuvieron el proxy/frontend HTTPS y el backend
`fitzone-m2-celular-api`. Se pausó `fitzone-m2-celular-pg` porque su base
está en `tmpfs`. Para reutilizarla en la misma sesión de Docker, ejecutar
`docker unpause fitzone-m2-celular-pg`, iniciar el backend de demo con
`docker start fitzone-m2-celular-api` y levantar
`target/m2-prueba-celular/preview.mjs` con Node. Verificá la IP de la LAN y
la vigencia del certificado antes de abrir ambas sesiones. Para otra
máquina o tras reiniciar Docker, recrear un entorno descartable y sus
cuentas de prueba. El montaje temporal no es un respaldo.

### Material para Magali

| Entregable | Material de M2 para incorporar |
|---|---|
| Manual de usuario, Anexo D §§3.3–3.4 y 4.1–4.4 | En Mi QR, explicar vigencia, confirmaciones y qué hacer si el código es rechazado. En Recepción, describir Ingreso/Salida, cámara, aforo, sesión y contingencia. Agenda y mantenimiento conservan sus recorridos por sede. |
| Manual de instalación y operación, Anexo E §8 | HTTPS confiable, sesión de prueba por rol, clave RSA persistente, preparación de una terminal por sede, vencimiento de copia, visualización de pendientes y resolución de ACK perdido. |
| Manual técnico, Anexo F §6, y ADR-003 | Documentar QR preemitido RS256, validación local y copia acotada en IndexedDB. La validación central exclusiva interrumpe el acceso ante el corte y compartir la clave de firma amplía el riesgo si se compromete una terminal. La verificación con clave pública permite operar provisionalmente hasta la caducidad. Ver [ADR-003](../adr/ADR-003-tif-validacion-qr-offline.md). |
| ADR-007 | Explicar por qué se eligieron cola persistente, UUID, acuse e inbox central frente a reenvío ciego y resolución por último escritor. Mostrar preservación de conflictos, revocación diferida y límite de RN-01 durante particiones. Ver [ADR-007](../adr/ADR-007-tif-replica-y-reconciliacion.md). |
| Diagramas | Contrastar [C4 de M2](../diagramas/c4-03-m2.drawio) y [secuencia offline](../diagramas/uml-secuencia-acceso-offline.drawio) con el lector único, la decisión de contingencia, las consultas de avisos y la reconciliación. |
| Matriz y evidencia del dossier | RF-03 enlaza ingreso fuera de la sede habitual con `MembresiaIntegrationTest` y autorización de un socio fuera del padrón local con el E2E. RF-04 y RF-05 enlazan lector y aforo con aceptación física y E2E. RN-01 enlaza rechazo de duplicados y reconciliación con el límite entre sedes aisladas. RNF-01 enlaza corte y recuperación del E2E sin extrapolar el 99,5 %. Conservar SHA, fecha y resultado del E2E por separado de la aceptación física. |

El código de referencia es [AccesoController](../../src/main/java/com/fitzonesports/acceso/controller/AccesoController.java),
[ControlAccesoSede](../../frontend/src/modules/m2-acceso/ControlAccesoSede.jsx),
[TerminalOffline](../../frontend/src/modules/m2-acceso/TerminalOffline.jsx),
[SocioQRModal](../../frontend/src/modules/m2-acceso/SocioQRModal.jsx) y
[SincronizacionOfflineService](../../src/main/java/com/fitzonesports/acceso/offline/SincronizacionOfflineService.java).
Los contratos están en [OpenAPI](../openapi/openapi.yaml). Las referencias
del cierre son `584a469`, `f0d6c67` y `880a843`. El equipo consolida los
documentos compartidos a partir de estas referencias.
