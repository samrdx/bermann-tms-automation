import type { Page } from 'playwright';
import { TransportistaFormPage } from '../pages/TransportistaFormPage.js';
import { VehiculoFormPage } from '../pages/VehiculoFormPage.js';
import { ConductorFormPage } from '../pages/ConductorFormPage.js';
import { ClienteFormPage } from '../pages/ClienteFormPage.js';
import { ContratosFormPage } from '../pages/ContratosFormPage.js';
import { createLogger } from '../utils/logger.js';
import {
  generateValidChileanRUT,
  generateRandomName,
  generateRandomLastName,
  generatePatente,
  generateUsername,
  generatePassword,
  generatePhone,
  generateEmail,
  generateUniqueId as generateId,
  generateStreetNumber,
  generateCompanyName,
} from '../utils/rutGenerator.js';

const logger = createLogger('BusinessEntitiesHelper');

// ============================================
// INTERFACES
// ============================================

export interface TransportistaData {
  nombre: string;
  razonSocial?: string;
  documento: string; // RUT
  calle?: string;
  altura?: string;
  otros?: string;
}

export interface VehiculoData {
  patente: string;
  transportistaNombre: string;  // For dropdown selection
}

export interface ConductorData {
  usuario: string;
  clave: string;
  nombre: string;
  apellido: string;
  documento: string; // RUT
  telefono?: string;
  email?: string;
  transportistaNombre: string;  // For dropdown selection
}

export interface ClienteData {
  nombre: string; // Razón social
  rut: string;
  nombreFantasia?: string;
  calle?: string;
  altura?: string;
  otros?: string;
}

export interface ContratoData {
  nroContrato: string;
  tipo: string;
  transportistaNombre: string;
  valorHora: string;
  fechaVencimiento?: string;
}

export interface BusinessEntities {
  transportista: {
    nombre: string;
    documento: string;
  };
  vehiculo: {
    patente: string;
  };
  conductor: {
    usuario: string;
    nombre: string;
    apellido: string;
    documento: string;
  };
  cliente: {
    nombre: string;
    rut: string;
  };
  contrato: {
    numero: string;
    tipo: string;
  };
}

// ============================================
// DATA GENERATORS
// ============================================

export function generateUniqueId(): string {
  return generateId();
}

export function generateDefaultTransportista(): TransportistaData {
  const companyName = generateCompanyName();
  return {
    nombre: companyName,
    razonSocial: `${companyName} SpA`,
    documento: generateValidChileanRUT(),
    calle: 'Av. Apoquindo',
    altura: generateStreetNumber(),
    otros: 'Las Condes, Santiago',
  };
}

export function generateDefaultVehiculo(transportistaNombre: string = 'Transportepadre'): VehiculoData {
  const patente = generatePatente();
  return {
    patente,
    transportistaNombre,
  };
}

export function generateDefaultConductor(transportistaNombre: string = 'Transportepadre'): ConductorData {
  const nombre = generateRandomName();
  const apellido = generateRandomLastName();
  return {
    usuario: generateUsername(),
    clave: generatePassword(),
    nombre,
    apellido,
    documento: generateValidChileanRUT(),
    telefono: generatePhone(),
    email: generateEmail(`${nombre}${apellido}`),
    transportistaNombre,
  };
}

export function generateDefaultCliente(): ClienteData {
  const companyName = generateCompanyName();
  return {
    nombre: `${companyName} Ltda`,
    rut: generateValidChileanRUT(),
    nombreFantasia: companyName,
    calle: 'Av. Providencia',
    altura: generateStreetNumber(),
    otros: 'Providencia, Santiago',
  };
}

export function generateDefaultContrato(transportistaNombre: string): ContratoData {
  const id = generateUniqueId();
  return {
    nroContrato: id,
    tipo: 'Costo',
    transportistaNombre,
    valorHora: '25000',
    fechaVencimiento: '31/12/2025',
  };
}

// ============================================
// ENTITY CREATION FUNCTIONS
// ============================================

