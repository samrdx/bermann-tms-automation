# Bermann TMS — QA Automation Framework

Framework E2E para el sistema TMS (Transport Management System) de Bermann, construido con Playwright + TypeScript. Cubre los flujos críticos de negocio: entidades, contratos, viajes, finanzas (prefactura/proforma) y última milla.

| Environment | URL |
|---|---|
| **QA** | <https://moveontruckqa.bermanntms.cl> |
| **Demo** | <https://demo.bermanntms.cl> |

---

## Quick Overview

| Área | Valor |
|---|---|
| Módulos | **9** (auth, transport, commercial, contracts, planning, monitoring, finanzas, configAdmin, ultimamilla) |
| Runtime web | Google Chrome (`channel: 'chrome'`) |
| Playwright projects | `chromium-qa` / `chromium-demo` (nombres históricos) |
| Arquitectura | Page Object Model + Domain-Driven Modules |
| CI/CD | GitHub Actions — `QA PR SUITE` |
| TypeScript | Strict mode, ES Modules, .js extensions |

---

## Prerequisites

- Node.js 20+
- npm
- Acceso a entornos TMS (QA/Demo)
- Google Chrome para Playwright (`npx playwright install chrome`)

## Quick Start

```bash
# 1. Clone
git clone https://github.com/samrdx/bermann-tms-automation.git
cd bermann-tms-automation

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Editar .env con credenciales TMS (TMS_USERNAME / TMS_PASSWORD)

# 4. Install browser
npx playwright install chrome

# 5. Run smoke test
npm run qa:smoke:01:transportista
```

---

## Project Structure

```text
bermann-tms-automation/
├── AGENTS.md                        # AI skills system + auto-invoke rules
├── CLAUDE.md / GEMINI.md            # Full project documentation for AI agents
├── CLOUD.md                         # CI/CD architecture decisions
├── .github/workflows/
│   └── tests.yml                    # QA PR SUITE
├── .agents/skills/                  # AI agent skills
│   ├── tms-selectors/               # Selector priority & Confluence
│   ├── tms-dropdowns/               # Bootstrap Select patterns
│   ├── tms-atomic-e2e/              # Atomic E2E test patterns
│   ├── tms-ultimamilla/             # Última Milla automation
│   ├── jira-ticket-writer/          # Jira User Stories
│   └── ...                          # See AGENTS.md for full list
├── src/
│   ├── modules/                     # Domain-Driven Architecture
│   │   ├── auth/                    # Login, Dashboard
│   │   ├── transport/               # Transportista, Conductor, Vehiculo
│   │   ├── commercial/              # Cliente
│   │   ├── contracts/               # Contratos (Costo/Ingreso)
│   │   ├── planning/                # Planificar/Asignar Viajes
│   │   ├── monitoring/              # Monitoreo (Finalizar Viajes)
│   │   ├── finanzas/                # Prefactura
│   │   ├── ultimamilla/             # Pedidos, Asignación, Monitoreo UM
│   │   └── configAdmin/             # Config: UnidadNegocio, TipoOperacion, etc.
│   ├── core/                        # BasePage, BrowserManager
│   ├── fixtures/                    # Playwright Custom Fixtures (DI)
│   ├── utils/                       # Logger, RUT generator, entityTracker, NamingHelper
│   └── config/                      # Credentials, environment
├── tests/
│   ├── e2e/
│   │   ├── auth/                    # Login, logout, negative, full-flow
│   │   ├── modules/
│   │   │   ├── 00-config/           # Config smoke tests (8 suites)
│   │   │   ├── 01-entidades/        # Entity creation (transportista, cliente, etc.)
│   │   │   ├── 02-operaciones/      # Operations (contratos, viajes, monitoreo)
│   │   │   ├── 03-finanzas/         # Reserved
│   │   │   └── ultimamilla/         # Última Milla (pedido, asignar, batch)
│   │   └── suites/                  # Atomic E2E + Setup suites
│   ├── api-helpers/                 # TmsScenarioBuilder, helpers, DataPathHelper
│   └── helpers/
├── scripts/                         # pw:run wrapper, CI validation, engram, SDD sync
├── docs/                            # Architecture, CI/CD, selectors, maintenance
├── tmsapp/mobile/                   # Mobile automation (WDIO)
├── playwright/.auth/                # Auth state (user.json)
├── last-run-data-{browser}.json     # Worker-specific data files
└── .env                             # Credenciales (no versionado)
```

---

## Running Tests

### Multi-Environment

Todas las pruebas soportan QA y DEMO vía variable `ENV`:

```bash
npm run qa:smoke:01:transportista     # QA
ENV=DEMO npm run demo:smoke:01:transportista  # Demo
```

### Execution Wrapper

Todas las pruebas usan el wrapper `scripts/run-playwright-suite.mjs` vía `npm run pw:run`, que maneja:
- Run locks para evitar colisiones CI
- Limpieza automática de reportes
- Proyectos específicos por entorno (`chromium-qa`, `chromium-demo`, etc.)
- Runtime real en Google Chrome (`channel: 'chrome'`), aunque los nombres de proyecto sigan usando `chromium-*`

