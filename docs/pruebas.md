# Pruebas de FitZone: ejecución, alcance y pendientes

Corte: 09/11/2026. Base auditada e4fe538, rama chore/auditoria-pruebas-cierre.
Corrección focalizada de Planes/PDF: eb85ed2.
El inventario y las métricas de esa auditoría son históricos. El cierre posterior
de M1/M2 online (85 tests y foto en Recepción) se registra al final de este documento.
No es ADR-008 ni una declaración de cumplimiento de todos los RF. No hay un umbral
de cobertura aprobado: el equipo debe definirlo con la evidencia de abajo.

## Ejecutar y reutilizar

Frontend (Node 24.15.0/npm; dependencias según package-lock):

```powershell
cd frontend
npm ci                 # sólo si faltan las dependencias
npm test               # las cinco suites; falla si alguna suite falla
npm run build          # compilación, no una prueba funcional
```

Para focalizar: npm run test:api, test:dominio, test:planes, test:actividades o
test:gerencia. Estas pruebas no necesitan API ni PostgreSQL. El aviso experimental
corresponde a vm.SourceTextModule; no se oculta ni se confunde con un fallo.

Backend completo, desde la raíz, con Docker y PowerShell:

```powershell
./scripts/pruebas-backend.ps1
```

El script construye el target build del Dockerfile existente (Java 21), crea PG 18
con nombre único y tmpfs, sin puertos publicados ni volúmenes compartidos. Monta
src/docs/pom sólo lectura; ejecuta clean verify en el contenedor y copia reportes
a target/test-runs/<id>/surefire-reports y target/test-runs/<id>/jacoco. Al finalizar
elimina únicamente los dos contenedores que creó, incluso ante un fallo. El método
de confianza de PG es exclusivamente para esa instancia descartable; no configura
el servicio de desarrollo ni producción. Se requiere red para imágenes/dependencias
que aún no estén en caché.

Si ya existe una imagen build compatible, se puede reutilizar:

```powershell
./scripts/pruebas-backend.ps1 -Image fitzone-tests:local -SkipImageBuild
./scripts/pruebas-backend.ps1 -Image fitzone-tests:local -SkipImageBuild -Tests 'FotoPerfilServiceTest,RegistroConflictosTest,RegistroIdentidadIntegrationTest'
```

El cuerpo sh entra por stdin: evita el problema previo de comillas entre Windows,
Docker y sh -c. El exit code de Maven se conserva. No usar -SkipImageBuild con una
imagen que tenga otro wrapper/pom base incompatible; ante cambios de herramientas,
volver al comando completo.

Con JDK 21 y Maven Wrapper disponibles también se puede usar ./mvnw clean verify
(mvnw.cmd en Windows). PLAN_TEST_DB_URL debe señalar exclusivamente una PG vacía y
descartable, usuario postgres sin password como fijan los tests; JAVA_TOOL_OPTIONS
debe incluir -Duser.timezone=America/Argentina/Buenos_Aires. No apuntar a una BD de
trabajo: las suites crean fixtures y esquemas y prueban migraciones. Sin esa variable
se omiten las pruebas PG (57 en el corte original, 61 tras el cierre online);
ese resultado NO acredita suite completa.

Selección backend nativa: ./mvnw '-Dtest=PlanServiceTest,PlanControllerTest' test.
La exportación visual opcional del PDF se obtiene con
./mvnw '-Dtest=ComprobantePdfRendererTest' -Dfitzone.tests.exportar-ejemplos=true test.
Las aserciones de contenido, paginación y total se ejecutan también sin exportar.

## Inventario frontend

Herramientas: node:assert/strict, vm.SourceTextModule/SyntheticModule y esbuild para
transformar JSX (ya disponible con Vite). No son React DOM ni un navegador real.

| Script | Unidad que cuenta su salida | Resultado final | Llamadas a assert ejecutadas |
|---|---|---:|---:|
| test-api.mjs | 18 callbacks de transporte JSON/PDF/multipart, errores, JWT/401 y servicios M1/M2 | 18 OK | 61 |
| test-dominio.mjs | 181 invocaciones de callbacks, muchas parametrizadas por estado/rol/error, en un harness compartido | 181 OK | 921 |
| test-planes.mjs | 16 callbacks de gestión, permisos y transporte de planes | 16 OK | 73 |
| test-servicios-actividades.mjs | 18 métodos de adaptadores M3/M4; cada uno verifica ruta, método, body, retorno y error | 18 OK | 90 |
| test-gerencia-service.mjs | 2 reexports y 5 métodos de transporte | 7 OK | 27 |

