# Delta for Infrastructure

## REMOVED Requirements

### Requirement: Multi-browser Data Isolation

(Reason: El soporte de Firefox y WebKit ha sido descontinuado. Mantener archivos de datos aislados por navegador genera complejidad innecesaria y duplica los artefactos de seeding sin un beneficio real para el negocio, ya que el TMS se utiliza casi exclusivamente en entornos basados en Chromium.)

### Requirement: Browser-specific Project Suffixes

(Reason: Ya no es necesario distinguir entre `config-fase1-chromium` y `config-fase1-firefox` puesto que solo existirá una versión de cada fase de configuración.)

## MODIFIED Requirements

### Requirement: Browser-Isolated Data Path Management

{El sistema SHALL proveer una ruta centralizada para archivos de datos de operación, pero ya no SHALL incluir el nombre del navegador en el nombre del archivo.}
(Previously: Each browser project gets its own isolated JSON file: setup-config-data-chromium-{env}.json, setup-config-data-firefox-{env}.json, etc.)

#### Scenario: Generate unified data path

- GIVEN un entorno de ejecución (ej: 'QA')
- WHEN se solicita el path de datos de configuración (`getSetupConfigDataPath`)
- THEN el sistema SHALL devolver un path que incluya el entorno pero NO el navegador
- AND el nombre del archivo SHALL ser `setup-config-data-qa.json` indistintamente del worker.

#### Scenario: Generate unified legacy entity data path

- GIVEN un entorno 'DEMO' y un `LEGACY_RUN_ID` opcional
- WHEN se solicita el path de entidades (`getLegacyEntityDataPath`)
- THEN el sistema SHALL devolver `legacy-entities-data-demo.json` (o con el suffix del run ID) sin mención a 'chromium' o 'firefox'.
