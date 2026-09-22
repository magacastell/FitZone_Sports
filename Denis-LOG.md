## Período 2 — Semana 1

### [Tu Nombre] — 18/09/2026

* **[S1] Investigación sobre Concurrencia (RN-02)** — *1.5 hs*
  * Investigó estrategias para garantizar la consistencia estricta en las reservas de canchas y evitar la sobreventa (*double booking*).
  * Evaluó el uso de restricciones de unicidad (`UNIQUE`) en PostgreSQL combinadas con bloqueo pesimista (`PESSIMISTIC_WRITE` / `SELECT ... FOR UPDATE`) en la capa de persistencia con Spring Data JPA.

* **[S1] Redacción de Registros de Decisiones de Arquitectura (ADR-001)** — *2.0 hs*
  * Redactó y estructuró formalmente el **ADR-001: Adopción de una Arquitectura de Monolito Modular** siguiendo la plantilla solicitada por la cátedra.
  * Documentó el contexto, la decisión, los costos/limitaciones explícitos y las alternativas descartadas (Microservicios y Monolito en Capas), respaldando la justificación en el tamaño del equipo (4 devs), el soporte de transacciones ACID y la baja complejidad operativa.

* **[S1] Planificación de la Estrategia Design First** — *1.0 hs*
  * Planificó el enfoque *Design First* para el desarrollo y desacoplamiento entre el Frontend (React) y el Backend (Spring Boot).
  * Definió las pautas para estructurar contratos OpenAPI 3.0 (YAML), servidores de simulación (*Mocks* con Prism) y el estándar unificado para el manejo de errores mediante RFC 7807 (Problem Details).