### V1 PR Gate

El gate actual de pull requests está definido en `.github/workflows/tests.yml` como **QA PR SUITE**:

```bash
npm run typecheck
npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1
```

CI instala Chrome con `npx playwright install --with-deps chrome`. Los nombres `chromium-qa` y `chromium-demo` se mantienen por compatibilidad histórica; la ejecución real usa Chrome.

### Smoke Tests (por paso)

```bash
# QA
npm run qa:smoke:01:transportista    # Crear Transportista
npm run qa:smoke:02:cliente          # Crear Cliente
npm run qa:smoke:03:conductor        # Crear Conductor
npm run qa:smoke:04:vehiculo         # Crear Vehiculo
npm run qa:smoke:05:contract:cliente # Contrato Ingreso
npm run qa:smoke:06:contract:transportista # Contrato Costo
npm run qa:smoke:07:trip:planificar  # Planificar Viaje
npm run qa:smoke:08:trip:asignar     # Asignar Viaje
npm run qa:smoke:09:trip:finalizar   # Finalizar Viaje (Monitoreo)

# Demo (mismos pasos, prefijo demo:)
npm run demo:smoke:all               # Todos los pasos en secuencia
```

### Regression Suites

```bash
# QA
npm run qa:regression:entities       # Transportista + Cliente + Conductor + Vehiculo
npm run qa:regression:contracts      # Contratos Ingreso + Costo
npm run qa:regression:trips          # Planificar + Asignar + Finalizar
npm run qa:regression:ops            # Entities + Contracts + Trips
npm run qa:regression:finanzas       # Prefactura + Proforma (E2E atómicos)
npm run qa:regression:ultimamilla    # Asignar + Batch
npm run qa:regression:ops:full       # Todo lo anterior + Allure report

# Demo
npm run demo:regression:ops:full
```

### Config Smoke (1 vez por sprint)

```bash
npm run qa:config:smoke:all          # 8 suites: unidad negocio, tipo operación, tipo servicio, tipo carga, capacidades, ruta, carga-setup, carga-crear
npm run qa:config:sprint             # Fase 1 + Fase 2 completa
```

### Atomic E2E (independientes, sin JSON deps)

Usan `OperationalDataLoader` para cargar datos seedeados de regresiones previas:

```bash
npm run qa:e2e:prefactura            # Crear Prefactura desde viaje finalizado
npm run qa:e2e:proforma              # Crear Proforma desde viaje finalizado
npm run qa:e2e:finanzas-full         # Prefactura + Proforma
npm run qa:e2e:viajes-asignar        # Asignar viaje (E2E atómico)
npm run qa:e2e:viajes-finalizar      # Finalizar viaje (E2E atómico)
npm run qa:e2e:all                   # Todos los E2E atómicos
```

### Última Milla

```bash
npm run qa:smoke:ultimamilla                  # Crear pedido
npm run qa:smoke:ultimamilla:asignar           # Asignar pedido (Chromium)
npm run qa:smoke:ultimamilla:batch             # Batch asignación
ULTIMAMILLA_ENABLE_MUTATION=true npm run qa:smoke:ultimamilla:asignar  # Con mutación
```

### Allure Reporting

```bash
npm run allure:generate:qa          # Generar reporte HTML (QA)
npm run allure:serve:qa             # Servir reporte en navegador (QA)
```

### Mobile (tmsapp)

```bash
npm run mobile:test:smoke:auth      # Auth smoke en app mobile (WDIO)
```

### Legacy Seed

```bash
npm run qa:seed:legacy              # base-entities.setup.ts (crea todo el ecosistema)
```

---

## CI/CD (GitHub Actions)

Workflow actual: **QA PR SUITE** (`.github/workflows/tests.yml`)

| Job | Descripción | Timeout |
|---|---|---|
| `qa-pr-suite` | TypeScript check + Finanzas Full E2E en QA | 60 min |

### Secrets Requeridos

| Secret | Uso |
|---|---|
| `TMS_USER` | Usuario TMS |
| `TMS_PASS` | Password TMS |

### Key Features

- **Preflight validation** — verifica referencias a scripts antes de ejecutar
- **Chrome runtime** — CI instala `chrome` y Playwright ejecuta con `channel: 'chrome'`
- **Sequential gate** — finanzas full corre con `--workers 1` para reducir colisiones en datos legacy

Para detalle operativo: [docs/CI_CD_SETUP.md](docs/CI_CD_SETUP.md)

---

## Architecture

### Modules

