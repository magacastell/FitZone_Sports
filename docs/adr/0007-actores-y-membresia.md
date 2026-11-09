# ADR-007 — Autoridades estables y condición comercial derivada

## Estado

Aceptada en la revisión funcional y conceptual del 30/10/2026.

## Fecha

30/10/2026

## Contexto

Esta decisión continúa la serie del proyecto ADR-001 a ADR-006; no reemplaza el
ADR-001 de Monolito Modular. Complementa ADR-006 (JWT/Spring Security) y usa la
migración prevista por ADR-005 (Flyway). La revisión previa había reutilizado
erróneamente ADR-001 para este documento.

ADR-007 es el siguiente identificador verificable después de ADR-006 en el
repositorio. Queda pendiente conciliar esta numeración con los dos ADR/borradores
históricos sobre concurrencia y colaboración Git/GitHub cuyo número no pudo
recuperarse. No se les asigna un número ni se presupone su aprobación.

El registro público asignaba CLIENTE_EXTERNO y el seed también creaba SOCIO_ACTIVO.
La compra no cambiaba rol; M1 y M2 consultaban períodos, mientras clases/sidebar
interpretaban SOCIO_ACTIVO como autorización. No existe refresh de JWT ni enum
central de roles: Rol es una entidad con nombre persistido. El filtro JWT recarga
las autoridades desde PostgreSQL. No se encontró una especificación adicional del TP
en este checkout; se usan sus contratos y decisiones documentadas, explicitando límites.

## Decisión

| Capacidad | Autoridad | Membresía / otras condiciones |
|---|---|---|
| Administrar planes/sedes | GERENTE | No requiere membresía |
| Administrar usuarios/estados de membresía | RECEPCIONISTA/GERENTE | Sede para Recepción; no condiciona membresía propia |
| Emitir QR | USUARIO (GERENTE conserva permiso de contrato) | Cuenta activa y período vigente no suspendido, backend M2 |
| Validar ingreso/salida/aforo | RECEPCIONISTA/GERENTE | Ingreso valida titular; salida no exige membresía vigente |
| Reservar clase/lista de espera | USUARIO o GERENTE | USUARIO requiere vigencia backend; siguen stub 501 |
| Consultar/cancelar recursos propios | USUARIO o personal según contrato | No quitar recuperación al vencer; titularidad pendiente en stubs |
| Canchas/descuentos | USUARIO o personal según contrato | No implementar precios/descuentos: módulos aún stub |
| Contratar | USUARIO | No cuenta previa, plan activo, cobro aprobado, idempotencia |
| Renovar | USUARIO titular o GERENTE | No suspendida, plan activo, misma intención en retry |
| Ver comprobante | USUARIO titular o GERENTE | Pago real y autorización M5, no exige membresía vigente |
| Acceso entre sedes | Misma identidad | M1/M2 no restringen sede habitual del titular |

Socio es la condición funcional de un USUARIO con membresía ACTIVA. Sin beneficios
vigentes se presenta Cliente, conservando cuenta/historial y estado VENCIDA/SUSPENDIDA.
No se crean roles para vencimiento, suspensión, renovación o sede. React muestra el
estado del DTO; fechas/días restantes son exclusivamente presentación.

## Consecuencias positivas

- Una autoridad estable evita sincronizar roles/JWT con cada pago o vencimiento.
- La vigencia tiene una sola fuente de verdad en M1, reutilizada por M2 y los guards.
- Comprar actualiza la experiencia sin relogin ni duplicar cobros o reglas comerciales.
- Se conservan identidad, historial, pagos, sede habitual y documentos persistidos.

## Consecuencias negativas

- La migración V7 invalida JWT con autoridades comerciales anteriores: exige nuevo login.
- Backend y frontend deben adoptar el cambio como una sola migración funcional.
- Los consumidores deben consultar membresía para conocer beneficios; USUARIO no basta.
- La migración no implementa M3/M4, pasarela remota ni metadatos financieros ausentes.

## Alternativas consideradas

