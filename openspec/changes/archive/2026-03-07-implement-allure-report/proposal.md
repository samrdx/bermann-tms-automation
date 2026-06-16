# Proposal: Implement Allure Report

## Intent

Integrar Allure Report al framework de automatización para tener visibilidad detallada de las ejecuciones, incluyendo gráficas de tendencia, duración, severidad, y capturando datos dinámicos importantes de prueba (RUT, Patentes, IDs de Viaje).

## Scope

### In Scope

- Instalación de dependencias `allure-playwright` y `allure-commandline`.
- Configuración de `playwright.config.ts` para usar el reporter de Allure.
- Modificación de `package.json` agregando los scripts para manipulación de resultados y reportes de Allure.
- Ejemplificación de metadatos Allure y pasos en scripts clave (`viajes-asignar.test.ts`, `viajes-monitoreo.test.ts`).

### Out of Scope

- Configuración de pipelines en CI/CD con GitHub Actions (o similares) para la publicación automática del Allure Report (por ahora solo enfoque local o generación pasiva).

## Approach

Reemplazar o suplementar el reporter actual con Allure. Modificar configuraciones y mostrar en 2 o 3 tests existentes la manera arquitectónicamente correcta de usar `allure.epic`, `allure.feature`, `allure.attachment` (con JSONs) y `test.step`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `playwright.config.ts` | Modified | Agregar array de reporters, carpeta de output. |
| `package.json` | Modified | Nuevos scripts y dependencias dev. |
| `tests/e2e/modules/02-operaciones/viajes/viajes-asignar.test.ts` | Modified | Enriquecimiento con Allure. |
| `tests/e2e/modules/02-operaciones/Monitoreo/viajes-monitoreo.test.ts` | Modified | Paso a paso e inyección de payloads. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Desincronía de reportes si se corren en paralelo | Low | Allure soporta paralelismo por defecto (`playwright.test` inyecta workers ID). |

## Rollback Plan

- Desinstalar dependencias de allure.
- Revertir `playwright.config.ts` y `package.json` desde Git.
- Eliminar importaciones de `allure` en los tests modificados.

## Success Criteria

- [x] El comando `npm run allure:generate` crea exitosamente el reporte HTML en la ruta esperada.
- [x] Los test modificados envuelven las llamadas a Page Objects o APIs dentro de `test.step`.
- [x] Los JSONs de datos se adjuntan correctamente al reporte.
