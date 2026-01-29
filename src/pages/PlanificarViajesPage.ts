import { Page } from 'playwright';
import { BasePage } from '../core/BasePage.js';
import { config } from '../config/environment.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('PlanificarViajesPage');

/**
 * Page Object for the Planificar Viajes (Plan Trips) module
 * Handles trip creation and management in Bermann TMS
 */
export class PlanificarViajesPage extends BasePage {
  private readonly selectors = {
    // Form fields
    originInput: '#origen',
    destinationInput: '#destino',
    dateInput: '#fecha',
    clientDropdown: '#cliente',
    clientOption: (value: string) => `#cliente option[value="${value}"]`,

    // Action buttons
    saveButton: 'button[type="submit"].btn-success',
    cancelButton: 'button.btn-secondary, a.btn-secondary',

    // Alternative selectors (fallbacks)
    originInputAlt: '[name="origen"], input[placeholder*="origen" i]',
    destinationInputAlt: '[name="destino"], input[placeholder*="destino" i]',
    dateInputAlt: '[name="fecha"], input[type="date"]',
    clientDropdownAlt: '[name="cliente"], select[data-field="cliente"]',

    // Success/Error messages
    successMessage: '.alert-success, [data-notify="message"].alert-success',
    errorMessage: '.alert-danger, [data-notify="message"].alert-danger',

    // Page verification
    pageTitle: '.page-title, h1',
    formContainer: 'form#viaje-form, form.viaje-form, .card-body form',

    // Loading indicators
    loadingSpinner: '.spinner, .loading, [data-loading="true"]',
  };

  constructor(page: Page) {
    const planificarViajesUrl = `${config.get().baseUrl}/viajes/crear`;
    super(page, planificarViajesUrl);
  }

  /**
   * Navigate to the Planificar Viajes page
   */
  async navigateToPlanificarViajes(): Promise<void> {
    logger.info('Navigating to Planificar Viajes page');
    try {
      await this.navigate();
      await this.waitForPageLoad();
      logger.info('✅ Successfully navigated to Planificar Viajes');
    } catch (error) {
      logger.error('Failed to navigate to Planificar Viajes', error);
      await this.takeScreenshot('planificar-viajes-navigation-error');
      throw error;
    }
  }

  /**
   * Wait for the page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    logger.debug('Waiting for Planificar Viajes page to load');
    await this.waitForNavigation();

    // Wait for form to be visible
    const formVisible = await this.isVisible(this.selectors.formContainer);
    if (!formVisible) {
      // Try waiting for any of the form fields
      await this.waitForElement(this.selectors.originInput, 5000).catch(() => {
        logger.warn('Origin input not found with primary selector, trying alternative');
      });
    }
  }

  /**
   * Fill the origin field
   * @param origin - Origin location text
   */
  async fillOrigin(origin: string): Promise<void> {
    logger.info(`Filling origin field with: ${origin}`);
    try {
      // Try primary selector first
      const primaryExists = await this.isVisible(this.selectors.originInput);
      const selector = primaryExists ? this.selectors.originInput : this.selectors.originInputAlt;

      await this.waitForElement(selector);
      await this.fill(selector, origin);
      logger.debug('Origin field filled successfully');
    } catch (error) {
      logger.error('Failed to fill origin field', error);
      await this.takeScreenshot('fill-origin-error');
      throw error;
    }
  }

  /**
   * Fill the destination field
   * @param destination - Destination location text
   */
  async fillDestination(destination: string): Promise<void> {
    logger.info(`Filling destination field with: ${destination}`);
    try {
      const primaryExists = await this.isVisible(this.selectors.destinationInput);
      const selector = primaryExists ? this.selectors.destinationInput : this.selectors.destinationInputAlt;

      await this.waitForElement(selector);
      await this.fill(selector, destination);
      logger.debug('Destination field filled successfully');
    } catch (error) {
      logger.error('Failed to fill destination field', error);
      await this.takeScreenshot('fill-destination-error');
      throw error;
    }
  }

  /**
   * Select a date for the trip
   * @param date - Date string in YYYY-MM-DD format
   */
  async selectDate(date: string): Promise<void> {
    logger.info(`Selecting date: ${date}`);
    try {
      const primaryExists = await this.isVisible(this.selectors.dateInput);
      const selector = primaryExists ? this.selectors.dateInput : this.selectors.dateInputAlt;

      await this.waitForElement(selector);
      await this.fill(selector, date);
      logger.debug('Date selected successfully');
    } catch (error) {
      logger.error('Failed to select date', error);
      await this.takeScreenshot('select-date-error');
      throw error;
    }
  }

  /**
   * Select a client from the dropdown
   * @param clientValue - The value attribute of the client option to select
   */
  async selectClient(clientValue: string): Promise<void> {
    logger.info(`Selecting client: ${clientValue}`);
    try {
      const primaryExists = await this.isVisible(this.selectors.clientDropdown);
      const selector = primaryExists ? this.selectors.clientDropdown : this.selectors.clientDropdownAlt;

      await this.waitForElement(selector);
      await this.page.selectOption(selector, clientValue);
      logger.debug('Client selected successfully');
    } catch (error) {
      logger.error('Failed to select client', error);
      await this.takeScreenshot('select-client-error');
      throw error;
    }
  }

