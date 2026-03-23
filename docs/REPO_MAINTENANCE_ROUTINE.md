# Rutina manual de mantenimiento del repo

Guía corta para mantener limpio el workspace, evitar basura de reportes y refrescar dependencias pesadas sin hacer build.

## 1. Limpieza rápida diaria

Usala al terminar una corrida o antes de arrancar otra:

```bash
npm run clean:reports
```

Qué limpia:
- `playwright-report*`
- `test-results*`
- `allure-results*`
- `allure-report*`

Cuándo conviene:
- después de una suite local
- antes de reintentar un test flaky
- cuando querés recuperar espacio rápido

## 2. Limpieza semanal / media

Usala si el repo empieza a acumular basura o querés revisar el estado de Playwright:

```bash
npm run storage:maintenance
```

Ese script ejecuta:

```bash
npm run storage:clean:reports
npm run storage:clean:npm
npm run storage:pw:browsers:list
```

Impacto práctico:
- limpia reportes viejos
- refresca cache de npm
- confirma qué browsers de Playwright tenés instalados

## 3. Limpieza profunda ante problemas

Usala cuando aparecen errores raros de Playwright, corrupción de cache o diferencias entre máquinas:

```bash
npm run storage:clean:npm
npm run storage:pw:browsers:refresh
```

Qué hace:
- verifica y limpia cache npm
- desinstala browsers de Playwright
- reinstala `chromium` y `firefox`
- vuelve a listar instalaciones activas

Señales típicas para usarla:
- Playwright falla aunque el código no cambió
- browsers corruptos o versiones inconsistentes
- problemas después de actualizar dependencias

## 4. Mantenimiento completo mensual / pre-CI

Corré esta rutina antes de una ventana importante de regresión o si querés dejar la máquina prolija:

```bash
npm run clean:reports
npm run storage:maintenance
npm run storage:pw:browsers:refresh
```

Checklist sugerido:
- limpiar reportes generados
- validar cache npm
- revisar browsers instalados
- refrescar instalación de Playwright si hubo inestabilidad reciente

## 5. Allure por ambiente

### QA

Generar reporte:

```bash
npm run allure:generate:qa
```

Abrir reporte generado:

```bash
npm run allure:open:qa
```

Servir resultados directamente:

```bash
npm run allure:serve:qa
```

Abrir reporte Playwright:

```bash
npm run show-report:qa
```

### DEMO

Generar reporte:

```bash
npm run allure:generate:demo
```

Abrir reporte generado:

```bash
npm run allure:open:demo
```

Servir resultados directamente:

```bash
npm run allure:serve:demo
```

Abrir reporte Playwright:

```bash
npm run show-report:demo
```

## 6. Tradeoffs rápidos

| Rutina | Tiempo | Espacio recuperado | Estabilidad | Cuándo usarla |
| --- | --- | --- | --- | --- |
| Limpieza rápida diaria | Bajo | Medio | Media | Entre corridas locales |
| Limpieza semanal / media | Medio | Medio/alto | Alta | Fin de semana o antes de arrancar sprint/testing |
| Limpieza profunda ante problemas | Medio/alto | Alto | Muy alta | Cuando Playwright/npm se comportan raro |
| Mantenimiento completo mensual / pre-CI | Alto | Alto | Muy alta | Antes de regresión grande o CI sensible |

## 7. Recomendación práctica

- Diario: `npm run clean:reports`
- Semanal: `npm run storage:maintenance`
- Si algo se rompe sin explicación: `npm run storage:clean:npm && npm run storage:pw:browsers:refresh`
- Antes de una corrida importante: limpieza diaria + mantenimiento semanal; sumá refresh de browsers sólo si hubo inestabilidad
