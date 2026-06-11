# E2E Tests

Tests funcionales Playwright para los flujos web de TMS. El gate V1 de pull requests ejecuta solo la suite crítica de finanzas en QA.

## Estructura

```text
e2e/
├── auth/                  # Autenticación
├── modules/               # Tests por módulo funcional
│   ├── 00-config/         # Configuración y seeds manuales
│   ├── 01-entidades/      # Entidades base
│   ├── 02-operaciones/    # Contratos, viajes y monitoreo
│   └── ultimamilla/       # Última Milla
└── suites/                # Suites atómicas y setups compartidos
```

## V1 PR Gate

El workflow `.github/workflows/tests.yml` se llama **QA PR SUITE** y corre:

```bash
npm run typecheck
npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1
```

CI instala Chrome con `npx playwright install --with-deps chrome`. Los proyectos `chromium-qa` y `chromium-demo` conservan el nombre histórico, pero el runtime real es Google Chrome por `channel: 'chrome'`.

## Ejecutar Localmente

```bash
# Gate V1 equivalente al PR
npm run typecheck
npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1

# Suite atómica general QA
npm run qa:e2e:all

# Suite atómica general Demo
npm run demo:e2e:all
```

## Convenciones

- Selectores dentro de Page Objects, no en tests.
- Logging con Winston; no dejar `console.log`.
- Screenshots y trazas se conservan en fallos según `playwright.config.ts`.
- Para dropdowns, date pickers y cascadas, seguir las skills del proyecto antes de editar.
