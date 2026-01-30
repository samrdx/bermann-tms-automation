import { BrowserManager } from '../src/core/BrowserManager.js';
import { LoginPage } from '../src/pages/LoginPage.js';
import { getTestUser } from '../src/config/credentials.js';
import { logger } from '../src/utils/logger.js';

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
  disabled: boolean;
  readonly: boolean;
}

interface TableColumnInfo {
  index: number;
  header: string;
  selector: string;
}

interface ExtractedSelectors {
  url: string;
  timestamp: string;
  filters: {
    inputs: ElementInfo[];
    selects: ElementInfo[];
    dropdowns: ElementInfo[];
    dateInputs: ElementInfo[];
    buttons: ElementInfo[];
  };
  table: {
    container: string;
    headers: TableColumnInfo[];
    rowSelector: string;
    rowCount: number;
    actionButtons: ElementInfo[];
    pagination: ElementInfo[];
    searchBox: ElementInfo | null;
  };
  modal: {
    containers: ElementInfo[];
    dropdowns: ElementInfo[];
    inputs: ElementInfo[];
    buttons: ElementInfo[];
  };
}

async function inspectAsignarViajesPage() {
  const browser = new BrowserManager({ headless: false });

  try {
    logger.info('='.repeat(60));
    logger.info('Starting Asignar Viajes Page Inspection');
    logger.info('='.repeat(60));

    await browser.initialize();
    const page = browser.getPage();

    // ========================================
    // PHASE 1: Login
    // ========================================
    logger.info('\n PHASE 1: Login');
    const loginPage = new LoginPage(page);
    const user = getTestUser('regular');

    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    logger.info('Login successful');

    await page.waitForTimeout(2000);

    // ========================================
    // PHASE 2: Navigate to Viajes/Asignar
    // ========================================
    logger.info('\n PHASE 2: Navigate to Viajes/Asignar');
    await page.goto('https://moveontruckqa.bermanntms.cl/viajes/asignar');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    logger.info(`Current URL: ${currentUrl}`);

    if (!currentUrl.includes('/viajes/asignar')) {
      throw new Error('Failed to navigate to viajes/asignar page');
    }

    logger.info('Successfully navigated to Asignar Viajes page');

    // ========================================
    // PHASE 3: Extract All Selectors
    // ========================================
    logger.info('\n PHASE 3: Extracting DOM Elements');

    // SECTION A: Filter/Search Area
    logger.info('Extracting SECTION A: Filter/Search Area...');

    const filterExtractScript = `
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
            selector = 'button[data-id="' + htmlEl.dataset.id + '"]';
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
            selector: selector,
            disabled: inputEl.disabled || false,
            readonly: inputEl.readOnly || false
          };
        }

        // Find filter container (usually a form or card with filters)
        var filterArea = document.querySelector('.card-body, .filter-section, form, .search-filters') || document.body;

        var inputs = Array.from(filterArea.querySelectorAll('input:not([type="hidden"])')).map(getElementInfo);
        var selects = Array.from(filterArea.querySelectorAll('select')).map(getElementInfo);
        var dropdowns = Array.from(filterArea.querySelectorAll('.dropdown-toggle, [data-toggle="dropdown"], .bootstrap-select button, button.dropdown-toggle')).map(getElementInfo);
        var dateInputs = Array.from(filterArea.querySelectorAll('input[type="date"], input.datepicker, [data-provide="datepicker"], .flatpickr-input, input[data-toggle="datetimepicker"]')).map(getElementInfo);
        var buttons = Array.from(filterArea.querySelectorAll('button[type="submit"], button.btn-primary, button.btn-search, input[type="submit"], a.btn')).map(getElementInfo);

        return {
          inputs: inputs,
          selects: selects,
          dropdowns: dropdowns,
          dateInputs: dateInputs,
          buttons: buttons
        };
      })()
    `;

    const filterSelectors = await page.evaluate(filterExtractScript);
    logger.info(`Found ${filterSelectors.inputs.length} inputs, ${filterSelectors.selects.length} selects, ${filterSelectors.dropdowns.length} dropdowns`);

    // Take screenshot of filter section
    await page.screenshot({
      path: './reports/screenshots/asignar-01-filters.png',
      fullPage: false
    });
    logger.info('Screenshot saved: asignar-01-filters.png');

    // SECTION B: Table Area
    logger.info('Extracting SECTION B: Table Area...');

    const tableExtractScript = `
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
            selector = 'button[data-id="' + htmlEl.dataset.id + '"]';
          } else if (el.className) {
            selector = '.' + el.className.split(' ').filter(function(c) { return c; }).join('.');
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
            selector: selector,
            disabled: inputEl.disabled || false,
            readonly: inputEl.readOnly || false
          };
        }

        // Find the main data table
        var table = document.querySelector('table, [role="table"], .dataTable, #tabla-viajes');
        var result = {
          container: '',
          headers: [],
          rowSelector: '',
          rowCount: 0,
          actionButtons: [],
          pagination: [],
          searchBox: null
        };

        if (table) {
          result.container = table.id ? '#' + table.id : (table.className ? '.' + table.className.split(' ')[0] : 'table');

          // Get headers
          var headerCells = table.querySelectorAll('thead th, thead td');
          result.headers = Array.from(headerCells).map(function(th, idx) {
            return {
              index: idx,
              header: (th.innerText || '').trim().substring(0, 30),
              selector: 'th:nth-child(' + (idx + 1) + ')'
            };
          });

          // Get row count and selector
          var rows = table.querySelectorAll('tbody tr');
          result.rowCount = rows.length;
          result.rowSelector = 'tbody tr';

          // Find action buttons in first row (if exists)
          if (rows.length > 0) {
            var firstRow = rows[0];
            var actionBtns = firstRow.querySelectorAll('button, a.btn, [role="button"], .btn');
            result.actionButtons = Array.from(actionBtns).map(getElementInfo);
          }
        }

        // DataTables search box
        var searchBox = document.querySelector('input[type="search"], .dataTables_filter input, #tabla-viajes_filter input');
        if (searchBox) {
          result.searchBox = getElementInfo(searchBox);
        }

        // Pagination
        var paginationBtns = document.querySelectorAll('.pagination a, .paginate_button, .dataTables_paginate a');
        result.pagination = Array.from(paginationBtns).slice(0, 5).map(getElementInfo);

        return result;
      })()
    `;

    const tableSelectors = await page.evaluate(tableExtractScript);
    logger.info(`Table found: ${tableSelectors.container}, ${tableSelectors.rowCount} rows, ${tableSelectors.headers.length} columns`);

    // Take screenshot of table
    await page.screenshot({
      path: './reports/screenshots/asignar-02-table.png',
      fullPage: true
    });
    logger.info('Screenshot saved: asignar-02-table.png');

    // SECTION C: Try to open modal (if assign button exists)
    logger.info('Extracting SECTION C: Assignment Modal...');

    let modalSelectors = {
      containers: [] as ElementInfo[],
      dropdowns: [] as ElementInfo[],
      inputs: [] as ElementInfo[],
      buttons: [] as ElementInfo[]
    };

    // Try to click first assign button to open modal
    const assignButtonSelector = tableSelectors.actionButtons.find(
      (btn: ElementInfo) => btn.text.toLowerCase().includes('asignar') ||
                           btn.class.includes('asignar') ||
                           btn.id.includes('asignar')
    );

    if (assignButtonSelector || tableSelectors.actionButtons.length > 0) {
      logger.info('Attempting to open assignment modal...');

      try {
        // Try clicking first action button that might be assign
        const firstRow = page.locator('tbody tr').first();
        const assignBtn = firstRow.locator('button, a.btn').first();

        if (await assignBtn.count() > 0) {
          await assignBtn.click();
          await page.waitForTimeout(2000);

          // Extract modal selectors
          const modalExtractScript = `
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
                  selector = 'button[data-id="' + htmlEl.dataset.id + '"]';
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
                  selector: selector,
                  disabled: inputEl.disabled || false,
                  readonly: inputEl.readOnly || false
                };
              }

              // Find visible modals
              var modals = document.querySelectorAll('.modal.show, .modal[style*="display: block"], .modal.in, [role="dialog"]:not([aria-hidden="true"])');
              var result = {
                containers: [],
                dropdowns: [],
                inputs: [],
                buttons: []
              };

              modals.forEach(function(modal) {
                result.containers.push(getElementInfo(modal));

                // Get dropdowns in modal
                var dropdowns = modal.querySelectorAll('.dropdown-toggle, button[data-id], .bootstrap-select button, select');
                result.dropdowns = result.dropdowns.concat(Array.from(dropdowns).map(getElementInfo));

                // Get inputs in modal
                var inputs = modal.querySelectorAll('input:not([type="hidden"]), textarea');
                result.inputs = result.inputs.concat(Array.from(inputs).map(getElementInfo));

                // Get buttons in modal
                var buttons = modal.querySelectorAll('button, a.btn');
                result.buttons = result.buttons.concat(Array.from(buttons).map(getElementInfo));
              });

              return result;
            })()
          `;

          modalSelectors = await page.evaluate(modalExtractScript);
          logger.info(`Modal found: ${modalSelectors.containers.length} containers, ${modalSelectors.dropdowns.length} dropdowns`);

          // Take screenshot of modal
          await page.screenshot({
            path: './reports/screenshots/asignar-03-modal.png'
          });
          logger.info('Screenshot saved: asignar-03-modal.png');

          // Close modal
          const closeBtn = page.locator('.modal.show button[data-dismiss="modal"], .modal.show .btn-secondary, .modal.show .close').first();
          if (await closeBtn.count() > 0) {
            await closeBtn.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (modalError) {
        logger.warn('Could not open modal for inspection:', modalError);
      }
    } else {
      logger.info('No assign button found in table rows');
    }

    // ========================================
    // PHASE 4: Print Results in JSON
    // ========================================
    logger.info('\n PHASE 4: Extracted Selectors');

    const allSelectors: ExtractedSelectors = {
      url: currentUrl,
      timestamp: new Date().toISOString(),
      filters: filterSelectors,
      table: tableSelectors,
      modal: modalSelectors
    };

    console.log('\n' + '='.repeat(60));
    console.log('ASIGNAR VIAJES PAGE SELECTORS (JSON)');
    console.log('='.repeat(60));
    console.log(JSON.stringify(allSelectors, null, 2));
    console.log('='.repeat(60));

    // Print summary
    console.log('\n SUMMARY:');
    console.log('='.repeat(40));
    console.log('FILTER SECTION:');
    console.log(`   - Inputs: ${allSelectors.filters.inputs.length}`);
    console.log(`   - Selects: ${allSelectors.filters.selects.length}`);
    console.log(`   - Dropdowns: ${allSelectors.filters.dropdowns.length}`);
    console.log(`   - Date Inputs: ${allSelectors.filters.dateInputs.length}`);
    console.log(`   - Buttons: ${allSelectors.filters.buttons.length}`);
    console.log('\nTABLE SECTION:');
    console.log(`   - Container: ${allSelectors.table.container}`);
    console.log(`   - Columns: ${allSelectors.table.headers.length}`);
    console.log(`   - Rows: ${allSelectors.table.rowCount}`);
    console.log(`   - Action Buttons: ${allSelectors.table.actionButtons.length}`);
    console.log(`   - Has Search: ${allSelectors.table.searchBox ? 'Yes' : 'No'}`);
    console.log('\nMODAL SECTION:');
    console.log(`   - Containers: ${allSelectors.modal.containers.length}`);
    console.log(`   - Dropdowns: ${allSelectors.modal.dropdowns.length}`);
    console.log(`   - Inputs: ${allSelectors.modal.inputs.length}`);
    console.log(`   - Buttons: ${allSelectors.modal.buttons.length}`);

    // Print recommended selectors for page object
    console.log('\n' + '='.repeat(60));
    console.log('RECOMMENDED SELECTORS FOR PAGE OBJECT:');
    console.log('='.repeat(60));

    console.log('\n// FILTER SELECTORS:');
    allSelectors.filters.inputs
      .filter(el => el.id)
      .forEach(el => {
        console.log(`  ${el.id.replace(/-/g, '_')}: '#${el.id}', // ${el.placeholder || el.type}`);
      });

    console.log('\n// FILTER DROPDOWNS (Bootstrap Select):');
    allSelectors.filters.dropdowns
      .filter(el => el.dataId)
      .forEach(el => {
        console.log(`  ${el.dataId.replace(/-/g, '_')}_btn: 'button[data-id="${el.dataId}"]',`);
      });

    console.log('\n// TABLE HEADERS:');
    allSelectors.table.headers.forEach(col => {
      console.log(`  // Column ${col.index}: "${col.header}"`);
    });

    console.log('\n// TABLE ACTION BUTTONS (first row sample):');
    allSelectors.table.actionButtons.forEach((btn, idx) => {
      console.log(`  actionBtn${idx}: '${btn.selector}', // ${btn.text}`);
    });

    if (allSelectors.table.searchBox) {
      console.log('\n// DATATABLES SEARCH:');
      console.log(`  searchBox: '${allSelectors.table.searchBox.selector}',`);
    }

    console.log('\n// MODAL DROPDOWNS:');
    allSelectors.modal.dropdowns
      .filter(el => el.dataId || el.id)
      .forEach(el => {
        const key = el.dataId || el.id;
        console.log(`  ${key.replace(/-/g, '_')}: '${el.selector}',`);
      });

    console.log('\n// MODAL BUTTONS:');
    allSelectors.modal.buttons
      .filter(el => el.id || el.text)
      .forEach(el => {
        const name = el.id || el.text.replace(/\s+/g, '_').toLowerCase();
        console.log(`  ${name}: '${el.selector}', // ${el.text}`);
      });

    // ========================================
    // PHASE 5: Manual Inspection Wait
    // ========================================
    logger.info('\n Keeping browser open for 90 seconds for manual inspection...');
    logger.info('Use DevTools (F12) to explore additional elements');
    await page.waitForTimeout(90000);

    logger.info('\n' + '='.repeat(60));
    logger.info('INSPECTION COMPLETE');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('Inspection failed with error', error);

    try {
      const page = browser.getPage();
      await page.screenshot({
        path: `./reports/screenshots/asignar-inspection-error-${Date.now()}.png`,
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

inspectAsignarViajesPage();