  /**
   * Select a client by visible text
   * @param clientName - The visible text of the client option
   */
  async selectClientByText(clientName: string): Promise<void> {
    logger.info(`Selecting client by text: ${clientName}`);
    try {
      const primaryExists = await this.isVisible(this.selectors.clientDropdown);
      const selector = primaryExists ? this.selectors.clientDropdown : this.selectors.clientDropdownAlt;

      await this.waitForElement(selector);
      await this.page.selectOption(selector, { label: clientName });
      logger.debug('Client selected by text successfully');
    } catch (error) {
      logger.error('Failed to select client by text', error);
      await this.takeScreenshot('select-client-text-error');
      throw error;
    }
  }

  /**
   * Click the save button to create the trip
   */
  async clickSave(): Promise<void> {
    logger.info('Clicking save button');
    try {
      await this.waitForElement(this.selectors.saveButton);
      await this.click(this.selectors.saveButton);
      await this.page.waitForTimeout(2000);
      logger.info('Save button clicked');
    } catch (error) {
      logger.error('Failed to click save button', error);
      await this.takeScreenshot('click-save-error');
      throw error;
    }
  }

  /**
   * Click the cancel button to abort trip creation
   */
  async clickCancel(): Promise<void> {
    logger.info('Clicking cancel button');
    try {
      await this.waitForElement(this.selectors.cancelButton);
      await this.click(this.selectors.cancelButton);
      await this.page.waitForTimeout(1000);
      logger.info('Cancel button clicked');
    } catch (error) {
      logger.error('Failed to click cancel button', error);
      await this.takeScreenshot('click-cancel-error');
      throw error;
    }
  }

  /**
   * Verify that a trip was created successfully
   * @returns true if success message is displayed or URL changed to success state
   */
  async isViajeCreatedSuccessfully(): Promise<boolean> {
    logger.info('Verifying viaje creation');
    try {
      await this.page.waitForTimeout(2000);

      // Check for success message
      const successVisible = await this.isVisible(this.selectors.successMessage);
      if (successVisible) {
        const message = await this.getText(this.selectors.successMessage);
        logger.info(`✅ Success message displayed: ${message}`);
        return true;
      }

      // Check URL for success indicators
      const currentUrl = this.getCurrentUrl();
      const urlIndicatesSuccess = currentUrl.includes('/viajes') && !currentUrl.includes('/crear');

      if (urlIndicatesSuccess) {
        logger.info('✅ URL indicates successful creation');
        return true;
      }

      // Check for error message
      const errorVisible = await this.isVisible(this.selectors.errorMessage);
      if (errorVisible) {
        const errorMsg = await this.getText(this.selectors.errorMessage);
        logger.warn(`Error message displayed: ${errorMsg}`);
        return false;
      }

      logger.warn('Could not determine viaje creation status');
      return false;
    } catch (error) {
      logger.error('Error verifying viaje creation', error);
      await this.takeScreenshot('verify-viaje-error');
      return false;
    }
  }

  /**
   * Get the success message text
   */
  async getSuccessMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.successMessage)) {
      return await this.getText(this.selectors.successMessage);
    }
    return '';
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.errorMessage)) {
      return await this.getText(this.selectors.errorMessage);
    }
    return '';
  }

  /**
   * Check if we are on the Planificar Viajes page
   */
  async isOnPlanificarViajesPage(): Promise<boolean> {
    const currentUrl = this.getCurrentUrl();
    return currentUrl.includes('/viajes/crear');
  }

  /**
   * Create a complete viaje with all required fields
   * @param viajeData - Object containing origin, destination, date, and client
   */
  async createViaje(viajeData: {
    origin: string;
    destination: string;
    date: string;
    client: string;
  }): Promise<boolean> {
    logger.info('='.repeat(50));
    logger.info('🚀 Creating new viaje');
    logger.info('='.repeat(50));

    try {
      // Ensure we're on the right page
      if (!await this.isOnPlanificarViajesPage()) {
        await this.navigateToPlanificarViajes();
      }

      // Fill all form fields
      logger.info('📝 STEP 1: Filling origin');
      await this.fillOrigin(viajeData.origin);

      logger.info('📝 STEP 2: Filling destination');
      await this.fillDestination(viajeData.destination);

      logger.info('📝 STEP 3: Selecting date');
      await this.selectDate(viajeData.date);

      logger.info('📝 STEP 4: Selecting client');
      await this.selectClient(viajeData.client);

      logger.info('📝 STEP 5: Saving viaje');
      await this.clickSave();

      // Verify creation
      logger.info('📝 STEP 6: Verifying creation');
      const success = await this.isViajeCreatedSuccessfully();

      if (success) {
        logger.info('='.repeat(50));
        logger.info('✅ VIAJE CREATED SUCCESSFULLY');
        logger.info('='.repeat(50));
      } else {
        const errorMsg = await this.getErrorMessage();
        logger.error(`❌ Viaje creation failed: ${errorMsg}`);
        await this.takeScreenshot('viaje-creation-failed');
      }

      return success;
    } catch (error) {
      logger.error('❌ Error during viaje creation', error);
      await this.takeScreenshot('viaje-creation-error');
      throw error;
    }
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    logger.info('Clearing form fields');
    try {
      const originSelector = await this.isVisible(this.selectors.originInput)
        ? this.selectors.originInput
        : this.selectors.originInputAlt;
      const destSelector = await this.isVisible(this.selectors.destinationInput)
        ? this.selectors.destinationInput
        : this.selectors.destinationInputAlt;

      await this.page.fill(originSelector, '');
      await this.page.fill(destSelector, '');
      logger.debug('Form fields cleared');
    } catch (error) {
      logger.warn('Could not clear some form fields', error);
    }
  }
}
