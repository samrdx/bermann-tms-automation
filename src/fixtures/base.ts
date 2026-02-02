import { test as base } from '@playwright/test';

// Auth Module
import { LoginPage } from '../modules/auth/pages/LoginPage.js';
import { AuthActions } from '../modules/auth/actions/AuthActions.js';

// Contracts Module
import { ContratosFormPage } from '../modules/contracts/pages/ContratosPage.js';
import { ContratosActions } from '../modules/contracts/actions/ContratosActions.js';
import { ContractLifecycleFlow } from '../modules/contracts/flows/ContractLifecycleFlow.js';
import { ContratoFactory } from '../modules/contracts/factories/ContratoFactory.js';

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

// Declare the types of your fixtures.
type MyFixtures = {
  // Pages
  loginPage: LoginPage;
  contratosPage: ContratosFormPage;

  // Actions
  authActions: AuthActions;
  contratosActions: ContratosActions;

  // Flows
  contractLifecycleFlow: ContractLifecycleFlow;

  // Factories
  transportistaFactory: TransportistaFactory;
  vehiculoFactory: VehiculoFactory;
  conductorFactory: ConductorFactory;
  clienteFactory: ClienteFactory;
  contratoFactory: ContratoFactory;
};

// Extend base test to include fixtures.
export const test = base.extend<MyFixtures>({
  // Pages
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  contratosPage: async ({ page }, use) => {
    await use(new ContratosFormPage(page));
  },

  // Actions
  authActions: async ({ loginPage }, use) => {
    await use(new AuthActions(loginPage));
  },
  contratosActions: async ({ contratosPage }, use) => {
    await use(new ContratosActions(contratosPage));
  },

  // Flows
  contractLifecycleFlow: async ({ authActions, contratosActions }, use) => {
    await use(new ContractLifecycleFlow(authActions, contratosActions));
  },

  // Factories
  transportistaFactory: async ({ page }, use) => {
    await use(new TransportistaFactory(page));
  },
  vehiculoFactory: async ({ page }, use) => {
    await use(new VehiculoFactory(page));
  },
  conductorFactory: async ({ page }, use) => {
    await use(new ConductorFactory(page));
  },
  clienteFactory: async ({ page }, use) => {
    await use(new ClienteFactory(page));
  },
  contratoFactory: async ({ page }, use) => {
    await use(new ContratoFactory(page));
  },
});

export { expect } from '@playwright/test';
