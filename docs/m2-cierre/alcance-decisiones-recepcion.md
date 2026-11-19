# Recepción y M2 — alcance de cierre

Base inicial: `origin/main` `8e0ba85c5fed4f085232fedc182e5f6a802be0f8`.
Fuentes: Trabajo Integrador FitZone Sports, págs. 5, 7, 8, 12 y 13.
Lineamientos de Entrega, §§5.2, 5.4 y 5.5.

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
acepta pegado o lector 2D que opere como teclado.

### Contingencia

La PWA puede abrir `/terminal-offline` desde su aplicación instalada o desde el
perfil del navegador ya preparado. El backend emite las ventanas QR de hasta 60 s
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
| Disponible (204) | Central disponible. El terminal conserva la preparación y sincronización existentes. |
| Sesión requerida (401/403 o cambio de sesión) | Volver a ingresar con una cuenta habilitada. Bloquea la captura. |
| Respuesta no verificada | Verificar la incidencia con el servidor. Bloquea la captura. |
| Sin comunicación | El terminal permite intentar captura provisional si la copia sigue vigente. |
| Movimiento central confirmado | Mostrar confirmación y aforo central. |
| Movimiento provisional | Conservar evento y mostrar aforo local y pendientes. |
| Rechazado o conflicto | Mostrar el resultado y conservar evidencia para revisión. |
| Resultado online desconocido | El POST pudo persistir. Verificar el movimiento central antes de volver a registrar, incluso en contingencia. |

### Evidencia verificada el 18/11/2026

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

- Conservar lector central y terminal de contingencia como circuitos explícitos.
  Unificar su presentación es una propuesta. Convertir automáticamente un POST
  incierto en un evento local podría duplicar la operación. Un protocolo de
  reconciliación online por identificador requeriría contrato y pruebas propios.
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
   copia vigente, conectividad y aforo. Usar el lector central en operación normal.
2. Al perder comunicación, abrir la terminal preparada. Registrar con QR vigente
   y comprobar la confirmación provisional y el contador. Mantener el perfil y
   la cola. Si el resultado de un POST central es incierto, verificarlo antes de
   volver a registrar el mismo movimiento.
3. Reconectar con la cuenta original, esperar la sincronización o reintentar.
   Contrastar el aforo central, revisar conflictos y verificar los ACK.
4. Para reproducir, seguir la guía de [pruebas](../pruebas.md) y ejecutar
   `frontend/scripts/e2e-m2-offline.mjs` con Docker y Chrome, sobre una base
   descartable. Conservar SHA, resultado y capturas bajo `target/`.

Para el dossier: incorporar el recorrido al manual de usuario, instalación y
operación. Referenciar la clave persistente y la preparación en el manual
técnico, la diferencia entre captura y ACK en ADR-003/007 y el flujo de conflicto
en el diagrama de secuencia. En la matriz vincular los cinco requisitos con
evidencia fechada y declarar la limitación de RN-01 y la medición pendiente de
RNF-01. Registrar los commits y las pruebas en la bitácora propia con horas y
sprint confirmados. Los documentos grupales se consolidan mediante revisión.
