import { Page } from 'playwright';
import { BasePage } from '../../../core/BasePage.js';
import { config } from '../../../config/environment.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('DashboardPage');

export class DashboardPage extends BasePage {
  private readonly selectors = {
    // Menú principal
    menuHome: '.fal.fa-home',
    menuViajes: '.fal.fa-truck',
    menuNotificaciones: '.fas.fa-bell',
    menuHamburger: '.mdi.mdi-menu',
    
    // Usuario y logout - SELECTORES CORREGIDOS
    // Hay 2 dropdowns con clase nav-user, necesitamos el segundo (sin id)
    userDropdown: '.nav-link.dropdown-toggle.nav-user:not(#main_notification)',
    userDropdownOpen: '.dropdown-menu.profile-dropdown.show',
    logoutButton: 'a[href="/login/cerrarsesion"]',
    
    // Navegación específica
    planificarViajes: 'a[href="/viajes/crear"]',
    
    // Verificación de dashboard
    logoMin: '.logo-min',
    pageTitle: 'title',
  };

  constructor(page: Page) {
    const dashboardUrl = `${config.get().baseUrl}/site`;
    super(page, dashboardUrl);
  }

  /**
   * Verificar que estamos en el dashboard
   */
  async isOnDashboard(): Promise<boolean> {
    try {
      const currentUrl = this.getCurrentUrl();
      const isRightUrl = currentUrl.includes('/site') || currentUrl.includes('/inicio');
      const logoVisible = await this.isVisible(this.selectors.logoMin);
      
      logger.info(`Verificación de Dashboard - URL: ${isRightUrl}, Logo: ${logoVisible}`);
      return isRightUrl && logoVisible;
    } catch (error) {
      logger.error('Error al verificar el dashboard', error);
      return false;
    }
  }

 /**
 * Obtener nombre del usuario logueado
 */
async getLoggedUserName(): Promise<string> {
  try {
    // Usar el selector específico que excluye notificaciones
    const userElement = this.page.locator(this.selectors.userDropdown).first();
    await userElement.waitFor({ state: 'visible', timeout: 5000 });
    
    const userName = await userElement.textContent();
    return userName?.trim() || '';
  } catch (error) {
    logger.warn('No se pudo obtener el nombre del usuario logueado', error);
    
    // Método alternativo: buscar por contenido "user"
    try {
      const userDropdownAlt = this.page.locator('a.nav-link.dropdown-toggle.nav-user').filter({ hasText: /user/i }).first();
      const userName = await userDropdownAlt.textContent();
      return userName?.trim() || '';
    } catch {
      return '';
    }
  }
}
  /**
   * Abrir dropdown de usuario
   */
  async openUserDropdown(): Promise<void> {
    logger.info('Abriendo dropdown de usuario');
    await this.waitForElement(this.selectors.userDropdown);
    await this.click(this.selectors.userDropdown);
    
    // Esperar que el dropdown se abra
    await this.waitForElement(this.selectors.userDropdownOpen, 3000);
    logger.info('Dropdown de usuario abierto');
  }

  /**
   * Hacer logout
   */
  async logout(): Promise<void> {
    logger.info('Intentando cerrar sesión');

    try {
      // Abrir dropdown de usuario
      await this.openUserDropdown();

      // Esperar un momento para que el menú se renderice completamente
      await this.page.waitForTimeout(1000);

      // Click en logout
      await this.waitForElement(this.selectors.logoutButton);

      // Start navigation promise before clicking
      const navigationPromise = this.page.waitForURL(/\/login/, { timeout: 15000 });

      await this.click(this.selectors.logoutButton);

      // Wait for actual navigation to /login
      await navigationPromise;

      logger.info('✅ Cierre de sesión exitoso - navegado a la página de login');
    } catch (error) {
      logger.error('Fallo al cerrar sesión', error);
      await this.takeScreenshot('logout-error');
      throw error;
    }
  }

  /**
   * Verificar que el logout fue exitoso (estamos en /login)
   */
  async isLoggedOut(): Promise<boolean> {
    await this.page.waitForTimeout(1000);
    const currentUrl = this.getCurrentUrl();
    const isLoginPage = currentUrl.includes('/login');
    
    logger.info(`Verificación de cierre de sesión - En página de login: ${isLoginPage}`);
    return isLoginPage;
  }

  /**
   * Click en el ícono de inicio
   */
  async clickHome(): Promise<void> {
    logger.info('Navegando al inicio');
    await this.click(this.selectors.menuHome);
    await this.waitForNavigation();
  }

  /**
   * Navegar a módulo de Viajes
   */
  async navigateToViajes(): Promise<void> {
    logger.info('Navegando al módulo de Viajes');
    await this.click(this.selectors.menuViajes);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Navegar a Planificar Viajes
   */
  async navigateToPlanificarViajes(): Promise<void> {
    logger.info('Navegando a Planificar Viajes');
    
    // Primero hover sobre Viajes para que aparezca el submenu
    await this.page.hover(this.selectors.menuViajes);
    await this.page.waitForTimeout(500);
    
    // Click en Planificar Viajes
    await this.waitForElement(this.selectors.planificarViajes);
    await this.click(this.selectors.planificarViajes);
    await this.waitForNavigation();
    
    logger.info('✅ Navegado a Planificar Viajes');
  }

  /**
   * Click en notificaciones
   */
  async openNotifications(): Promise<void> {
    logger.info('Abriendo notificaciones');
    await this.click(this.selectors.menuNotificaciones);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Toggle menú hamburger (mobile/responsive)
   */
  async toggleHamburgerMenu(): Promise<void> {
    logger.info('Cambiando estado del menú hamburguesa');
    await this.click(this.selectors.menuHamburger);
    await this.page.waitForTimeout(500);
  }

  /**
   * Obtener título de la página actual
   */
  async getPageTitle(): Promise<string> {
    return await this.getTitle();
  }

  /**
   * Esperar que el dashboard cargue completamente
   */
  async waitForDashboardLoad(): Promise<void> {
    logger.info('Esperando a que el dashboard cargue');
    
    await this.waitForElement(this.selectors.logoMin);
    await this.waitForElement(this.selectors.userDropdown);
    await this.waitForElement(this.selectors.menuHome);
    
    logger.info('✅ Dashboard cargado');
  }
}