| Módulo | Page Objects | Tests | Estado |
|---|---|---|---|
| auth | LoginPage, DashboardPage | 4 tests | ✅ |
| transport | TransportistaPage, ConductorPage, VehiculoPage | 4 tests | ✅ |
| commercial | ClientePage | 1 test | ✅ |
| contracts | ContratosPage | 2 tests | ✅ |
| planning | PlanificarPage, AsignarPage | 2 tests | ✅ |
| monitoring | MonitoreoPage | 1 test | ✅ |
| finanzas | PrefacturaPage | 3 E2E suites | ✅ |
| configAdmin | UnidadNegocioPage, TipoOperacionPage, TipoServicioPage, TipoCargaPage, CapacidadesPage, RutaPage, CargaMasterPage, CrearCargaPage | 8 tests | ✅ |
| ultimamilla | UltimaMillaFormPage, UltimaMillaPedidoIndexPage, UltimaMillaAsignarPage, UltimaMillaMonitoreoPage | 3 tests | ✅ |

### Key Patterns

1. **Page Object Model** — Una clase por página, selectores encapsulados
2. **Atomic E2E** — Tests que cargan datos seedeados vía `OperationalDataLoader` en vez de crear su propio ecosistema
3. **Legacy Sequential** — Tests que leen de archivos JSON unificados y deben ejecutarse en orden
4. **Unified Data JSON** — La persistencia está unificada para Chromium, simplificando el flujo de seeding.
5. **Entity Tracker** — `entityTracker` registra entidades creadas y genera resumen para Allure
6. **Skills System** — AI lee skills autoritativas antes de generar código (~95% reducción de alucinaciones)

### Data Flow (Legacy)

```text
auth.setup.ts → playwright/.auth/user-{env}.json
     ↓
base-entities.setup.ts
     ↓
legacy-base-entities-data-{env}.json
     ↓
contrato-crear → contrato2cliente-crear
     ↓
viajes-planificar → viajes-asignar → viajes-monitoreo
```

### Data Flow (Atomic E2E)

```text
qa:regression:ops → crea seed data en JSON
     ↓
qa:e2e:prefactura → OperationalDataLoader.loadOrThrow() → ejecuta solo prefactura
```

Para detalle completo: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## AI Agent Integration

Este proyecto usa un sistema de skills para garantizar código consistente y correcto:

- **Entry point:** [AGENTS.md](AGENTS.md) — índice de skills y reglas de auto-invocación
- **Skills:** [.agents/skills/](.agents/skills/) — skills AI-ready
- **Context docs:** [CLAUDE.md](CLAUDE.md), [GEMINI.md](GEMINI.md)
- **Engram (memoria persistente):** Configuración híbrida en `openspec/config.yaml`

| Documento | Propósito |
|---|---|
| `AGENTS.md` | Skills system + auto-invoke rules |
| `CLAUDE.md` | Documentación completa del proyecto (agentes Claude) |
| `GEMINI.md` | Espejo de CLAUDE.md para Gemini |

---

## Logs and Reports

| Artifact | Location |
|---|---|
| Application logs | `logs/app.log` |
| Error logs | `logs/errors.log` |
| Screenshots (on failure) | `test-results-*/` |
| Playwright HTML Report | `playwright-report-{env}/` |
| Allure Report | `allure-report-{env}/` |
| Allure Results | `allure-results-{env}/` |

## Maintenance

```bash
npm run clean:reports                  # Limpiar reports y resultados
npm run storage:maintenance            # Limpiar reports + npm cache + list browsers
npm run typecheck                      # Verificar compilación TypeScript
```

Ver [docs/REPO_MAINTENANCE_ROUTINE.md](docs/REPO_MAINTENANCE_ROUTINE.md) para rutina completa.

---

## Environment Variables

Archivo: `.env` (NUNCA versionar)

```env
# TMS Environments
BASE_URL_DEV=https://moveontruckqa.bermanntms.cl
BASE_URL_STAGING=https://moveontruckqa.bermanntms.cl
BASE_URL_PROD=https://moveontruck.bermanntms.cl

# Configuration
ENVIRONMENT=dev
HEADLESS=false
TIMEOUT=30000

# Credenciales
TMS_USERNAME=your_user
TMS_PASSWORD=your_password

# Engram (SDD persistence)
ENGRAM_BASE_URL=http://localhost:8080
ENGRAM_PROJECT=bermann-tms-automation
```

---

## Contributing

### Before Committing
```bash
npm run typecheck         # TypeScript check
npm run qa:e2e:all        # Run atomic E2E
git add <specific-files>
git commit -m "feat(scope): description"  # Conventional commits
```

### Docs
| Documento | Contenido |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Decisiones arquitectónicas |
| [CLOUD.md](CLOUD.md) | CI/CD architecture |
| [TEST-ACTIVES.md](docs/TEST-ACTIVES.md) | Estado de tests activos |
| [CI_CD_SETUP.md](docs/CI_CD_SETUP.md) | Setup GitHub Actions |
| [ENGRAM_INTEGRATION.md](docs/ENGRAM_INTEGRATION.md) | Engram/SDD persistence |
| [REPO_MAINTENANCE_ROUTINE.md](docs/REPO_MAINTENANCE_ROUTINE.md) | Mantenimiento |

---

## Author

**Samuel Rodriguez** — [@samrdx](https://github.com/samrdx)

## License

Propiedad de Bermann — Uso interno exclusivo.

---

*Última actualización: Mayo 2026*
