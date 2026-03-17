import { test as base } from '@playwright/test';

// Auth Module
import { LoginPage } from '../modules/auth/pages/LoginPage.js';
import { AuthActions } from '../modules/auth/actions/AuthActions.js';

// Modules
import { ContratosFormPage } from '../modules/contracts/pages/ContratosPage.js';
import { ContratoFactory } from '../modules/contracts/factories/ContratoFactory.js';
import { DashboardPage } from '../modules/auth/pages/DashboardPage.js';
import { TransportistaFormPage } from '../modules/transport/pages/TransportistaPage.js';
import { ConductorFormPage } from '../modules/transport/pages/ConductorPage.js';
import { VehiculoFormPage } from '../modules/transport/pages/VehiculoPage.js';
import { PlanificarPage } from '../modules/planning/pages/PlanificarPage.js';
import { AsignarPage } from '../modules/planning/pages/AsignarPage.js';
import { ClienteFormPage } from '../modules/commercial/pages/ClientePage.js';
import { TipoCargaPage } from '../modules/configAdmin/pages/TipoCargaPage.js';
import { TipoOperacionPage } from '../modules/configAdmin/pages/TipoOperacionPage.js';
import { TipoServicioPage } from '../modules/configAdmin/pages/TipoServicioPage.js';
import { CargaMasterPage } from '../modules/configAdmin/pages/CargaMasterPage.js';
import { CrearCargaPage } from '../modules/configAdmin/pages/CrearCargaPage.js';
import { RutaPage } from '../modules/configAdmin/pages/RutaPage.js';

// Transport Module
import { TransportistaFactory } from '../modules/transport/factories/TransportistaFactory.js';
import { VehiculoFactory } from '../modules/transport/factories/VehiculoFactory.js';
import { ConductorFactory } from '../modules/transport/factories/ConductorFactory.js';
// Note: Pages for factories are imported inside factories, so they resolve themselves (if updated).
// Wait, factories import pages using relative paths "../pages/...".
// OLD: src/factories/TF.ts -> ../pages/TFP.ts
// NEW: src/modules/transport/factories/TF.ts -> ../pages/TFP.ts
// Path logic:
// src/modules/transport/factories/TF.ts
// src/modules/transport/pages/TP.ts
// Relative path "../pages/TP.ts" IS STILL VALID! 
// This is lucky/intentional about the structure. Modules mirror the logic.
// So internal factory imports might strictly work if folder depth is same.
// Previous: factories/X.ts -> ../pages/Y.ts. (Depth 1 up then down).
// New: modules/transport/factories/X.ts -> ../pages/Y.ts. (Depth 1 up then down).
// IT SHOULD WORK!

// Commercial Module
import { ClienteFactory } from '../modules/commercial/factories/ClienteFactory.js';

// Ultima Milla Module
import { UltimaMillaFormPage } from '../modules/ultimamilla/pages/UltimaMillaPage.js';
import { UltimaMillaFactory } from '../modules/ultimamilla/factories/UltimaMillaFactory.js';

// Utils
import { entityTracker, EntityTracker } from '../utils/entityTracker.js';
import { Page } from '@playwright/test';

// Declare the types of your fixtures.
type MyFixtures = {
  // Utils
  entityTracker: EntityTracker;

  // Pages
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  // ... (rest of Page types)
  contratosPage: ContratosFormPage;
  transportistaPage: TransportistaFormPage;
  conductorPage: ConductorFormPage;
  vehiculoPage: VehiculoFormPage;
  viajesPlanificarPage: PlanificarPage;
  viajesAsignarPage: AsignarPage;
  clientePage: ClienteFormPage;
  tipoCargaPage: TipoCargaPage;
  tipoOperacionPage: TipoOperacionPage;
  tipoServicioPage: TipoServicioPage;
  cargaMasterPage: CargaMasterPage;
  crearCargaPage: CrearCargaPage;
  rutaPage: RutaPage;

  // Actions
  authActions: AuthActions;

  // Factories
  transportistaFactory: TransportistaFactory;
  vehiculoFactory: VehiculoFactory;
  conductorFactory: ConductorFactory;
  clienteFactory: ClienteFactory;
  contratoFactory: ContratoFactory;

  // Ultima Milla
  ultimaMillaPage: UltimaMillaFormPage;
  ultimaMillaFactory: UltimaMillaFactory;
};

// Extend base test to include fixtures.
export const test = base.extend<MyFixtures>({
  // Utils
  entityTracker: async ({ }, use) => {
    // Reseteamos el tracker al inicio de cada test
    entityTracker.clear();
    await use(entityTracker);
  },

  // Pages
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  contratosPage: async ({ page }, use) => {
    await use(new ContratosFormPage(page));
  },
  transportistaPage: async ({ page }, use) => {
    await use(new TransportistaFormPage(page));
  },
  conductorPage: async ({ page }, use) => {
    await use(new ConductorFormPage(page));
  },
  vehiculoPage: async ({ page }, use) => {
    await use(new VehiculoFormPage(page));
  },
  viajesPlanificarPage: async ({ page }, use) => {
    await use(new PlanificarPage(page));
  },
  viajesAsignarPage: async ({ page }, use) => {
    await use(new AsignarPage(page));
  },
  clientePage: async ({ page }, use) => {
    await use(new ClienteFormPage(page));
  },
  tipoCargaPage: async ({ page }, use) => {
    await use(new TipoCargaPage(page));
  },
  tipoOperacionPage: async ({ page }, use) => {
    await use(new TipoOperacionPage(page));
  },
  tipoServicioPage: async ({ page }, use) => {
    await use(new TipoServicioPage(page));
  rutaPage: async ({ page }, use) => {
    await use(new RutaPage(page));
  },
  cargaMasterPage: async ({ page }, use) => {
    await use(new CargaMasterPage(page));
  },
  crearCargaPage: async ({ page }, use) => {
    await use(new CrearCargaPage(page));
  },

  // Actions
  authActions: async ({ loginPage }, use) => {
    await use(new AuthActions(loginPage));
  },

  // Factories
  transportistaFactory: async ({ page }: { page: Page }, use: (r: TransportistaFactory) => Promise<void>) => {
    await use(new TransportistaFactory(page));
  },
  vehiculoFactory: async ({ page }: { page: Page }, use: (r: VehiculoFactory) => Promise<void>) => {
    await use(new VehiculoFactory(page));
  },
  conductorFactory: async ({ page }: { page: Page }, use: (r: ConductorFactory) => Promise<void>) => {
    await use(new ConductorFactory(page));
  },
  clienteFactory: async ({ page }: { page: Page }, use: (r: ClienteFactory) => Promise<void>) => {
    await use(new ClienteFactory(page));
  },
  contratoFactory: async ({ page }: { page: Page }, use: (r: ContratoFactory) => Promise<void>) => {
    await use(new ContratoFactory(page));
  },

  // Ultima Milla
  ultimaMillaPage: async ({ page }: { page: Page }, use: (r: UltimaMillaFormPage) => Promise<void>) => {
    await use(new UltimaMillaFormPage(page));
  },
  ultimaMillaFactory: async ({ page }: { page: Page }, use: (r: UltimaMillaFactory) => Promise<void>) => {
    await use(new UltimaMillaFactory(page));
  },
});

// Hook para loggear resumen después de cada test
test.afterEach(async ({ }, testInfo) => {
  if (testInfo.status === 'passed' || testInfo.status === 'failed') {
    entityTracker.logSummary(testInfo.project.name);
  }
});

export { expect } from '@playwright/test';
