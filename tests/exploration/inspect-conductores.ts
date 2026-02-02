import { BrowserManager } from '../../src/core/BrowserManager.js';
import { LoginPage } from '../../src/modules/auth/pages/LoginPage.js';
import { getTestUser } from '../../src/config/credentials.js';
import { logger } from '../../src/utils/logger.js';

interface ElementInfo {
  tag: string;
  id: string;
  name: string;
  type: string;
  class: string;
  placeholder: string;
  dataId: string;
  ariaLabel: string;
  text: string;
  selector: string;
}

interface ExtractedSelectors {
  url: string;
  timestamp: string;
  inputs: ElementInfo[];
  selects: ElementInfo[];
  buttons: ElementInfo[];
  dropdowns: ElementInfo[];
  textareas: ElementInfo[];
  dateInputs: ElementInfo[];
  links: ElementInfo[];
}

async function inspectConductoresPage() {
  const browser = new BrowserManager({ headless: false });

  try {
    logger.info('='.repeat(60));
    logger.info('🔍 Starting Conductores Page Inspection');
    logger.info('='.repeat(60));

    await browser.initialize();
    const page = browser.getPage();

    // ========================================
    // PHASE 1: Login
    // ========================================
    logger.info('\n🔐 PHASE 1: Login');
    const loginPage = new LoginPage(page);
    const user = getTestUser('regular');

    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    logger.info('✅ Login successful');

    await page.waitForTimeout(2000);

    // ========================================
    // PHASE 2: Navigate to Conductor/Crear
    // ========================================
    logger.info('\n🧭 PHASE 2: Navigate to Conductores/Crear');
    await page.goto('https://moveontruckqa.bermanntms.cl/conductores/crear');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    logger.info(`Current URL: ${currentUrl}`);

    if (!currentUrl.includes('/conductores/crear')) {
      throw new Error('Failed to navigate to conductores/crear page');
    }

    logger.info('✅ Successfully navigated to Conductor Crear page');

    // ========================================
    // PHASE 3: Extract All Selectors
    // ========================================
    logger.info('\n🔍 PHASE 3: Extracting DOM Elements');

    const extractScript = `
      (function() {
        function getElementInfo(el) {
          var htmlEl = el;
          var inputEl = el;
          var selector = el.tagName.toLowerCase();
          if (inputEl.id) {
            selector = '#' + inputEl.id;
          } else if (inputEl.name) {
            selector = '[name="' + inputEl.name + '"]';
          } else if (htmlEl.dataset && htmlEl.dataset.id) {
            selector = '[data-id="' + htmlEl.dataset.id + '"]';
          } else if (inputEl.type) {
            selector = el.tagName.toLowerCase() + '[type="' + inputEl.type + '"]';
          }
          return {
            tag: el.tagName.toLowerCase(),
            id: inputEl.id || '',
            name: inputEl.name || '',
            type: inputEl.type || '',
            class: el.className || '',
            placeholder: inputEl.placeholder || '',
            dataId: (htmlEl.dataset && htmlEl.dataset.id) || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            text: (htmlEl.innerText || '').substring(0, 50).trim(),
            selector: selector
          };
        }
        var inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])')).map(getElementInfo);
        var selects = Array.from(document.querySelectorAll('select')).map(getElementInfo);
        var buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(getElementInfo);
        var dropdowns = Array.from(document.querySelectorAll('.dropdown-toggle, [data-toggle="dropdown"], .bootstrap-select button')).map(getElementInfo);
        var textareas = Array.from(document.querySelectorAll('textarea')).map(getElementInfo);
        var dateInputs = Array.from(document.querySelectorAll('input[type="date"], input.datepicker, [data-provide="datepicker"], .flatpickr-input')).map(getElementInfo);
        var links = Array.from(document.querySelectorAll('a.btn, a[role="button"]')).map(getElementInfo);
        return {
          url: window.location.href,
          timestamp: new Date().toISOString(),
          inputs: inputs,
          selects: selects,
          buttons: buttons,
          dropdowns: dropdowns,
          textareas: textareas,
          dateInputs: dateInputs,
          links: links
        };
      })()
    `;

    const selectors: ExtractedSelectors = await page.evaluate(extractScript);

    // ========================================
    // PHASE 4: Print Results in JSON
    // ========================================
    logger.info('\n📊 PHASE 4: Extracted Selectors');

    console.log('\n' + '='.repeat(60));
    console.log('📋 CONDUCTOR PAGE SELECTORS (JSON)');
    console.log('='.repeat(60));
    console.log(JSON.stringify(selectors, null, 2));
    console.log('='.repeat(60));

    // Print summary
    console.log('\n📊 SUMMARY:');
    console.log(`   - Inputs: ${selectors.inputs.length}`);
    console.log(`   - Selects: ${selectors.selects.length}`);
    console.log(`   - Buttons: ${selectors.buttons.length}`);
    console.log(`   - Dropdowns: ${selectors.dropdowns.length}`);
    console.log(`   - Textareas: ${selectors.textareas.length}`);
    console.log(`   - Date Inputs: ${selectors.dateInputs.length}`);
    console.log(`   - Links: ${selectors.links.length}`);

    // Print useful selectors for page object
    console.log('\n' + '='.repeat(60));
    console.log('🎯 RECOMMENDED SELECTORS FOR PAGE OBJECT:');
    console.log('='.repeat(60));

    console.log('\n// Inputs with IDs (most stable):');
    selectors.inputs
      .filter(el => el.id)
      .forEach(el => {
        console.log(`  ${el.id.replace(/-/g, '_')}: '#${el.id}', // ${el.placeholder || el.type}`);
      });

    console.log('\n// Dropdowns (Bootstrap Select):');
    selectors.dropdowns
      .filter(el => el.dataId)
      .forEach(el => {
        console.log(`  ${el.dataId.replace(/-/g, '_')}Button: 'button[data-id="${el.dataId}"]',`);
      });

    console.log('\n// Buttons:');
    selectors.buttons
      .filter(el => el.id || el.type === 'submit')
      .forEach(el => {
        const name = el.id || (el.text ? el.text.replace(/\s+/g, '_').toLowerCase() : 'submit');
        const selector = el.id ? `#${el.id}` : `button[type="submit"]`;
        console.log(`  btn${name.charAt(0).toUpperCase() + name.slice(1)}: '${selector}',`);
      });

    // ========================================
    // PHASE 5: Take Screenshot
    // ========================================
    logger.info('\n📸 PHASE 5: Taking Screenshot');
    await page.screenshot({
      path: './reports/screenshots/conductores-crear-inspection.png',
      fullPage: true
    });
    logger.info('✅ Screenshot saved: ./reports/screenshots/conductores-crear-inspection.png');

    // Wait for manual inspection if needed
    logger.info('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ INSPECTION COMPLETE');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Inspection failed with error', error);

    try {
      const page = browser.getPage();
      await page.screenshot({
        path: `./reports/screenshots/conductores-inspection-error-${Date.now()}.png`,
        fullPage: true
      });
    } catch (screenshotError) {
      logger.error('Could not take screenshot', screenshotError);
    }

    throw error;
  } finally {
    await browser.close();
  }
}

inspectConductoresPage();
