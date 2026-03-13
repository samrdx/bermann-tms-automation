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

    private static getEnvCodePrefix(): string {
        return isDemoMode() ? 'DEMO' : 'QA';
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

    /**
     * Genera un nombre estandarizado para Unidad de Negocio
     * Regla: Qa_UN_ + [Nombre] + _ + [Random3]
     * Ejemplo: Qa_UN_Norte_123
     */
    static getUnidadNegocioName(): string {
        const prefix = this.getEnvPrefix();
        const baseNames = ['Norte', 'Santiago', 'Centro', 'Sur', 'Poniente', 'Oriente'];
        const baseName = baseNames[Math.floor(Math.random() * baseNames.length)];
        const threeDigits = Math.floor(Math.random() * 900) + 100; // 100-999

        return `${prefix}UN_${baseName}_${threeDigits}`;
    }

    /**
     * Genera datos estandarizados para Tipo de Carga
     * Tipo QA: Qa_TC_Carga General_1234
     * Tipo DEMO: Demo_TC_Carga General_1234
     * Codigo QA: QA1234
     * Codigo DEMO: DEMO1234
     */
    static getTipoCargaData(): { tipo: string; codigo: string } {
        const prefix = this.getEnvPrefix();
        const codePrefix = this.getEnvCodePrefix();
        const fourDigits = Math.floor(Math.random() * 9000) + 1000; // 1000-9999

        return {
            tipo: `${prefix}TC_Carga General_${fourDigits}`,
            codigo: `${codePrefix}${fourDigits}`,
        };
    }

    /**
     * Genera datos estandarizados para Ruta
     * Nombre QA: Qa_RT_[Zona]_[4digitos]
     * Nombre DEMO: Demo_RT_[Zona]_[4digitos]
     * Nro Ruta: numero de 6 digitos
     */
    static getRutaData(): { nombreRuta: string; nroRuta: string; baseNombre: string } {
        const prefix = this.getEnvPrefix();
        const baseNames = ['Norte', 'Centro', 'Sur', 'Litoral', 'Andes'];
        const baseName = baseNames[Math.floor(Math.random() * baseNames.length)];
        const fourDigits = Math.floor(Math.random() * 9000) + 1000;
        const nroRuta = String(Math.floor(100000 + Math.random() * 900000));

        return {
            nombreRuta: `${prefix}RT_${baseName}_${fourDigits}`,
            nroRuta,
            baseNombre: `${prefix}RT_${baseName}`,
        };
    }
}

