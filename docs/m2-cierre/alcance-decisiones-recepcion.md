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
QR, membresía y presencia. `useAforoSede` consulta el contador central y fuerza
una actualización tras un movimiento para descartar lecturas anteriores. La
salida admite QR o número de ingreso, incluso si la membresía venció. El lector
acepta el QR de la cámara, pegado o un lector 2D que opere como teclado. En
cámara usa `qr-scanner` (MIT, carga diferida), prioriza la cámara trasera y
libera las pistas tras la primera lectura, cancelación o error. En móvil
requiere un origen HTTPS de confianza y permiso en el navegador.

El panel combina lector, aforo y movimientos confirmados de la sede. Clases y
mantenimiento mantienen sus pantallas específicas. El enlace directo anterior
de aforo permanece disponible, fuera del menú de Recepción.

`GET /accesos/sedes/{sedeId}/movimientos` lista hasta 12 eventos de la sede del
recepcionista de las últimas 24 horas. `GET /accesos/me/movimientos` consulta sólo
la cuenta autenticada, a partir de una marca del reloj central obtenida al
abrir Mi QR. Mi QR consulta cada tres segundos mientras está abierto, descarta
lecturas repetidas por ID y tipo y cancela la consulta al cerrar. El historial
incluye egresos asentados por cierre diario. En desconexión el socio recibe
confirmación sólo después de la reconciliación, si el evento es posterior a la
apertura de su seguimiento y Mi QR sigue abierto.

### Contingencia

El mismo lector del panel pasa a contingencia cuando la sonda confirma una
falla de transporte y la copia firmada sigue vigente. Una terminal sin copia
válida muestra el motivo y deja el lector bloqueado. La PWA conserva
`/terminal-offline` como acceso autónomo de recuperación. El backend emite las ventanas QR de hasta 60 s
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
| Crear sedes, editar tarifas globales y consultar reportes de cadena | Gerencia | Acceso denegado a Recepción. |
| Ver avisos de ingreso y egreso de Mi QR | Socio autenticado | El servidor deriva la identidad de la sesión. Otras cuentas obtienen sus propios movimientos. |

El comportamiento de aforo sigue RF-05. El contador compara ocupación y
capacidad, e informa si se alcanzó el máximo. El requisito original no define
un rechazo automático de ingresos por ese umbral.

### Verificación de la integración

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
  roles. El reconocimiento del QR con la cámara del celular requiere la
  verificación física.

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
  disponibilidad. La prueba con QR pegado no acredita escaneo óptico.

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

Para el dossier: incorporar el recorrido al manual de usuario, instalación y
operación. Referenciar la clave persistente y la preparación en el manual
técnico, la diferencia entre captura y ACK en ADR-003/007 y el flujo de conflicto
en el diagrama de secuencia. En la matriz vincular los cinco requisitos con
evidencia fechada y declarar la limitación de RN-01 y la medición pendiente de
RNF-01. Registrar los commits y las pruebas en la bitácora propia con horas y
sprint confirmados. Los documentos grupales se consolidan mediante revisión.
