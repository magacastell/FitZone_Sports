# Bitácora del equipo — FitZone Sports

## Unidad I — Arquitectura

### Semana 1

#### Augusto — 26/08/2026

- Participó en la primera reunión de organización del equipo y fue elegido líder inicial mediante el mecanismo acordado por el grupo.
- Participó en la discusión inicial de arquitectura y tecnologías. El equipo acordó React para el Frontend Web, Java con Spring Boot para el Backend, PostgreSQL como base de datos y Monolito Modular como arquitectura principal.
- Comenzó a organizar la base colaborativa del Entregable Nº 1, centrada en los diagramas C4 y los ADR.
- Quedaron decisiones y detalles del entregable pendientes de validación con el profesor.

#### Bautista — 03/09/2026

- Revisó el ADR-002 correspondiente a la decisión de utilizar PostgreSQL como base de datos relacional.
- Contrastó la redacción del ADR con la consigna del caso FitZone Sports y con la definición técnica provista por la cátedra.
- Se ajustó el contexto para reflejar la necesidad de integridad de datos, transaccionalidad en pagos y consistencia de reservas ante operaciones concurrentes.
- Se dejó explícito que PostgreSQL no resuelve automáticamente la concurrencia, el rendimiento, la disponibilidad ni la escalabilidad, sino que estas características dependen del diseño de transacciones, restricciones, índices y decisiones arquitectónicas adicionales.
- Se confirmó que PostgreSQL es una decisión establecida por la cátedra, por lo que no corresponde documentar motores alternativos como si hubieran sido evaluados por el equipo.
- Se completó la fecha del ADR con 03/09/2026.

#### Ignacio — 04/09/2026

- Redactó el ADR-001 correspondiente a la adopción de una arquitectura de Monolito Modular para el backend de FitZone Sports.
- Desarrolló el contexto, la decisión, las alternativas consideradas y las consecuencias (positivas y negativas) del patrón arquitectónico.
- Justificó la decisión basándose en el tamaño del equipo (4 desarrolladores), la necesidad de velocidad de desarrollo (Time-to-Market) y la menor complejidad operativa frente a microservicios.
- Priorizó la garantía de transacciones ACID fuertes compartidas en el mismo proceso para asegurar la consistencia en las reservas de canchas y evitar la sobreventa.
- Documentó explícitamente las limitaciones de la decisión, incluyendo el acoplamiento de despliegue, la escalabilidad horizontal global y el riesgo de degradación hacia un monolito tradicional si no se respetan las fronteras entre módulos.

#### Magali — 05/09/2026

- Redactó el ADR-004 correspondiente a la elección de React para el Frontend Web de FitZone Sports.
- Desarrolló el contexto, la decisión, las consecuencias positivas y negativas y las alternativas consideradas.
- Justificó la elección de React en función de las necesidades del sistema: construcción de una interfaz web mantenible, reutilización de componentes, manejo de información dinámica e integración con la API REST del backend desarrollado con Spring Boot.
- Relacionó la decisión con la evolución prevista del frontend del proyecto.
- Analizó los costos y limitaciones de la decisión, incluyendo la incorporación de una tecnología adicional, la necesidad de definir criterios para el manejo del estado y el riesgo de una organización inadecuada de los componentes.

#### Valentina Martínez — 05/09/2026

- Redactó el ADR-003 correspondiente a la elección de Spring Boot y Spring Data JPA como framework y mecanismo de persistencia del Backend API de FitZone Sports.
- Desarrolló el contexto, la decisión, las consecuencias (positivas, negativas y neutras) y las alternativas consideradas.
- Justificó la decisión en función del requisito de ORM del trabajo práctico, del control de concurrencia en la reserva de canchas y la inyección de dependencias necesaria para los patrones que deben adoptarse.
- Evaluó como alternativas NestJS, Express.js, JDBC directo y Hibernate nativo, descartando cada una según restricciones concretas del equipo.
- Dejó pendiente, en un ADR separado, la decisión sobre el uso de Spring Security para autenticación y autorización para debatir en grupo.
- Dejó pendientes sugerencias de posibles ADRs para elegir en grupo y redactar.

#### Claudio — 03/09/2026

- Construyó el diagrama C4 de Contexto de FitZone Sports en Archi, mostrando el sistema en alcance, las personas que interactúan con él y el sistema externo.
- Modeló como personas (Business Actor) al Socio activo, Cliente externo, Recepcionista/Administrador de sede y Gerente central, y como sistema externo (Application Component) a la Pasarela de pago simulada.
- Etiquetó las cinco relaciones de forma unidireccional, con un texto que tiene sentido en la dirección de la flecha (por ejemplo, "Reserva clases y canchas, gestiona su membresía" desde Socio activo hacia FitZone Sports).
- No incluyó tecnologías, protocolos ni detalles internos del sistema, respetando el alcance del nivel de Contexto.
- Completó Documentation (responsabilidad/descripción) para los seis elementos del diagrama y agregó título y leyenda a la vista.