Los 181 no son 181 assertions ni 181 pruebas independientes de React/E2E. El total
de 240 unidades de ejecución mezcla callbacks, variantes, métodos y reexports;
no debe sumarse a los tests JUnit como si fueran una misma medida de cobertura.
Los contadores publicados por las suites ya tenían esta granularidad; no se renombró
el resultado para aparentar más o menos pruebas.

Las 1172 llamadas assert se contaron en una ejecución de auditoría instrumentada
en memoria, sin modificar los tests guardados. Incluyen helpers y variantes de
bucles; una conjunción dentro de assert sigue siendo una sola llamada. No son una
métrica permanente ni un porcentaje de cobertura. La ejecución normal se verificó
por separado mediante npm test.

## Inventario backend

JUnit Jupiter, Mockito, Spring Test/MockMvc/Security, Spring Data/Flyway/PostgreSQL,
PDFBox, ImageIO y SnakeYAML. Hay 13 clases y 81 métodos @Test; no hay tests
parametrizados de JUnit. Varios métodos recorren listas de datos internamente.

| Clase | Métodos @Test | Tipo / alcance | PG | Sitios assert / andExpect / verify |
|---|---:|---|---|---|
| MembresiaControllerTest | 2 | MVC aislado: DTO, header y validación | No | 0 / 5 / 2 |
| MembresiaIntegrationTest | 35 | API/servicios reales M1/M2, estados, sedes, QR, idempotencia, migraciones y concurrencia de alta; pasarela doble | Sí | 119 / 48 / 1 |
| OpenApiMembresiaContractTest | 1 | YAML y resolución recursiva de referencias locales | No | 2 / 0 / 0 |
| PlanAuthorizationTest | 3 | Seguridad de métodos Spring, servicio doble | No | 12 / 0 / 0 |
| PlanControllerTest | 2 | MVC aislado, payloads y respuestas con servicio doble | No | 0 / 10 / 2 |
| PlanPersistenceTest | 8 | Persistencia, unicidad concurrente y migraciones | Sí | 20 / 0 / 0 |
| PlanServiceTest | 7 | Lógica de catálogo con repositorio doble | No | 15 / 0 / 3 |
| ComprobantePdfRendererTest | 2 | PDF real, texto, paginación y total; sin servidor | No | 5 / 0 / 0 |
| PagosIntegrationTest | 11 | PG, PDF persistido, permisos, reembolsos y concurrencia; pasarela sustituible | Sí | 34 / 15 / 4 |
| PasarelaPagoFakeTest | 2 | Simulador y referencias determinísticas | No | 9 / 0 / 0 |
| FotoPerfilServiceTest | 4 | Imagen real, límites y contenido; repositorios dobles | No | 13 / 0 / 4 |
| RegistroConflictosTest | 1 | Tres restricciones en un método, traducción selectiva | No | 5 / 0 / 1 |
| RegistroIdentidadIntegrationTest | 3 | Multipart, identidad duplicada, perfil y foto privados contra PG | Sí | 2 / 20 / 0 |

Última columna: sitios estáticos de invocación de APIs JUnit, MockMvc y Mockito,
no cantidad ejecutada. Bucles, helpers, recorrido de $ref y tareas concurrentes
alteran el número dinámico; no hay un contador runtime de assertions Java instalado.
No se presenta una estimación estática como assertions efectivamente ejecutadas.
Los 57 métodos PG y los otros 24 pasan en la ejecución completa descrita abajo.
Una prueba de regresión describe su propósito (401, DNI, retry), no un nivel nuevo:
puede ser unitaria, de componente o integración.

No hay suite E2E automatizada de navegador versionada. MockMvc con Spring/PG es
integración de API sin socket; las pruebas VM tampoco equivalen a E2E. Las revisiones
manuales y el proxy de respuesta perdida anteriores son antecedentes históricos,
no ejecuciones nuevas de esta auditoría.

## Hallazgos y depuración aplicada

- Base frontend: transporte 18, dominio 181, actividades 18 y Gerencia 7 pasaron;
  Planes tuvo 13 OK y 3 fallos. Su mock devolvía sólo default para FitZoneUI, aunque
  Layout importa AvatarCircle. Se agregó el export explícito conservando las
  expectativas de permisos. El avatar real sigue probado en test-dominio.
- Se quitaron cinco helpers y un import sin usos de test-planes. Se eliminó una
  variante idéntica USUARIO -> /membresia repetida en el mismo bucle. No se eliminó
  ningún callback ni método @Test, ni se redujeron expectativas de casos distintos.
- Los harness VM de Planes y Dominio comparten código y simulan hooks, temporizadores
  y renders. Selectores por texto, orden de nodos y exportar funciones internas son
  frágiles. Los fallbacks genéricos de módulos pueden ocultar cambios en imports por
  defecto. Se conserva esta deuda: una reescritura de ambos runners cerca del cierre
  añade riesgo. No migramos a otro framework ni afirmamos comportamiento de React real.