export async function createTransportista(
  page: Page,
  data?: Partial<TransportistaData>
): Promise<TransportistaData> {
  logger.info('Creating transportista');

  const transportistaData = { ...generateDefaultTransportista(), ...data };
  const transportistaPage = new TransportistaFormPage(page);

  try {
    await transportistaPage.navigate();
    await page.waitForTimeout(1000);

    // MANDATORY FIELDS
    await transportistaPage.fillNombre(transportistaData.nombre);
    await transportistaPage.fillDocumento(transportistaData.documento);

    if (transportistaData.razonSocial) {
      await transportistaPage.fillRazonSocial(transportistaData.razonSocial);
    }

    // REQUIRED: Select Tipo Transportista (any option)
    await transportistaPage.selectTipoTransportista('Propio Con Flota No Genera Contrato');
    await page.waitForTimeout(500);

    // OPTIONAL FIELDS (fill for complete test)
    if (transportistaData.calle) {
      await transportistaPage.fillCalle(transportistaData.calle);
    }
    if (transportistaData.altura) {
      await transportistaPage.fillAltura(transportistaData.altura);
    }
    if (transportistaData.otros) {
      await transportistaPage.fillOtros(transportistaData.otros);
    }

    // Fill Forma de Pago = "Contado"
    try {
      await transportistaPage.selectFormaPago('Contado');
      await page.waitForTimeout(300);
    } catch (error) {
      logger.warn('Forma de pago field not available or already set');
    }

    // Fill Tercerizar = "NO"
    try {
      await transportistaPage.selectTercerizar('NO');
      await page.waitForTimeout(300);
    } catch (error) {
      logger.warn('Tercerizar field not available or already set');
    }

    await transportistaPage.clickGuardar();
    await page.waitForTimeout(3000);

    // Navigate to index to ensure entity is saved and cached
    await page.goto('https://moveontruckqa.bermanntms.cl/transportistas/index');
    await page.waitForTimeout(2000);

    logger.info(`✅ Transportista created: ${transportistaData.nombre}`);

    // CRITICAL: Wait for cache refresh (3-5 seconds)
    logger.info('⏳ Waiting 5 seconds for transportista to appear in other dropdowns...');
    await page.waitForTimeout(5000);

    return transportistaData;

  } catch (error) {
    logger.error('Failed to create transportista', error);
    await page.screenshot({ path: `./reports/screenshots/create-transportista-error-${Date.now()}.png` });
    throw error;
  }
}

export async function createVehiculo(
  page: Page,
  data?: Partial<VehiculoData>
): Promise<VehiculoData> {
  logger.info('Creating vehículo');

  // Use default "Transportepadre" if not provided
  const vehiculoData = {
    ...generateDefaultVehiculo('Transportepadre'),
    ...data,
  };
  const vehiculoPage = new VehiculoFormPage(page);

  try {
    await vehiculoPage.navigate();
    await page.waitForTimeout(1000);

    // CRITICAL: Select transportista first (cascading dropdown)
    await vehiculoPage.selectTransportista(vehiculoData.transportistaNombre);
    await page.waitForTimeout(1500); // Wait for cascade

    // MANDATORY FIELDS
    await vehiculoPage.fillPatente(vehiculoData.patente);

    // REQUIRED: Fill Muestra (MUST be EXACT SAME as Patente)
    await vehiculoPage.fillMuestra(vehiculoData.patente);
    await page.waitForTimeout(300);

    // REQUIRED: Select Tipo Vehiculo
    await vehiculoPage.selectTipoVehiculo('TRACTO');
    await page.waitForTimeout(500);

    // REQUIRED: Select Capacidad
    try {
      await vehiculoPage.selectCapacidad('3kg');
      await page.waitForTimeout(300);
    } catch (error) {
      logger.warn('Capacidad field not available or already set');
    }

    await vehiculoPage.clickGuardar();
    await page.waitForTimeout(3000);

    // Navigate to index to ensure entity is saved and cached
    await page.goto('https://moveontruckqa.bermanntms.cl/vehiculos/index');
    await page.waitForTimeout(2000);

    logger.info(`✅ Vehículo created: ${vehiculoData.patente}`);
    return vehiculoData;

  } catch (error) {
    logger.error('Failed to create vehículo', error);
    await page.screenshot({ path: `./reports/screenshots/create-vehiculo-error-${Date.now()}.png` });
    throw error;
  }
}