A: mutar el rol al pagar/vencer/suspender. Descartada: duplica tiempo comercial en
identidad, requiere sincronizar jobs, JWT y suspensión, sin mejorar la validación M2.
B: USUARIO, RECEPCIONISTA y GERENTE estables; condición comercial derivada de M1.
Elegida: alinea todos los permisos con lo que M1/M2 ya hacen sin reescribir pagos.
C: conservar nombres legados con aliases. Descartada: perpetúa dos interpretaciones.

## Migración y JWT

V7 crea USUARIO, reasigna los dos roles comerciales sin tocar IDs de usuarios ni
membresías/pagos/historial y elimina roles legados sin referencias. V1–V6 permanecen
intactas. Seed dev usa USUARIO. JWT lleva sólo autoridad estable; validar autoridad
actual contra claim rechaza tokens anteriores a la migración/cambio administrativo.
El frontend descarta tokens con autoridades desconocidas, sin aliases permanentes.
Después de comprar se aplica el DTO confirmado compartido, sin logout/login.

## Pagos y comprobantes

POST /membresias y /renovaciones ya cobran con CobroMembresiaService y emiten PDF.
El fake no tiene red: devuelve referencias determinísticas por clave. SQL comparte
la transacción M1; rechazo lanza 402 y revierte, sin conceder vigencia. Bloqueo por
titular, claves persistidas y trigger V5 protegen replay y períodos consecutivos.
No se introduce pasarela, cobro frontend ni transacción distribuida.
Para una pasarela remota futura siguen pendientes intentos durables/reconciliación:
rollback SQL no equivale a deshacer un cobro externo.
Los pagoId de los períodos permiten integrar GET /pagos/{id}/comprobante sin crear
un listado financiero duplicado. La UI identifica períodos y PDF, no inventa fechas
ni estados de pago; el PDF acredita el cobro original, incluso tras reembolso.

## Alcance y límites

Cliente sin cuenta ve catálogo real y contratación; cuenta histórica conserva portal
para renovar/ver períodos/PDF. Suspendida no inicia nueva renovación ni QR. Reintentos
pendientes conservan sus protecciones existentes. Roles internos no reciben secciones
comerciales. El máximo de anticipación no está definido; se conserva anexar períodos.
Clases/canchas/precios/informes siguen sin implementación de dominio; no se prometen
beneficios nuevos. La eliminación de los roles técnicos no elimina los actores del TP.

## Cierre de Canchas y Comprobantes

Cliente y Socio pueden conceptualmente reservar canchas: tarifa externa sin membresía
activa y beneficio de socio con ella, según la intención de dominio confirmada por el
usuario. El importe, porcentaje y fórmula de M4 no están implementados ni acordados en
el contrato draft. USUARIO habilita la operación futura; no concede una tarifa reducida.
Los controllers siguen 501 y las pantallas directas informan no disponibilidad.
En el corte de esta decisión Clases/Canchas quedaron fuera del menú operativo.
La preparación frontend posterior ofrece vistas de consulta por actor con mensajes
de servicio pendiente; no habilita reservas ni cambia esta decisión de dominio.
Ver [preparación M3/M4](../m3-m4-frontend.md).

La lista de comprobantes reutiliza períodos con pagoId, incluso vencidos/cancelados:
no equivale al listado financiero general de M5. Ordena por inicio del período, sin
atribuir esa fecha a emisión o pago. No conoce número de comprobante ni reembolso;
no fabrica badges financieros. La descarga sigue autorizada en backend por titularidad.
Sin cuenta de membresía, la URL personal vuelve al catálogo; personal interno no ve
historial comercial propio. Ocultar el enlace no es la protección del PDF.

El nuevo diseño PDF modifica sólo emisiones nuevas o recuperaciones históricas que
carecen de bytes, preservando número, emisión, fecha de pago y datos del cobro original.
DatosComprobante es un dato interno de renderizado, no un DTO HTTP nuevo. Los bytes ya
guardados se devuelven sin regenerar ni consultar titular/plan actuales. Plan/precio
provienen del período snapshot; el titular se captura al emitir. Un pago antiguo sin
PDF no dispone de snapshot previo del titular: la recuperación existente usa su cuenta
actual, limitación explícita que este bloque no puede reconstruir retrospectivamente.

Los dos commits propuestos son cortes de revisión de una única migración funcional.
No deben adoptarse ni desplegarse independientemente.