- Frontend/backend validando el mismo dato no son duplicados equivalentes: protegen
  fronteras diferentes. Tampoco se eliminan tests de transporte por parecer simples:
  detectan cambios de rutas, headers, payload y propagación de errores.
- Se conservan identidad, roles/propiedad/sedes, no doble presencia, snapshots, PDF,
  fallos de cobro, reembolso, idempotencia y concurrencia reales. No se borraron tests
  fallidos para conseguir verde. El test de PDF largo costó 20,78 s en la base y se
  mantiene; exportar PDF/PNG sin assertions es ahora una opción manual, no un paso
  necesario de cada ejecución. No se atribuye una mejora de velocidad no medida.
- Se agregó ejecución npm con && y runner backend que conserva exit code, a diferencia
  de encadenar comandos con ; y terminar viendo sólo el éxito de un build posterior.
- Se agregó JaCoCo como plugin de testing Maven, sin dependencias funcionales, exclusiones
  artificiales ni umbral arbitrario. Los stubs permanecen en el denominador.

## Resultado y cobertura medidos

La suite backend base clean verify dio 81 tests, 0 fallos/errores/omitidos. Tras los
cambios volvió a dar 81/0/0/0 con Java 21 y PG 18 nueva. Se compararon los nombres
de los casos en ambos conjuntos de XML: son los mismos 81. No había porcentaje
base medido, por lo que no se afirma una comparación porcentual antes/después.

JaCoCo 0.8.14, backend completo: líneas 748 cubiertas y 138 sin cubrir (84,42 %);
ramas 281/378 (74,34 %); instrucciones 4537/5352 (84,77 %). HTML, XML y CSV se generan
en target/site/jacoco; en Docker se copian a target/test-runs/<id>/jacoco.
Abrir index.html para el detalle por paquete/clase. No se versionan los reportes.
No hay porcentaje de cobertura frontend: no se instaló instrumentación JS.

Estos porcentajes no acreditan RF pendientes: un controller que devuelve 501 puede
tener líneas cubiertas y no implementar el caso de uso. SedeService sólo alcanzó
3 de 28 líneas y sus 10 ramas quedaron sin cubrir: falta su cobertura específica.
No se inventa el umbral de ADR-008 a partir de un resultado favorable.

## Trazabilidad y brechas (no implementadas por esta subrama)

| Requisito | Evidencia existente | Pendiente para cerrar su módulo |
|---|---|---|
| RF-01 | RegistroIdentidad, RegistroConflictos, FotoPerfil, dominio/api frontend | Foto en Recepción A y escritura administrativa D requieren acuerdo; E2E navegador |
| RF-02 | MembresiaIntegration, planes, pagos y dominio frontend | E2E integrado; distinguir pruebas del servicio automático de una ejecución real del scheduler |
| RF-03 | ingresoMultisedeSalidaTrasVencerYAforo y permisos manipulados | Recorrido con dataset final de varias sedes |
| RF-04 | QR inválido/vencido/reemplazado, vigencia y UI sintética | Terminal offline y sincronización |
| RF-05 | Entrada/salida, count de aforo y respuesta frontend | Medición de frescura y recorrido final de Recepción |
| RF-06 | Adaptador M3 y pantalla con 501 | CRUD de agenda/instructor/sede, validaciones y permisos reales |
| RF-07 | Rutas y mensajes preparados; guard de vigencia sobre stub | Cupos, concurrencia, ventanas 48 h/2 h, cancelación y propiedad |
| RF-08 | Transporte espera, sin Observer funcional | Orden, duplicados, evento tras commit y notificación real |
| RF-09 | Transporte M4 y UI preparada | CRUD de canchas por sede y permisos |
| RF-10 | Transporte de turnos y reservas | Disponibilidad y ciclo de reserva real |
| RF-11 | No hay Strategy funcional probado | Estándar, 15 %, pico 19–21, combinación/redondeo acordados y mora |
| RF-12 | Transporte mantenimiento | Bloqueo frente a reserva simultánea y conservación de reservas previas |
| RF-13 | Fake y pagos de membresía con fallo/retry | Integración de cobro con reserva de cancha |
| RF-14 | PDF real/persistido de membresía | PDF de cancha con recurso, horario y monto |
| RN-01 | Índice único y rechazo de doble presencia secuencial | Dos ingresos realmente simultáneos y reconciliación offline |
| RN-02 | NO cubierta por concurrencia de planes/membresías/reembolsos | Dos usuarios/dos transacciones sobre mismo turno: una confirmación y garantía SQL |
| RN-03 | Vigencia en guard M3, aún stub | Vencido no reserva clase; cancha a tarifa externa, sin descuento |
| RNF-01 | No hay evidencia automatizada de continuidad offline | Caída del centro, copia local, deduplicación, conflictos y disponibilidad |
| RNF-02 | Fake sin entrada de tarjeta | Verificación específica de no persistencia al integrar pagos de reservas |
| RNF-03 | Sin test de rendimiento de disponibilidad | Datos representativos, presupuesto acordado, índices y medición |
| RNF-04 | Uso de sedes desde M1/M2 | Alta de sede sin reinicio; pruebas SedeService/controller y dataset 25 sedes |

