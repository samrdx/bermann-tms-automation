const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const currentDir = process.cwd().replace(/\\/g, '/');
const userProfile = process.env.USERPROFILE.replace(/\\/g, '/');
const opencodeConfigDir = path.join(userProfile, '.config', 'opencode');
const opencodeJsonPath = path.join(opencodeConfigDir, 'opencode.json');

console.log('🚀 Iniciando configuración de Antigravity CLI para tu máquina de trabajo...');
console.log(`- Workspace actual: ${currentDir}`);
console.log(`- Perfil de usuario: ${userProfile}\n`);

// 1. Buscar opencode.json local o global
const localOpencodeJson = path.join(currentDir, 'opencode.json');

if (fs.existsSync(localOpencodeJson)) {
  console.log('📂 Se detectó opencode.json en la raíz del proyecto. Copiándolo al directorio de configuración global...');
  if (!fs.existsSync(opencodeConfigDir)) {
    fs.mkdirSync(opencodeConfigDir, { recursive: true });
  }
  fs.copyFileSync(localOpencodeJson, opencodeJsonPath);
  console.log('✅ Archivo copiado a la carpeta global de configuración.');
} else if (!fs.existsSync(opencodeJsonPath)) {
  console.error(`❌ Error: No se encontró opencode.json en:`);
  console.error(`   - Raíz del proyecto: ${localOpencodeJson}`);
  console.error(`   - Configuración global: ${opencodeJsonPath}`);
  console.log('\nPor favor, copia el archivo "opencode.json" de tu máquina actual y pegalo en la raíz del proyecto (junto a package.json).');
  console.log('Una vez hecho esto, vuelve a ejecutar este script.');
  process.exit(1);
}

// 2. Ajustar rutas dinámicamente dentro de opencode.json
try {
  console.log('🔄 Ajustando rutas absolutas en opencode.json...');
  let jsonContent = fs.readFileSync(opencodeJsonPath, 'utf8');
  
  // Reemplazar rutas de usuario viejas (Samuel) con las del nuevo perfil
  const oldUser = 'C:/Users/Samuel';
  const oldUserEscaped = 'C:\\\\Users\\\\Samuel';
  
  jsonContent = jsonContent.replace(new RegExp(oldUserEscaped, 'g'), userProfile.replace(/\//g, '\\\\'));
  jsonContent = jsonContent.replace(new RegExp(oldUser, 'g'), userProfile);
  
  // Reemplazar rutas del proyecto viejas con la ubicación actual del repositorio
  const oldProj = 'C:/projects/bermann-tms-automation';
  const oldProjEscaped = 'C:\\\\projects\\\\bermann-tms-automation';
  
  jsonContent = jsonContent.replace(new RegExp(oldProjEscaped, 'g'), currentDir.replace(/\//g, '\\\\'));
  jsonContent = jsonContent.replace(new RegExp(oldProj, 'g'), currentDir);
  
  fs.writeFileSync(opencodeJsonPath, jsonContent, 'utf8');
  console.log('✅ Rutas de opencode.json ajustadas con éxito.');
} catch (err) {
  console.error('❌ Error al actualizar opencode.json:', err.message);
  process.exit(1);
}

// 3. Ejecutar las migraciones
try {
  console.log('\n📦 Ejecutando scripts de migración...');
  execSync('node migrate.cjs', { stdio: 'inherit' });
  execSync('node migrate-plugin.cjs', { stdio: 'inherit' });
  console.log('✅ Migraciones completadas.');
} catch (err) {
  console.error('❌ Error en los scripts de migración:', err.message);
  process.exit(1);
}

// 4. Instalar el plugin en agy
try {
  console.log('\n🔌 Registrando e instalando el plugin en agy CLI...');
  const pluginPath = path.join(currentDir, '.agents', 'plugins', 'sdd-plugin');
  execSync(`agy plugin install "${pluginPath}"`, { stdio: 'inherit' });
  console.log('✅ Plugin de agy instalado con éxito.');
} catch (err) {
  console.error('❌ Error al instalar el plugin en el CLI de agy:', err.message);
  process.exit(1);
}

// 5. Copiar el orquestador primario a las carpetas global y local
try {
  console.log('\n📂 Copiando gentle-orchestrator a directorios de agentes de agy...');
  const globalAgentsDir = path.join(userProfile, '.gemini', 'config', 'agents');
  const workspaceAgentsDir = path.join(currentDir, '.agents', 'agents');
  const sourceOrchestrator = path.join(currentDir, '.agents', 'plugins', 'sdd-plugin', 'agents', 'gentle-orchestrator.md');
  
  if (!fs.existsSync(globalAgentsDir)) {
    fs.mkdirSync(globalAgentsDir, { recursive: true });
  }
  if (!fs.existsSync(workspaceAgentsDir)) {
    fs.mkdirSync(workspaceAgentsDir, { recursive: true });
  }
  
  fs.copyFileSync(sourceOrchestrator, path.join(globalAgentsDir, 'gentle-orchestrator.md'));
  fs.copyFileSync(sourceOrchestrator, path.join(workspaceAgentsDir, 'gentle-orchestrator.md'));
  
  console.log('✅ gentle-orchestrator copiado a ~/.gemini/config/agents/ y .agents/agents/');
} catch (err) {
  console.error('❌ Error al copiar los archivos del orquestador:', err.message);
  process.exit(1);
}

console.log('\n🎉 ¡Configuración completada con éxito!');
console.log('Ahora podés abrir tu CLI y el menú /agents debería listar gentle-orchestrator correctamente.');
