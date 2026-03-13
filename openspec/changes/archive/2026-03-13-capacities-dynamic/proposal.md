# Proposal: Creación Dinámica de Capacidades (Rango y Valor Único)

## Intent
El objetivo es garantizar que el sistema TMS permita la configuración de capacidades de carga de forma flexible (valores únicos y rangos), ya que estas son la base para la asignación correcta de vehículos y el cálculo de tarifas, integrando estas validaciones en la suite de pruebas E2E.

## Scope

### In Scope
- Creación de automatización de QA E2E para el proceso completo de creación de Capacidades (rango y estándar).
- Desarrollo de Page Object `CapacidadPage.ts` en TypeScript y Playwright según el patrón del proyecto.
- Creación del test `capacidades-crear.test.ts` en `00-config/` con escenarios dinámicos (kg/ton).
- Validación de que la creación se refleja correctamente en el `index`.

### Out of Scope
- Configuración en backend o cambios a la UI del TMS (el trabajo es únicamente automatización de QA).
- Otros submódulos no relacionados con "capacidades".

## Approach
Se creará un `CapacidadPage.ts` siguiendo el SDD y patrones definidos en `tms-page-objects`. Los selectores aplicarán las prioridades definidas en `tms-selectors` (id, data-id, name).
Se construirán 2 escenarios de test en `capacidades-crear.test.ts` con generación de datos dinámicos/aleatorios.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/00-config/pages/CapacidadPage.ts` | New | Page object para interacción con creación de capacidades |
| `tests/e2e/modules/00-config/capacidades-crear.test.ts` | New | Suite de pruebas automatizadas E2E |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Selectores no estables | Med | Uso de `tms-selectors` y revisión asidua de DOM con MCP de playwright |
| Fallos por esperas en red | Med | Uso de `waitForNavigation` y validaciones explícitas (mensajes de éxito) |

## Rollback Plan
Si los tests presentan fallas (flakiness alto) o bloquean el pipeline, se procederá a deshabilitar (o borrar) el archivo de test `capacidades-crear.test.ts` mientras se estabilizan los localizadores.

### [NEW] [CapacidadPage.ts](file:///c:/projects/qa-automation-framework/src/modules/transport/pages/CapacidadPage.ts)

- Grid Page: `/capacities/index`
- Create Page: `/capacities/create`
- Selectors:
  - Grid: `table#table_capacities`
  - Create Button: `a[href="/capacities/create"]`
  - Initial/Final Capacity: `#capacities-capacidad_inicial`, `#capacities-capacidad_final`
  - Range Checkbox: `#capacities-es_rango`
  - Type Dropdown: `button[data-id="capacities-tipo_capacidad"]`
  - Guardar: `#btn_guardar`

## Dependencies
- Requiere acceso al panel `/capacities/create` de la plataforma QA.

## Success Criteria
- [ ] Test `capacidades-crear.test.ts` se ejecuta consistentemente sin fallos.
- [ ] El POM creado (`CapacidadPage.ts`) encapsula correctamente todos los métodos.
- [ ] Tanto el flujo de Rango como el de Valor Único pasan las validaciones del index.
