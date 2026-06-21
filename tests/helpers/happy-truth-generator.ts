import * as fs from 'fs';
import * as path from 'path';
import { DataPathHelper } from '../api-helpers/DataPathHelper.js';

export class HappyTruthGenerator {
  static generate(testInfo: any) {
    const env = (process.env.ENV || 'QA').toUpperCase();
    const dataPath = DataPathHelper.getLegacyEntityDataPath(testInfo);
    
    if (!fs.existsSync(dataPath)) {
      console.warn(`[HappyTruthGenerator] Seed data file not found at: ${dataPath}`);
      return;
    }

    let data: any = {};
    try {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    } catch (e) {
      console.error(`[HappyTruthGenerator] Failed to parse seed data file at ${dataPath}:`, e);
      return;
    }

    const transportista = data.seededTransportista || data.transportista || {};
    const driver = data.seededConductor || data.conductor || data.driver || {};
    const vehicle = data.seededVehiculo || data.vehiculo || data.vehicle || {};
    const cliente = data.seededCliente || data.cliente || {};
    const contractTransportista = data.contratoTransportista || {};
    const contractCliente = data.contratoCliente || {};

    const isDemo = env === 'DEMO';
    const defaultExpDate = isDemo ? '31/12/2026' : 'Indefinida';

    const tName = transportista.nombre || transportista.nombreFantasia || 'N/A';
    const tRut = transportista.documento || transportista.rut || 'N/A';
    const tId = transportista.id || 'N/A';

    const vPatente = vehicle.patente || 'N/A';

    const cName = driver.nombre ? `${driver.nombre} ${driver.apellido || ''}`.trim() : (driver.name || 'N/A');
    const cRut = driver.rut || 'N/A';

    const cCliName = cliente.nombreFantasia || cliente.nombre || 'N/A';
    const cCliRut = cliente.rut || 'N/A';
    const cCliId = cliente.id || 'N/A';

    const formatContract = (c: any) => {
      if (!c || !c.id) return 'N/A';
      const routesStr = Array.isArray(c.routes) ? c.routes.join(', ') : (c.routes || 'N/A');
      return `ID: ${c.id}, NroContrato: ${c.nroContrato || c.number || 'N/A'}, Tipo: ${c.type || 'ruta'}, Rutas: [${routesStr}], Vencimiento: ${c.expirationDate || defaultExpDate}`;
    };

    const transContractStr = formatContract(contractTransportista);
    const clientContractStr = formatContract(contractCliente);

    // Build the table in Spanish
    const tableMarkdown = `| Entidad | Propiedad | Valor |
|---|---|---|
| **Cliente** | Nombre / RUT / ID | Nombre: ${cCliName}, RUT: ${cCliRut}, ID: ${cCliId} |
| **Transportista** | Nombre / RUT / ID | Nombre: ${tName}, RUT: ${tRut}, ID: ${tId} |
| **Vehículo** | Patente | ${vPatente} |
| **Conductor** | Nombre / RUT | Nombre: ${cName}, RUT: ${cRut} |
| **Contrato Transportista** | Detalles | ${transContractStr} |
| **Contrato Cliente** | Detalles | ${clientContractStr} |`;

    const sectionHeader = `## Ambiente: ${env}`;
    const credentialsSection = `### Credenciales de la App (Conductor)
- **Usuario**: \`${driver.usuario || 'N/A'}\`
- **Contraseña**: \`${driver.clave || 'N/A'}\`
- **Email**: \`${driver.email || 'N/A'}\``;

    const newSectionContent = `${sectionHeader}\n\n${credentialsSection}\n\n### Entidades Activas\n${tableMarkdown}\n`;

    const targetFilePath = path.join(process.cwd(), 'docs', 'manual-happy-paths.md');
    const docsDir = path.dirname(targetFilePath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    let fileContent = '';
    if (fs.existsSync(targetFilePath)) {
      fileContent = fs.readFileSync(targetFilePath, 'utf-8');
    }

    const mainHeader = `# Rutas Felices Manuales\n\nEste archivo se actualiza dinámicamente con los datos de prueba del sembrado por las suites de pruebas E2E.\n\n`;

    if (!fileContent.trim()) {
      fileContent = mainHeader + newSectionContent;
    } else {
      let headerSection = mainHeader;
      
      const sections = fileContent.split(/(?=## (?:Ambiente:|Environment:))/);
      if (sections[0] && (sections[0].includes('# Manual Happy Paths') || sections[0].includes('# Rutas Felices Manuales'))) {
        headerSection = mainHeader;
      }
      
      const otherSections: string[] = [];
      for (let i = 1; i < sections.length; i++) {
        const sec = sections[i].trim();
        if (sec.startsWith(`## Ambiente: ${env}`) || sec.startsWith(`## Environment: ${env}`)) {
          continue; // overwrite active env
        }
        if (sec) {
          otherSections.push(sec);
        }
      }

      let newContent = headerSection.trimEnd() + '\n\n' + newSectionContent.trim();
      for (const otherSec of otherSections) {
        newContent += '\n\n' + otherSec;
      }
      fileContent = newContent + '\n';
    }

    fs.writeFileSync(targetFilePath, fileContent, 'utf-8');
    console.log(`[HappyTruthGenerator] Updated docs/manual-happy-paths.md for ${env}`);
  }
}