## Selección por integración

- M1: frontend api/dominio/planes; backend PlanService/Controller/Authorization/Persistence,
  MembresiaController/Integration, FotoPerfil, RegistroConflictos/Identidad y OpenAPI.
  Añadir pagos si cambia una operación monetaria; Persistence/Integration requieren PG.
- M2: frontend api/dominio; MembresiaIntegration (incluye acceso) y OpenAPI sobre PG.
  La suite está mezclada por historia; usarla completa evita omitir escenarios por nombres.
- M3: frontend actividades/dominio como compatibilidad de transporte/UI, más las pruebas
  reales que entregue su responsable. No usar las actuales como prueba de cupos/Observer.
- M4/M5: frontend actividades/api/dominio, PagosIntegration, Fake y PdfRenderer; añadir
  las pruebas de Strategy, reservas, mantenimiento y RN-02 que entregue el responsable.
- Antes de main: npm test, npm run build, backend completo en PG descartable y
  git diff --check; revisar que no haya omitidos ni contratos que sólo respondan 501.
  Cuando existan E2E, reservarlos para los recorridos críticos, no sustituir toda la base.

No se implementó pipeline ni se finalizó ADR-008. Sus insumos son esta clasificación,
los resultados medidos, las brechas y los comandos reproducibles. Sin push ni merge
a main en esta subrama; A/D, offline y desarrollo de M3/M4/M5 conservan sus responsables.

## Verificación posterior: cierre de M1/M2 online — 09/11/2026

Base `f8c6c7f`, rama `fix/cierre-definitivo-m1-m2-online`. A/D aprobados e implementados.
Se conservan los inventarios anteriores como corte histórico; los resultados nuevos
son:

- `npm test`: API 18, dominio/UI 185, Planes 16, Actividades 18 y Gerencia 7, todos
  aprobados. Dominio agrega cuatro callbacks: foto correcta/fallo/limpieza, rechazo
  de referencias antiguas/externas, rechazo sin conservar foto anterior y salida
  por ID. API amplía un callback con el body de salida por ID. No se volvió a medir
  el número dinámico de assertions ni se instrumentó cobertura frontend.
- `npm run build`: Vite correcto. No existe script lint en este proyecto.
- Backend completo `clean verify`: **85 tests, 0 fallos, 0 errores, 0 omitidos**.
  Trece clases, `MembresiaIntegrationTest` pasa de 35 a 39 métodos; 61 tests PG y
  24 sin PG. Primero pasaron las cuatro regresiones focalizadas y luego la suite.
- JaCoCo: **774/892 líneas (86,77 %), 287/376 ramas (76,33 %)** e instrucciones
  4669/5381 (86,77 %). Sin nuevas exclusiones ni umbrales. Estos datos sustituyen
  como resultado actual a 84,42 % / 74,34 %; no acreditan todos los RF del proyecto.

Reportes locales de esta suite completa:
`target/test-runs/884ecc50d9d74ab0b8d263c0ee37e28e/{surefire-reports,jacoco}`.
Java 21 en imagen existente y PG 18 nueva/tmpfs, mediante el runner documentado;
sin instalar JDK global ni tocar bases de desarrollo. Los reportes no se versionan.

Nueva evidencia de integración: servidor Spring con puerto aleatorio y HttpClient
real para foto del socio multisede, permisos, no-store e ingreso/egreso con imagen.
Salida por ID después de vencer QR/membresía; aforo vuelve a cero. MockMvc sobre PG
para foto administrativa: texto 400, null conserva bytes, edición legítima 200 y
sede ajena 403. Referencia histórica sin archivo devuelve foto null. RN-01 ahora
tiene dos ingresos concurrentes en sedes distintas y una sola confirmación/fila.

Brechas que cambian respecto a la tabla histórica: RF-01 resuelve A/D y RN-01
dispone de prueba concurrente online. Siguen pendientes offline/reconciliación,
E2E automatizado de navegador, mediciones de frescura/rendimiento y dataset final.
No se repitió el ensayo anterior de scheduler por HTTP ni de respuesta monetaria
perdida con proxy. El servicio automático y la idempotencia se ejecutan en la suite
backend; no se confunden con una nueva prueba del temporizador o del navegador.
Las brechas de otros módulos no fueron implementadas por esta tarea.
