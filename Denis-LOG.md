# Ignacio Denis

## Período 2 — Semana 1

### 18/09/2026

* **[S1] Investigación sobre Concurrencia (RN-02)** — *1.5 hs*
  * Investigó estrategias para garantizar la consistencia estricta en las reservas de canchas y evitar la sobreventa (*double booking*).
  * Evaluó el uso de restricciones de unicidad (`UNIQUE`) en PostgreSQL combinadas con bloqueo pesimista (`PESSIMISTIC_WRITE` / `SELECT ... FOR UPDATE`) en la capa de persistencia con Spring Data JPA.

* **[S1] Redacción de ADRs Pendientes** — *2.0 hs*
  * Redactó y estructuró formalmente los **ADR-005: Herramienta de Versionado y Migración de Base de Datos** y **ADR-006: Autenticación y Autorización basada en JWT con Spring Security** siguiendo la plantilla solicitada por la cátedra.

* **[S1] Planificación de la Estrategia Design First** — *1.0 hs*
  * Planificó el enfoque *Design First* para el desarrollo y desacoplamiento entre el Frontend (React) y el Backend (Spring Boot).
  * Definió las pautas para estructurar contratos OpenAPI 3.0 (YAML) y el estándar unificado para el manejo de errores mediante RFC 7807 (Problem Details).

### 23/09/2026

* **[S1] Definición de Estrategia Design First y Criterios Comunes de API** — *2.5 hs*
  * criterios comunes de API: semántica HTTP (Nivel 2 de Richardson), respuestas de error unificadas bajo RFC 7807 / RFC 9457 (`ProblemDetail`) y cabeceras de idempotencia (`X-Idempotency-Key`).

* **[S1] Definición de Estrategia de Concurrencia y Versionado de Base de Datos** — *2.0 hs*
  * Estrategia de concurrencia optimista (`ETag` / `If-Match`) para la modificación de turnos y bloqueos pesimistas para evitar la sobreventa (*double booking*).

* **[S1] Revisión de Diagramas C4 y Soporte Offline** — *1.5 hs*
  * Inconsistencia en C4 delimitando a `Usuario` como entidad base única con relación opcional hacia `Membresia`.
  * Componentes necesarios en C4 Nivel 3 para el Módulo M2 (Acceso al Gimnasio) para soportar la contingencia offline (caché local de socios y servicio de sincronización diferida).