# Exploration: fix-qa-e2e-ci

### Current State
El script `test:qa:e2e:ci` ejecuta `prefactura-crear-e2e.test.ts` en Chromium y Firefox. En Firefox (y ocasionalmente Chromium) el test falla durante la fase 2 o 3 (Monitoreo), típicamente reportando que el número de viaje no se encuentra en la grilla después de la asignación. Adicionalmente, `AsignarPage.ts` reporta "No se capturó respuesta después de hacer clic en Guardar" y el flujo falla.

### Affected Areas
- `src/modules/planning/pages/AsignarPage.ts` — Donde falla el guardado y redirección.
- `src/modules/monitoring/pages/MonitoreoPage.ts` — Donde la búsqueda en la grilla falla tras un timeout.
- `tests/e2e/suites/prefactura-crear-e2e.test.ts` — El test e2e en sí mismo.

### Approaches
1. **Mejorar estabilización en Asignar y Monitoreo** — Añadir esperas explícitas, recargas o validaciones de estado en la UI después de guardar la asignación, y usar evaluación nativa o esperas dinámicas robustas al buscar en la tabla de Monitoreo. 
   - Pros: Ataca la raíz de inestabilidad de Playwright en Firefox.
   - Cons: Puede requerir varias iteraciones para afinar timeouts.
   - Effort: Low

### Recommendation
Aplicar la mejora de estabilización tanto en `AsignarPage` al guardar como en `MonitoreoPage` al filtrar, forzando la visualización del viaje en Firefox (esperas por red, recarga manual si falla, o fallback de click JS).

### Risks
- Tiempos de prueba incrementados si las esperas son demasiado largas.
- Diferencias de comportamiento en la UI propia de Bermann TMS en Firefox vs Chromium.

### Ready for Proposal
Yes.
