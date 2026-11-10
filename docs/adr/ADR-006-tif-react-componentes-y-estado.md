# ADR-006 — React, componentes propios y estado frontend

- **Estado:** Propuesto
- **Fecha:** 2026-11-10 (redacción documental; fecha de ratificación pendiente)
- **Autor:** Pendiente de identificación y revisión grupal.
- **Sprint:** Pendiente de contraste con la planificación histórica.

## Contexto

El portal y la consola necesitaban formularios, navegación y visualización de datos cambiantes de membresías, accesos y disponibilidad. Había elementos comunes entre pantallas y una API REST separada. El equipo necesitaba reutilizar presentación y representar el estado de sesión sin trasladar al navegador la autoridad sobre vigencia comercial o permisos. El modo offline agregaba estado durable que debía sobrevivir a recargas y no podía depender sólo de los hooks de una pantalla.

El [ADR-004 histórico de React](https://docs.google.com/document/d/1sgUz-_ovSKQPJSD3dFt6M5ycwiDxV6LK/edit) registró aceptación el 2026-09-05. No documentó una selección comparativa de gestores globales ni de bibliotecas visuales. Se preserva esa diferencia frente al ADR-006 oficial, que exige describir los tres aspectos.

## Alternativas consideradas

| Alternativa | A favor | En contra | Por qué se descartó |
|---|---|---|---|
| Vue | Componentes reactivos y consumo REST; contemplado por el enunciado. | Requería adoptar su ecosistema en lugar del elegido. | El antecedente priorizó React para el enfoque de componentes del equipo; no aportó benchmark. |
| HTML/CSS/JavaScript sin React | Menos dependencias y configuración inicial. | Reutilización, actualización del DOM y organización del estado debían resolverse manualmente al crecer las pantallas. | Razón registrada en el antecedente de React. |
| React | Composición y estado declarativo para interfaces dinámicas. | Necesita decisiones adicionales de rutas, estado, errores y persistencia. | Adoptada y verificable en el código. |
| Context/hook local + componentes propios | Coincide con la implementación, sin un store central de todo el dominio. | Coordinación de peticiones y estados repartida entre pantallas. | Adoptada de hecho; falta acta de elección comparativa para estado/UI. |

No hay evidencia de evaluación real Redux/Zustand, Material UI u otras bibliotecas. No se inventan descartes. La revisión grupal debe ratificar el uso actual de Context y componentes propios como decisión explícita.

## Decisión

Se construye una aplicación React por componentes, con una biblioteca visual propia, Context para la sesión, hooks para estado de pantalla y servicios separados para transporte y persistencia offline.

### Evidencia y justificación

- [package.json](../../frontend/package.json): React/ReactDOM `^18.3.1`, React Router `^6.26.0`, Vite `^5.3.4`, `lucide-react`, `qrcode.react`, Dexie y jose. Los rangos declarados no se presentan como versiones exactas de cada instalación.
- [FitZoneUI](../../frontend/src/components/ui/FitZoneUI.jsx) y su CSS aportan `AppButton`, `AppLink`, badges y encabezados propios. Lucide aporta iconos y qrcode.react genera QR; ninguna constituye una biblioteca completa de widgets de dominio.
- [AuthContext](../../frontend/src/context/AuthContext.jsx): `AuthProvider/useAuth`, token en `localStorage` y estado React de usuario/carga/sesión. Decodifica claims para presentación; la autorización real queda en backend. Logout elimina el acceso rápido offline del socio, sin borrar la cola de Recepción ni garantizar revocación de material ya copiado.
- [AppRoutes](../../frontend/src/routes/AppRoutes.jsx), [ProtectedRoute](../../frontend/src/components/ProtectedRoute.jsx) y [Layout](../../frontend/src/components/Layout.jsx) organizan rutas y navegación. `/terminal-offline` y `/qr-offline` tienen recorridos autónomos que no dependen del Layout online.
- [api.js](../../frontend/src/services/api.js) centraliza transporte y sesión; los adaptadores por módulo no convierten un endpoint pendiente en una funcionalidad implementada. [estadoCuenta](../../frontend/src/modules/m1-usuarios/estadoCuenta.js) usa datos de M1 para presentación comercial.
- [TerminalOffline](../../frontend/src/modules/m2-acceso/TerminalOffline.jsx) mantiene UI/temporizadores con hooks y delega captura a `registrarLocal` y envío a `sincronizar`. [db.js](../../frontend/src/services/offline/db.js) conserva datos durables en IndexedDB/Dexie, no en Context.
- [sw.js](../../frontend/src/sw.js) precachea recursos estáticos y permite navegación de la PWA cuando falla la red. No cachea respuestas API ni ejecuta una cola de POST por Workbox; la cola de negocio tiene implementación propia.

Esta distribución permite reutilizar controles y separar estado efímero, sesión y movimientos durables sin incorporar un gestor global adicional. No se declara una implementación completa de Atomic Design: existen componentes propios, pero no una taxonomía atoms/molecules/organisms verificada. Tampoco hay aplicación móvil nativa en este corte; el socio usa el portal web responsive.

## Consecuencias

- **Positivas:** presentación reutilizable; rutas por actor y módulos; recuperación offline persistente sin exigir un proceso local; reglas de negocio centrales conservadas en backend.
- **Negativas:** coordinación manual de efectos, peticiones, temporizadores y actualizaciones entre vistas; token accesible al JavaScript del origen en `localStorage`; obligación de proteger el contexto del navegador. Un guard visual no protege datos de la API.
- **Deuda asumida:** no consta selección formal de estado global/UI; no hay instrumentación de cobertura frontend. Los harness VM no reproducen todo React real. IndexedDB puede perderse al borrar el perfil y no sustituye un respaldo. M3/M4 muestran estados de servicio pendiente y necesitan contraste con sus responsables.

## Requisitos relacionados

Unidad IV (disparador oficial), RF-01, RF-02, RF-04, RF-05 y RNF-01; interfaces de RF-06 a RF-14 sujetas al estado real de cada backend.

## Validación y límites

Se leyeron componentes, Context, servicios, scripts de prueba y build PWA. Las seis suites Node y el build están documentados en [pruebas](../pruebas.md); los reportes recuperables y la E2E real de M2 se describen en el [índice](../arquitectura-tif.md#evidencia-de-validación-consultada). Son verificaciones preexistentes, no ejecuciones nuevas. No acreditan usabilidad completa, cobertura frontend ni operaciones pendientes de M3/M4. Autor, sprint y ratificación del enfoque de estado/UI quedan pendientes. Ver [ADR-007](ADR-007-tif-replica-y-reconciliacion.md) para datos durables y [C4-2](../diagramas/c4-02-contenedores.svg) para sus instancias de ejecución.
