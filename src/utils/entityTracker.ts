import { createLogger } from './logger.js';

const logger = createLogger('EntityTracker');

export interface Entity {
  type: string;
  name: string;
  id?: string;
  asociado?: string;
  estado?: string;
  patente?: string;
  apellido?: string;
  extra?: string;
}

export class EntityTracker {
  private entities: Entity[] = [];

  /**
   * Registra una nueva entidad creada
   */
  register(entity: Entity) {
    this.entities.push(entity);
    logger.debug(`Entidad registrada: ${entity.type} - ${entity.name}`);
  }

  /**
   * Limpia las entidades (útil entre tests)
   */
  clear() {
    this.entities = [];
  }

  /**
   * Retorna todas las entidades registradas
   */
  getEntities() {
    return [...this.entities];
  }

  /**
   * Genera un resumen visual de las entidades creadas
   */
  getSummaryTable(): string {
    if (this.entities.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('');
    lines.push('='.repeat(100));
    lines.push('📊 RESUMEN DE ENTIDADES CREADAS');
    lines.push('='.repeat(100));

    // Mapeo de tipos a emojis
    const typeEmojis: Record<string, string> = {
      'Transportista': '🏭',
      'Cliente': '🏢',
      'Vehiculo': '🚚',
      'Conductor': '👤',
      'Contrato': '📄',
      'Viaje': '🎫',
      'Finanzas': '💰'
    };

    this.entities.forEach(entity => {
      const emoji = typeEmojis[entity.type] || '🔹';
      let entityInfo = `[${entity.name}${entity.apellido ? ' ' + entity.apellido : ''}]`;
      
      let line = `${emoji} ${entity.type.padEnd(14)}: ${entityInfo.padEnd(30)}`;
      
      const details: string[] = [];
      if (entity.id) details.push(`ID: ${entity.id}`);
      if (entity.patente) details.push(`Patente: ${entity.patente}`);
      if (entity.asociado) details.push(`Asociado: ${entity.asociado}`);
      if (entity.estado) details.push(`Estado: ${entity.estado}`);
      if (entity.extra) details.push(entity.extra);

      if (details.length > 0) {
        line += ` | ${details.join(' | ')}`;
      }
      
      lines.push(line);
    });

    lines.push('='.repeat(100));
    return lines.join('\n');
  }

  /**
   * Imprime el resumen en el log
   */
  logSummary() {
    const summary = this.getSummaryTable();
    if (summary) {
      // Usamos el logger base para evitar el prefijo del contexto en cada línea del bloque
      console.log(summary);
    }
  }
}

// Exportamos una instancia única para ser compartida vía fixtures
export const entityTracker = new EntityTracker();
