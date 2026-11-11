# ADR-003 — Validación del QR sin conexión al sistema central

- **Estado:** Aceptado
- **Fecha:** 2026-11-10 (redacción documental).
- **Fecha histórica de decisión:** No acreditada en las fuentes consultadas.
- **Autor:** Pendiente de identificación y revisión grupal.
- **Sprint:** Pendiente de contraste con la planificación histórica.

## Contexto

RF-04 requería un QR dinámico y RNF-01 continuidad del control de acceso durante una caída de conectividad. La terminal no podía consultar en ese momento la membresía ni el estado global de otras sedes. Era necesario comprobar localmente una autorización auténtica, limitada en tiempo y sin entregar a Recepción una clave capaz de emitir nuevos permisos. El sistema también debía admitir al socio nuevo que obtuviera su QR por otra conexión, aunque no figurara en la copia previa del terminal.

El antecedente de [Unidad I](https://docs.google.com/document/d/1sgUz-_ovSKQPJSD3dFt6M5ycwiDxV6LK/edit) planteó criptografía asimétrica y caché local como opciones a evaluar; [Definición de Módulos](https://docs.google.com/document/d/1ytZBV5KiQJK5Xw6L2fmeCIRmAZiVYkasMku0qHQXLFc/edit) conservó propuestas manuales. Son antecedentes, no evidencia de un acuerdo actual. El diseño vigente y su evolución constan en [M2 offline](../m2-offline.md).

## Alternativas consideradas

| Alternativa | A favor | En contra | Por qué se descartó |
|---|---|---|---|
| Consulta central para cada QR | Conoce vigencia y presencia central actuales. | No funciona durante la caída que exige RNF-01. | Se conserva para el lector online; no resuelve la contingencia. |
| Registro manual y carga posterior | Poca infraestructura local. | No valida automáticamente autenticidad, ventana ni uso previo del QR. | Propuesta histórica superada por la implementación automática; no se presenta como circuito vigente. |
| Lote por sede y socio incluido en copia | Datos acotados al consentimiento previo; implementación anterior verificable. | Exigía preparación del socio por sede y actualizar la copia para nuevos titulares. | Se conserva sólo por compatibilidad; el flujo principal requiere admisión multisede sin padrón previo. |
| Autorizaciones prefirmadas RS256 multisede + confianza aprovisionada | La terminal verifica con clave pública; el titular puede ser desconocido por su copia. | Revocación diferida y riesgo de credencial al portador durante la ventana. | Adoptada en M2 actual, limitada por tiempo y permiso de terminal. |

La sugerencia histórica de que el móvil firme con la clave privada del sistema no fue implementada: el servidor es el único emisor. No hay evidencia de una evaluación formal TOTP/JWT ni se la inventa.

## Decisión

La terminal valida localmente autorizaciones JWT/JWS RS256 multisede emitidas automáticamente por el backend, usando exclusivamente la clave pública aprovisionada y una copia firmada vigente que autoriza a su operador y sede.

### Evidencia y funcionamiento

1. [AutorizacionQrService.emitir](../../src/main/java/com/fitzonesports/acceso/offline/AutorizacionQrService.java) comprueba cuenta activa y membresía vigente; consulta períodos pagados no cancelados y emite ventanas de hasta 60 segundos dentro de un horizonte de dos horas. No autoriza huecos entre períodos. Las dos horas son una decisión del MVP, no una cifra exigida por el enunciado.
2. [OfflineController](../../src/main/java/com/fitzonesports/acceso/offline/OfflineController.java) expone `POST /api/v1/accesos/offline/credenciales/automaticas`, sin body ni sede. [obtenerQrAutomatico](../../frontend/src/services/offline/api.js), [SocioQRModal](../../frontend/src/modules/m2-acceso/SocioQRModal.jsx) y [QrOffline](../../frontend/src/modules/m2-acceso/QrOffline.jsx) guardan/seleccionan el token vigente; el navegador no firma tokens nuevos. Si ambos dispositivos están desconectados, el socio necesita ventanas obtenidas previamente.
3. [FirmaOffline](../../src/main/java/com/fitzonesports/acceso/offline/FirmaOffline.java) usa RSA de al menos 2048 bits, privada persistente PKCS8 exclusiva de M2; no deriva la clave del login. Sin configuración la preparación/emisión offline responde 503; no genera una clave temporal silenciosa. La UI puede recurrir al QR online anterior, que no proporciona la capacidad offline nueva.
4. El token nuevo lleva `tipo=m2-autorizacion`, `uid`, `permiso=INGRESO`, `ambito=FITZONE`, `jti` estable por usuario/minuto, `iss=fitzone-m2`, `aud=fitzone-acceso`, `iat/nbf/exp` y `kid`. La sede efectiva deriva de la copia del terminal, no de la sede habitual del socio.
5. [crypto.js](../../frontend/src/services/offline/crypto.js) verifica con jose: RS256, emisor, audiencia, tipo, clave conocida, fechas y permiso. La JWK proviene de preparación autenticada sobre HTTPS/localhost; no se instala una clave suministrada dentro del QR. La caducidad no tiene gracia. Se corrige desfase al preparar y se controlan retrocesos/cambios de reloj; no es un reloj resistente a manipulación física.
6. [registrarLocal](../../frontend/src/services/offline/movimientos.js) exige copia vigente, operador autorizado, bloqueos/presencias conocidos y `jti` no usado localmente. El resultado es provisional y sólo se anuncia tras persistir el movimiento. El mismo QR vigente puede identificar el egreso; también se permite egreso por visita conocida sin exigir una nueva membresía. Una copia vencida no admite movimientos nuevos.

La persistencia, envío y reconciliación se documentan en [ADR-007](ADR-007-tif-replica-y-reconciliacion.md). Este ADR decide cómo se autoriza la captura, no cómo el central integra los eventos. El lector [AccesoService](../../src/main/java/com/fitzonesports/acceso/service/AccesoService.java) acepta también el nuevo token, pero online vuelve a consultar estado comercial y presencia actuales. El QR HMAC y las credenciales por sede anteriores permanecen en circuitos de compatibilidad con reglas propias; no se distribuye ese secreto a los terminales.

## Consecuencias

- **Positivas:** continuidad acotada sin servidor local; ningún secreto de firma en Recepción; admisión de socios nuevos sin descargar su padrón; mismo QR automático utilizable online y offline.
- **Negativas:** una captura sigue siendo credencial al portador durante su ventana; la firma no identifica físicamente a la persona. Una suspensión/cancelación posterior a la emisión puede desconocerse hasta dos horas, además limitada por vigencia de la copia. Los bloqueos ya conocidos se rechazan.
- **Deuda asumida:** protección operativa de equipo/perfil y reloj; no hay rotación en caliente ni anillo de claves. La rotación exige caducar autorizaciones, conciliar pendientes y reprovisionar según la guía M2. No se garantiza RN-01 global entre sedes aisladas. La reconciliación no deshace físicamente un ingreso ya concedido.

## Requisitos relacionados

RNF-01 (disparador oficial), RF-03, RF-04, RF-05 y RN-01. El objetivo de disponibilidad 99,5 % requiere medición operativa independiente.

## Validación y límites

Se contrastó con [OpenAPI](../openapi/openapi.yaml), `FirmaOfflineTest`, `OfflineIntegrationTest` y `frontend/scripts/test-offline.mjs`, además de reportes y E2E existentes detallados en el [índice](../arquitectura-tif.md#evidencia-de-validación-consultada). Hay evidencia de socio posterior al corte, rotación real tras 65 segundos, rechazo de clave/permiso inválidos y suspensión conocida/diferida. No se acredita SLA, invulnerabilidad del dispositivo ni revocación inmediata. La aceptación de la decisión técnica conserva esos límites; autor y sprint siguen sin acreditarse. Ver [C4 M2](../diagramas/c4-03-m2.svg) y [secuencia offline](../diagramas/uml-secuencia-acceso-offline.svg).
