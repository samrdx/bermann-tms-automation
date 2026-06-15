# Design: Reestructuración y Robustecimiento de QA Regressions Nightly

## Technical Approach

El enfoque técnico se centra en simplificar el archivo de workflow `.github/workflows/nightly-regressions.yml` para delegar la orquestación en el comando integrado de NPM. Al unificar la ejecución, reducimos la complejidad del YAML de GitHub Actions y aprovechamos la autogeneración de Allure y la limpieza de reportes ya programados en `package.json`.

Además, agregaremos el archivado de evidencias para capturar capturas de pantalla, videos y reportes HTML del Action de forma persistente.

## Architecture Decisions

### Decision: Cargar allure-report, test-results y logs consolidados

**Choice**: Subir los tres directorios en un único artefacto de GitHub Actions.
**Alternatives considered**: Subir cada directorio en artefactos separados.
**Rationale**: Al consolidar en un solo artefacto con el ID de la corrida (`nightly-qa-reports-${{ github.run_id }}`), el equipo de QA puede descargar un único archivo zip que contiene el reporte HTML listo para visualizar localmente y todas las evidencias en bruto asociadas a la corrida. Esto simplifica la descarga e inspección de reportes.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/nightly-regressions.yml` | Modify | Reemplazar los pasos de ejecución secuenciales sueltos por `npm run qa:regression:ops:full` y agregar el paso final de subida de artefactos con `actions/upload-artifact`. |

## Interfaces / Contracts

El bloque final de pasos en el archivo YAML de workflow se estructurará de la siguiente forma:

```yaml
      - name: Run QA regression ops full (integrated suite)
        env:
          TMS_USERNAME: ${{ secrets.TMS_USER || 'srodriguez' }}
          TMS_PASSWORD: ${{ secrets.TMS_PASS || 'srodriguez' }}
          ULTIMAMILLA_ENABLE_MUTATION: 'true'
          CI: true
          ENV: QA
        run: npm run qa:regression:ops:full

      - name: Upload Allure Report and Playwright Evidences
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: nightly-qa-reports-${{ github.run_id }}
          path: |
            allure-report-qa/
            test-results-qa/
            logs/
          retention-days: 7
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| CI configuration | Validar sintaxis del archivo YAML | `npm run ci:validate:workflow-scripts` (Ejecuta la validación de preflight del workflow) |

## Migration / Rollout

No migration required. El cambio es retrocompatible y entra en efecto en la próxima ejecución programada o manual del workflow.