export async function createConductor(
  page: Page,
  data?: Partial<ConductorData>
): Promise<ConductorData> {
  logger.info('Creating conductor');

  // Use default "Transportepadre" if not provided
  const conductorData = {
    ...generateDefaultConductor('Transportepadre'),
    ...data,
  };
  const conductorPage = new ConductorFormPage(page);

  try {
    await conductorPage.navigate();
    await page.waitForTimeout(1000);

    // CRITICAL: Select transportista first (cascading dropdown)
    await conductorPage.selectTransportista(conductorData.transportistaNombre);
    await page.waitForTimeout(1500); // Wait for cascade

    // MANDATORY FIELDS
    await conductorPage.fillUsuario(conductorData.usuario);
    await conductorPage.fillClave(conductorData.clave);
    await conductorPage.fillNombre(conductorData.nombre);
    await conductorPage.fillApellido(conductorData.apellido);
    await conductorPage.fillDocumento(conductorData.documento);

    // OPTIONAL FIELDS (fill for complete test)
    if (conductorData.telefono) {
      await conductorPage.fillTelefono(conductorData.telefono);
    }
    if (conductorData.email) {
      await conductorPage.fillEmail(conductorData.email);
    }

    // Select Licencia = "A1"
    try {
      await conductorPage.selectLicencia('A1');
      await page.waitForTimeout(300);
    } catch (error) {
      logger.warn('Licencia field not available');
    }

    // Set Vencimiento Licencia = "31-12-2026"
    try {
      await conductorPage.setVencimientoLicencia('31-12-2026');
      await page.waitForTimeout(300);
    } catch (error) {
      logger.warn('Vencimiento licencia field not available');
    }

    await conductorPage.clickGuardar();
    await page.waitForTimeout(3000);

    // Navigate to index to ensure entity is saved and cached
    await page.goto('https://moveontruckqa.bermanntms.cl/conductores/index');
    await page.waitForTimeout(2000);

    logger.info(`✅ Conductor created: ${conductorData.nombre} ${conductorData.apellido}`);
    return conductorData;

  } catch (error) {
    logger.error('Failed to create conductor', error);
    await page.screenshot({ path: `./reports/screenshots/create-conductor-error-${Date.now()}.png` });
    throw error;
  }
}

export async function createCliente(
  page: Page,
  data?: Partial<ClienteData>
): Promise<ClienteData> {
  logger.info('Creating cliente');

  const clienteData = { ...generateDefaultCliente(), ...data };
  const clientePage = new ClienteFormPage(page);

  try {
    await clientePage.navigate();
    await page.waitForTimeout(1000);

    await clientePage.fillNombre(clienteData.nombre);
    await clientePage.fillRut(clienteData.rut);

    if (clienteData.nombreFantasia) {
      await clientePage.fillNombreFantasia(clienteData.nombreFantasia);
    }
    if (clienteData.calle) {
      await clientePage.fillCalle(clienteData.calle);
    }
    if (clienteData.altura) {
      await clientePage.fillAltura(clienteData.altura);
    }
    if (clienteData.otros) {
      await clientePage.fillOtros(clienteData.otros);
    }

    await clientePage.clickGuardar();
    await page.waitForTimeout(3000);

    // Navigate to index to ensure entity is saved and cached
    await page.goto('https://moveontruckqa.bermanntms.cl/clientes/index');
    await page.waitForTimeout(2000);

    logger.info(`✅ Cliente created: ${clienteData.nombre}`);
    return clienteData;

  } catch (error) {
    logger.error('Failed to create cliente', error);
    await page.screenshot({ path: `./reports/screenshots/create-cliente-error-${Date.now()}.png` });
    throw error;
  }
}

