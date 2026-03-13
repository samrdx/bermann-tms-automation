import { test, expect } from '@playwright/test';
import { CapacidadPage } from '../../../../../src/modules/transport/pages/CapacidadPage.js';
import { LoginPage } from '../../../../../src/modules/auth/pages/LoginPage.js';
import { getTestUser } from '../../../../../src/config/credentials.js';
import { createLogger } from '../../../../../src/utils/logger.js';
import { allure } from 'allure-playwright';

const logger = createLogger('CapacidadesTest');

test.describe('Transportista - Capacidades', () => {
  let capacidadPage: CapacidadPage;
  const user = getTestUser('admin');
  const env = process.env.ENV || 'QA';

  test.beforeEach(async ({ page }) => {
    await allure.epic('Configuración Logística');
    await allure.feature('Capacidades');
    await allure.parameter('Ambiente', env);

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(user.username, user.password);
    capacidadPage = new CapacidadPage(page);
  });

  test('Crear Capacidad de Valor Único Dinámicamente', async ({ page }) => {
    const startTime = Date.now();
    await allure.story('Creación de Capacidad (Valor Único)');
    
    // Generar valor aleatorio entre 1 y 20
    const capacidadValor = Math.floor(Math.random() * 20) + 1;
    const tipos = ['KG', 'TON'];
    const tipoAleatorio = tipos[Math.floor(Math.random() * tipos.length)];
    const capacidadNombre = `${capacidadValor} ${tipoAleatorio}`;

    await allure.parameter('Es Rango', 'No');
    await allure.parameter('Valor', capacidadValor.toString());
    await allure.parameter('Unidad', tipoAleatorio);

    logger.fase(1, 'Navegación y Preparación');
    logger.paso('Navegando a la página de creación');
    await capacidadPage.navigateToCreate();

    logger.fase(2, 'Completar Formulario');
    logger.paso(`Configurando valor único: ${capacidadNombre}`);
    await capacidadPage.setEsRango(false);
    await capacidadPage.fillCapacidadInicial(capacidadValor.toString());
    await capacidadPage.selectTipoCapacidad(tipoAleatorio);

    logger.fase(3, 'Guardar y Procesar');
    logger.subpaso('Enviando formulario...');
    await capacidadPage.clickGuardar();
    await page.waitForLoadState('networkidle');
    logger.success('Formulario enviado correctamente');

    logger.fase(4, 'Verificación');
    logger.paso('Verificando creación en el listado');
    await capacidadPage.navigateToIndex();
    const isVisible = await capacidadPage.isCapacidadVisible(
      capacidadValor.toString(), 
      capacidadValor.toString(), 
      tipoAleatorio, 
      false
    );
    
    expect(isVisible).toBeTruthy();
    logger.success(`Capacidad "${capacidadNombre}" verificada exitosamente`);

    // Resumen Final
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(80));
    logger.success(`TEST COMPLETADO: ${capacidadNombre}`);
    logger.info(`Tiempo total: ${executionTime}s`);
    logger.info('='.repeat(80));

    await allure.attachment('Detalle de Ejecución', JSON.stringify({
      capacidad: capacidadNombre,
      esRango: false,
      duracion: `${executionTime}s`,
      ambiente: env
    }, null, 2), 'application/json');
  });

  test('Crear Capacidad de Rango Dinámicamente', async ({ page }) => {
    const startTime = Date.now();
    await allure.story('Creación de Capacidad (Rango)');

    // Generar rango aleatorio (Inicial < Final)
    const capInicial = Math.floor(Math.random() * 10) + 1;
    const capFinal = capInicial + Math.floor(Math.random() * 10) + 1;
    const tipos = ['KG', 'TON'];
    const tipoAleatorio = tipos[Math.floor(Math.random() * tipos.length)];
    const capacidadNombre = `${capInicial}-${capFinal} ${tipoAleatorio}`;

    await allure.parameter('Es Rango', 'Si');
    await allure.parameter('Capacidad Inicial', capInicial.toString());
    await allure.parameter('Capacidad Final', capFinal.toString());
    await allure.parameter('Unidad', tipoAleatorio);

    logger.fase(1, 'Navegación y Preparación');
    logger.paso('Navegando a la página de creación');
    await capacidadPage.navigateToCreate();

    logger.fase(2, 'Completar Formulario');
    logger.paso(`Configurando rango: ${capacidadNombre}`);
    await capacidadPage.setEsRango(true);
    await capacidadPage.fillCapacidadInicial(capInicial.toString());
    await capacidadPage.fillCapacidadFinal(capFinal.toString());
    await capacidadPage.selectTipoCapacidad(tipoAleatorio);

    logger.fase(3, 'Guardar y Procesar');
    logger.subpaso('Enviando formulario...');
    await capacidadPage.clickGuardar();
    await page.waitForLoadState('networkidle');
    logger.success('Formulario enviado correctamente');

    logger.fase(4, 'Verificación');
    logger.paso('Verificando creación en el listado');
    await capacidadPage.navigateToIndex();
    const isVisible = await capacidadPage.isCapacidadVisible(
      capInicial.toString(), 
      capFinal.toString(), 
      tipoAleatorio, 
      true
    );
    
    expect(isVisible).toBeTruthy();
    logger.success(`Capacidad de rango "${capacidadNombre}" verificada exitosamente`);

    // Resumen Final
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(80));
    logger.success(`TEST COMPLETADO: ${capacidadNombre}`);
    logger.info(`Tiempo total: ${executionTime}s`);
    logger.info('='.repeat(80));

    await allure.attachment('Detalle de Ejecución', JSON.stringify({
      capacidad: capacidadNombre,
      esRango: true,
      duracion: `${executionTime}s`,
      ambiente: env
    }, null, 2), 'application/json');
  });
});

