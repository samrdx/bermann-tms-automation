import { isDemoMode } from './env-helper.js';

/**
 * NamingHelper
 * 
 * Estandariza la nomenclatura de los datos de prueba en el TMS.
 * Permite trazabilidad en Allure Report y facilita la limpieza (ILIKE 'Qa_%').
 * Soporta múltiples ambientes, aunque usa 'Qa_' como estándar para ambos.
 */
export class NamingHelper {
    private static getEnvPrefix(): string {
        return isDemoMode() ? 'Demo_' : 'Qa_';
    }

    /**
     * Genera un nombre estandarizado para Cliente
     * Regla: Qa_cli_ + [Nombre] + null + _ + [Random3]
     * Ejemplo: Qa_cli_distribuidora_892
     */
    static getClienteName(): { nombre: string; nombreFantasia: string } {
        const prefix = this.getEnvPrefix();
        const shortNames = ['distribuidora', 'comercial', 'importadora', 'logistica', 'servicios', 'industrial', 'global', 'central'];
        const baseName = shortNames[Math.floor(Math.random() * shortNames.length)];
        const threeDigits = Math.floor(Math.random() * 900) + 100; // 100-999

        const nombre = `${prefix}cli_${baseName}_${threeDigits}`;
        const nombreFantasia = `${prefix}cli_${baseName} spa_${threeDigits}`;
        
        return { nombre, nombreFantasia };
    }

    /**
     * Genera un nombre estandarizado para Transportista
     * Regla: Qa_tra_ + [Nombre] + null + _ + [Random3]
     * Ejemplo: Qa_tra_transtest_112
     */
    static getTransportistaName(): { nombre: string; razonSocial: string; baseNombre: string } {
        const prefix = this.getEnvPrefix();
        const shortNames = ['transportes', 'logistica', 'cargo', 'express', 'rutas', 'andes', 'austral', 'horizonte'];
        const baseName = shortNames[Math.floor(Math.random() * shortNames.length)];
        const threeDigits = Math.floor(Math.random() * 900) + 100;

        const nombre = `${prefix}tra_${baseName}_${threeDigits}`;
        const razonSocial = nombre;
        
        return { nombre, razonSocial, baseNombre: `${prefix}tra_${baseName}` };
    }

    /**
     * Genera un nombre estandarizado para Vehículo (Patente)
     * Regla: Qa_veh_ + [PatenteReal] (Excepción: Permite mayúsculas)
     * Ejemplo: Qa_veh_HJWT12
     */
    static getVehiculoPatente(patenteReal: string): string {
        const prefix = this.getEnvPrefix();
        // Remove dashes if any, and convert to uppercase for the final patente portion
        const cleanPatente = patenteReal.replace(/-/g, '').toUpperCase();
        return `${prefix}veh_${cleanPatente}`;
    }

    /**
     * Genera un nombre estandarizado para Conductor
     * Regla: Qa_con_ + [Nombre/Apellido]
     * Ejemplo: Nombre: Qa_con_samuel, Apellido: Qa_con_vargas
     */
    static getConductorNames(nombresReales: { nombre: string; apellido: string }): { nombre: string; apellido: string } {
        const prefix = this.getEnvPrefix();
        
        // Convert names to lowercase to strictly follow camelCase/lowercase rules of TMS
        const cleanName = nombresReales.nombre.toLowerCase().replace(/\s+/g, '');
        const cleanLastName = nombresReales.apellido.toLowerCase().replace(/\s+/g, '');

        return {
            nombre: `${prefix}con_${cleanName}`,
            apellido: `${prefix}con_${cleanLastName}`
        };
    }
}
