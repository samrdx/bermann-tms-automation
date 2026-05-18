# Proposal: Viajes Crear Tramos — Cobertura Automatizada

## Intent

Agregar cobertura E2E para la creación de tramos desde `/viajes/crear`, validando que el flujo de modal, persistencia visual de datos y multiplicación de tramos funcionen de forma confiable en QA.

## Scope

### In Scope
- Automatizar flujo completo de creación de tramo desde botón **Agregar Tramo** hasta guardado exitoso.
- Validar herencia de datos en card de tramo (KG y transportista/chips visibles).
- Validar integración con multiplicador para replicar N tramos asociados.
- Manejar de forma robusta datepickers, dropdowns dinámicos y esperas UI.
- Verificar que tramo nuevo no inicie en estado **Anulado**.

### Out of Scope
- Refactor completo de flujos legacy de planificación de viajes.
- Cambios funcionales de backend o reglas de negocio de tramos.
- Cobertura de edición/eliminación profunda de tramos fuera de smoke básico visual.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `planning`: ampliar requisitos de automatización en `/viajes/crear` para cubrir creación de tramos, validación de card y replicación por multiplicador.

## Approach

Extender el módulo de planificación (POM + test E2E) con selectores estables del modal de tramos, helpers reutilizables para dropdown/date inputs y aserciones orientadas a resultado UI (cierre de modal, aparición de card, consistencia de chips, cantidad de tramos replicados). Mantener logging Winston y screenshots en error.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/planning/pages/PlanificarPage.ts` | Modified | Agregar métodos/selectores para modal de tramos y validaciones de card |
| `tests/e2e/modules/02-operaciones/viajes/` | New/Modified | Nuevo test `viajes-crear-tramos.test.ts` (o ampliación de suite planificación) |
| `docs/ProjectSelectors.md` | Modified | Registrar selectores finales validados para tramos |
| `openspec/changes/viajes-crear-tramos/specs/planning/spec.md` | New (next phase) | Delta spec de requisitos de planificación/tramos |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Selectores ambiguos en dropdown “Seleccionar” | High | Priorizar `data-id`, fallback explícito por contexto de modal |
| Flakiness por cargas dinámicas | Medium | Esperas por estado visible/oculto + timeouts controlados |
| Datepicker inconsistente entre ambientes | Medium | Estrategia dual (UI picker + fill/evaluate con verificación posterior) |

## Rollback Plan

Revertir cambios en `PlanificarPage` y tests de tramos en un solo commit; mantener intactos tests existentes de planificación/asignación. Si hay inestabilidad, deshabilitar temporalmente la nueva spec de tramos y conservar suite actual.

## Dependencies

- Acceso QA: `moveontruckqa.bermanntms.cl`
- Datos base válidos para dropdowns (tipo operación, servicio, unidad, carga, zonas)
- Sesión autenticada con permisos de creación de viajes

## Success Criteria

- [ ] El test de flujo completo crea tramo, cierra modal y muestra card bajo **Agregar Tramo**.
- [ ] Los chips de card reflejan exactamente KG y datos heredados ingresados.
- [ ] Con multiplicador N, se visualizan N tramos asociados esperados.
- [ ] Ningún tramo nuevo aparece inicialmente en estado **Anulado**.
- [ ] Ejecución estable en QA con evidencia (logs + screenshot en fallo).