export async function createContrato(
  page: Page,
  data?: Partial<ContratoData>
): Promise<ContratoData> {
  logger.info('Creating contrato');

  if (!data?.transportistaNombre) {
    throw new Error('transportistaNombre is required for creating contrato');
  }

  const contratoData = {
    ...generateDefaultContrato(data.transportistaNombre),
    ...data,
  };
  const contratoPage = new ContratosFormPage(page);

  try {
    await contratoPage.navigate();
    await page.waitForTimeout(1000);

    await contratoPage.fillNroContrato(contratoData.nroContrato);
    await contratoPage.selectTipoContrato(contratoData.tipo);
    await page.waitForTimeout(1500); // Wait for cascade

    await contratoPage.selectTransportista(contratoData.transportistaNombre);
    await contratoPage.fillValorHora(contratoData.valorHora);

    // Skip fechaVencimiento - it's readonly and causes timeout
    // if (contratoData.fechaVencimiento) {
    //   await contratoPage.setFechaVencimiento(contratoData.fechaVencimiento);
    // }

    await contratoPage.clickGuardar();
    await page.waitForTimeout(3000);

    // Navigate to index to ensure entity is saved and cached
    await page.goto('https://moveontruckqa.bermanntms.cl/contrato/index');
    await page.waitForTimeout(2000);

    logger.info(`✅ Contrato created: ${contratoData.nroContrato}`);
    return contratoData;

  } catch (error) {
    logger.error('Failed to create contrato', error);
    await page.screenshot({ path: `./reports/screenshots/create-contrato-error-${Date.now()}.png` });
    throw error;
  }
}

// ============================================
// MASTER SETUP FUNCTION
// ============================================

export async function setupBusinessEntities(
  page: Page,
  options?: {
    customTransportista?: Partial<TransportistaData>;
    customVehiculo?: Partial<VehiculoData>;
    customConductor?: Partial<ConductorData>;
    customCliente?: Partial<ClienteData>;
    customContrato?: Partial<ContratoData>;
  }
): Promise<BusinessEntities> {
  logger.info('='.repeat(60));
  logger.info('🏗️  SETTING UP BUSINESS ENTITIES');
  logger.info('='.repeat(60));

  try {
    // STEP 1: Create Transportista
    logger.info('\n📦 STEP 1/5: Creating Transportista');
    const transportista = await createTransportista(page, options?.customTransportista);

    // STEP 2: Create Vehículo (uses existing Transportepadre)
    logger.info('\n🚛 STEP 2/5: Creating Vehículo');
    logger.info('Note: Using existing "Transportepadre" for vehículo');
    const vehiculo = await createVehiculo(page, {
      transportistaNombre: 'Transportepadre',
      ...options?.customVehiculo,
    });

    // STEP 3: Create Conductor (uses existing Transportepadre)
    logger.info('\n👤 STEP 3/5: Creating Conductor');
    logger.info('Note: Using existing "Transportepadre" for conductor');
    const conductor = await createConductor(page, {
      transportistaNombre: 'Transportepadre',
      ...options?.customConductor,
    });

    // STEP 4: Create Cliente
    logger.info('\n🏢 STEP 4/5: Creating Cliente');
    const cliente = await createCliente(page, options?.customCliente);

    // STEP 5: Create Contrato (uses existing Transportepadre)
    logger.info('\n📄 STEP 5/5: Creating Contrato');
    logger.info('Note: Using existing "Transportepadre" for contrato');
    const contrato = await createContrato(page, {
      transportistaNombre: 'Transportepadre',
      ...options?.customContrato,
    });

    const entities: BusinessEntities = {
      transportista: {
        nombre: transportista.nombre,
        documento: transportista.documento,
      },
      vehiculo: {
        patente: vehiculo.patente,
      },
      conductor: {
        usuario: conductor.usuario,
        nombre: conductor.nombre,
        apellido: conductor.apellido,
        documento: conductor.documento,
      },
      cliente: {
        nombre: cliente.nombre,
        rut: cliente.rut,
      },
      contrato: {
        numero: contrato.nroContrato,
        tipo: contrato.tipo,
      },
    };

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ ALL BUSINESS ENTITIES CREATED SUCCESSFULLY');
    logger.info('='.repeat(60));
    logger.info(JSON.stringify(entities, null, 2));

    return entities;

  } catch (error) {
    logger.error('❌ Failed to setup business entities', error);
    await page.screenshot({ path: `./reports/screenshots/setup-entities-error-${Date.now()}.png` });
    throw error;
  }
}
