## Exploration: Consolidación a Chromium-only

### Current State
El framework actualmente soporta Chromium y Firefox (y tenía soporte parcial de WebKit). Para evitar colisiones de datos en el sistema legacy de Bermann durante ejecuciones paralelas entre navegadores, el sistema utiliza `DataPathHelper.ts` para generar nombres de archivos JSON aislados por navegador (ej: `legacy-entities-data-chromium-qa.json` vs `legacy-entities-data-firefox-qa.json`). Esto duplica el esfuerzo de seeding y la complejidad de la infraestructura de datos.

### Affected Areas
- `playwright.config.ts` — Contiene las definiciones de proyectos para Firefox (`config-fase1-firefox`, `base-entities-firefox`, `firefox-qa`, etc.) que deben ser eliminadas.
- `tests/api-helpers/DataPathHelper.ts` — Clase core que gestiona los sufijos de navegador en los archivos de datos. Debe simplificarse para usar una fuente única de verdad.
- `package.json` — Scripts de NPM como `qa:config:smoke:all` o suites de regresión que disparan múltiples proyectos o hacen referencia a Firefox.
- `.github/workflows/tests.yml` — Workflow de CI que corre el batch de Ultima Milla en multi-browser (Chromium + Firefox).
- `GEMINI.md` / `README.md` — Documentación técnica que menciona el soporte multi-browser y la estrategia de archivos aislados.

### Approaches
1. **Consolidación Total (Recomendado)** — Eliminar físicamente todos los proyectos de Firefox y refactorizar `DataPathHelper` para eliminar la dependencia del nombre del navegador en los archivos de persistencia.
   - Pros: Simplificación máxima del código, reducción drástica de deuda técnica, ejecución de CI más rápida.
   - Cons: Requiere una refactorización quirúrgica de la lógica de enrutamiento de datos.
   - Effort: Medium

2. **Desactivación Suave** — Comentar los proyectos en la config y forzar a `DataPathHelper` a devolver siempre "chromium".
   - Pros: Menos riesgo inmediato de rotura de paths.
   - Cons: Mantiene código muerto y lógica innecesariamente compleja.
   - Effort: Low

### Recommendation
Se recomienda la **Consolidación Total**. El framework ha madurado lo suficiente para que la complejidad de mantener múltiples archivos de estado sea un lastre mayor que el beneficio de la compatibilidad con Firefox en un entorno de software corporativo.

### Risks
- **Rotura de Regresiones Legacy**: Los tests legacy que dependen de archivos generados por pasos previos podrían fallar si el cambio de nombre de archivo no es consistente en todos los helpers.
- **Colisiones en Local**: Al reducir a un solo archivo de datos, si se corre con muchos workers en paralelo sobre Chromium, hay que asegurar que la lógica de nombres únicos (`NamingHelper`) sea lo suficientemente robusta (ya lo es, usando timestamps de 6 dígitos).

### Ready for Proposal
Yes. El análisis muestra que el cambio es viable y traerá beneficios inmediatos en mantenibilidad.
