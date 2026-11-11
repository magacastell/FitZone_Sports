# ADR-005 — Spring Boot, inyección de dependencias y persistencia híbrida JPA/SQL

- **Estado:** Aceptado
- **Fecha:** 2026-11-10 (redacción documental).
- **Fecha histórica de decisión:** No acreditada; el antecedente de backend registraba una propuesta.
- **Autor:** Pendiente de identificación y revisión grupal.
- **Sprint:** Pendiente de contraste con la planificación histórica.

## Contexto

El backend necesitaba exponer una API REST, coordinar operaciones transaccionales y mapear el modelo relacional con un ORM. Debía poder sustituir dependencias al probar reglas de negocio, en un equipo con experiencia desigual en Java y JavaScript según el [antecedente de backend](https://docs.google.com/document/d/1q0KQEPx2GLgVTCo24nMkRuCKm-tUyrN_KnfwJTvSewA/edit). El enunciado admitía Spring Boot o alternativas Node/NestJS y exigía ORM/Repository. Elegir un framework no resolvía automáticamente concurrencia, seguridad ni integración de los cinco dominios.

El ADR histórico equivalente era el **ADR-003** de backend; su estado era Propuesto. La numeración oficial de los lineamientos §5.2.1 lo ubica aquí en ADR-005. No se sustituye ni renumera el antecedente.

## Alternativas consideradas

Las alternativas y razones históricas proceden de ese documento y de [Unidad I, §3.3](https://docs.google.com/document/d/1sgUz-_ovSKQPJSD3dFt6M5ycwiDxV6LK/edit); no se presentan como experimentos nuevos.

| Alternativa | A favor | En contra | Por qué se descartó |
|---|---|---|---|
| NestJS/TypeScript | Estructura de aplicación e inyección de dependencias. | El antecedente indicaba falta de experiencia del equipo con TypeScript. | Se priorizó el ecosistema Java elegido. |
| Express/JavaScript + ORM adicional | Experiencia previa del equipo con esa combinación. | Habría requerido seleccionar/integrar un ORM y mecanismos adicionales. | El antecedente prefirió una base integrada para REST y persistencia. |
| Spring con JDBC exclusivamente | SQL explícito y control de consultas. | No constituye ORM, requerido para el trabajo. | Descartado como estrategia exclusiva; JDBC sí se usa como complemento actual. |
| Hibernate nativo/EntityManager sin Spring Data | ORM y control fino sobre consultas. | Mayor código manual de acceso a datos. | El antecedente priorizó reducir carga repetitiva. |
| Spring Boot + Spring Data JPA/Hibernate | IoC, transacciones y repositorios integrados; sustitución de dependencias. | Configuración, aprendizaje y riesgos de mapeo/ciclo de vida. | Adoptada, con SQL explícito donde el código lo necesita. |

## Decisión

Se utiliza Spring Boot con inyección de dependencias, Spring Data JPA sobre Hibernate y repositorios para la persistencia del modelo, complementados por JdbcTemplate y EntityManager en operaciones específicas.

### Evidencia y justificación

- [pom.xml](../../pom.xml): Spring Boot **4.1.1**, Java **21**, starters WebMVC, Data JPA, Security y Flyway. Es un proyecto Maven; no se infieren versiones desplegadas a partir de una recomendación histórica.
- [AccesoService](../../src/main/java/com/fitzonesports/acceso/service/AccesoService.java) y servicios offline usan `@Service` y dependencias por constructor; Lombok genera varios constructores. [MembresiaService](../../src/main/java/com/fitzonesports/membresia/service/MembresiaService.java) muestra constructor explícito y `@Transactional`.
- [AccesoConfig](../../src/main/java/com/fitzonesports/acceso/config/AccesoConfig.java) publica `Clock` como bean. Permite controlar el tiempo en pruebas sin cambiar la lógica ni esperar todos los vencimientos.
- [UsuarioRepository](../../src/main/java/com/fitzonesports/usuario/repository/UsuarioRepository.java) y [RegistroAccesoRepository](../../src/main/java/com/fitzonesports/acceso/repository/RegistroAccesoRepository.java) extienden `JpaRepository`; `@EntityGraph` carga rol/sede en consultas de usuario. Repository existe como interfaces Spring Data, no como una capa adicional inventada para el diagrama.
- [Membresia](../../src/main/java/com/fitzonesports/membresia/model/Membresia.java), [PeriodoMembresia](../../src/main/java/com/fitzonesports/membresia/model/PeriodoMembresia.java) y [RegistroAcceso](../../src/main/java/com/fitzonesports/acceso/model/RegistroAcceso.java) son entidades. Hibernate valida el esquema; [ADR-002](ADR-002-tif-postgresql-e-integridad.md) describe su evolución mediante Flyway.
- [SincronizacionOfflineService](../../src/main/java/com/fitzonesports/acceso/offline/SincronizacionOfflineService.java) implementa inbox, bloqueos y accesos con `JdbcTemplate` en una transacción. Varias tablas offline no tienen entidades ni repositorios JPA. `AccesoService` combina JPA, `SELECT ... FOR UPDATE`, SQL para `qr_jti` y `EntityManager.refresh` al registrar egreso.
- [PasarelaPagoFake](../../src/main/java/com/fitzonesports/pago/pasarela/PasarelaPagoFake.java) es una implementación inyectable de `PasarelaPago`. La selección por propiedad y los dobles en pruebas permiten variar resultados sin un proveedor real.

La solución reduce código repetitivo y conserva control SQL para integridad/reconciliación. No se afirma que todas las operaciones pasen por un repositorio ni que el ORM permita cambiar de motor sin adaptar SQL, índices y migraciones.

## Consecuencias

- **Positivas:** dependencias explícitas y sustituibles; servicios transaccionales y repositorios reutilizables; mapeo ORM coherente con el requisito académico.
- **Negativas:** coste de configuración/aprendizaje; potenciales consultas N+1 y estados JPA desactualizados al combinar SQL directo; comportamiento transaccional que debe probarse con el motor real.
- **Deuda asumida:** accesos cruzados a tablas y SQL específico hacen parcial la abstracción Repository. Los límites de transacción y bloqueos no son automáticos por adoptar JPA. La evolución de módulos y de pagos remotos exige revisar esas fronteras; no se generaliza el patrón de bloqueo de M2 a M4 sin su implementación.

## Requisitos relacionados

Unidad II (disparador oficial), Repository/ORM del enunciado p. 15, RF-01, RF-02, RF-04, RF-05, RF-13 y RF-14; RN-01 y RN-02 para delimitar garantías de concurrencia, sin acreditar M4.

## Validación y límites

Se contrastaron entidades, servicios, repositorios, migraciones y tests del corte `d4ceaa3`. Los reportes existentes incluyen pruebas con Spring/PostgreSQL, tests de servicios con dobles y validación de contratos: ver [evidencia](../arquitectura-tif.md#evidencia-de-validación-consultada). No se corrieron nuevas pruebas de negocio ni se certifica ausencia de N+1 o desacoplamiento completo. La decisión técnica se registra como Aceptada; autor y sprint quedan pendientes de identificación histórica. Ver [componentes M2](../diagramas/c4-03-m2.svg).
