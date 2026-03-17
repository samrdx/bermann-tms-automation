import { isDemoMode } from './env-helper.js';

/**
 * NamingHelper
 * 
 * Estandariza la nomenclatura de los datos de prueba en el TMS.
 * Permite trazabilidad en Allure Report y facilita la limpieza (ILIKE 'Qa_%').
 * Soporta multiples ambientes con prefijo por ambiente (QA=Qa_, DEMO=Demo_).
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
     * Genera un nombre estandarizado para VehÃ­culo (Patente)
     * Regla: Qa_veh_ + [PatenteReal] (ExcepciÃ³n: Permite mayÃºsculas)
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
     * Genera nombre para maestros de Carga.
     * Regla QA: Qa_<Tag>_<Random5>
     * Regla DEMO: Demo_<Tag>_<Random5>
     * Ejemplo QA: Qa_Unidad_17102
     * Ejemplo DEMO: Demo_Unidad_17102
     */
    static getCargaMasterName(tag: string): string {
        const prefix = this.getEnvPrefix();
        const safeTag = tag
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');

        const randomFiveDigits = Math.floor(10000 + Math.random() * 90000);
        return `${prefix}${safeTag}_${randomFiveDigits}`;
    }

    /**
     * Nombre especifico para Tipo de Rampla.
     * Regla QA: qa_tiporam_<5digitos>
     * Regla DEMO: Demo_tiporam_<5digitos>
     */
    static getTipoRamplaName(): string {
        const randomFiveDigits = Math.floor(10000 + Math.random() * 90000);
        return isDemoMode()
            ? `Demo_tiporam_${randomFiveDigits}`
            : `qa_tiporam_${randomFiveDigits}`;
    }
}


