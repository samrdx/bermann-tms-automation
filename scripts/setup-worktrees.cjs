const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const currentDir = process.cwd().replace(/\\/g, '/');
const parentDir = path.dirname(currentDir).replace(/\\/g, '/');

console.log('🌲 Iniciando la automatización de Git Worktrees...');
console.log(`- Repositorio maestro: ${currentDir}`);
console.log(`- Directorio padre: ${parentDir}\n`);

// Definir los worktrees
const worktrees = [
  {
    name: 'Claude (CL)',
    dir: path.join(parentDir, 'bermann-tms-automation-cl').replace(/\\/g, '/'),
    branch: 'feat/cl-workspace'
  },
  {
    name: 'Antigravity (AGY)',
    dir: path.join(parentDir, 'bermann-tms-automation-agy').replace(/\\/g, '/'),
    branch: 'feat/agy-workspace'
  }
];

// Helper para saber si una rama existe localmente
function branchExists(branchName) {
  try {
    const output = execSync(`git branch --list ${branchName}`, { encoding: 'utf8' }).trim();
    return output.includes(branchName);
  } catch (err) {
    return false;
  }
}

// 1. Crear los worktrees
for (const wt of worktrees) {
  console.log(`\n📂 Configurando worktree para ${wt.name}...`);
  
  if (fs.existsSync(wt.dir)) {
    console.log(`⚠️ La carpeta '${wt.dir}' ya existe. Saltando creación de worktree.`);
  } else {
    try {
      const exists = branchExists(wt.branch);
      if (exists) {
        console.log(`🌿 Rama '${wt.branch}' ya existe. Creando worktree vinculándolo a esta rama...`);
        execSync(`git worktree add "${wt.dir}" ${wt.branch}`, { stdio: 'inherit' });
      } else {
        console.log(`🌱 Rama '${wt.branch}' no existe. Creando rama y worktree basados en 'main'...`);
        execSync(`git worktree add "${wt.dir}" -b ${wt.branch} main`, { stdio: 'inherit' });
      }
      console.log(`✅ Worktree para ${wt.name} creado.`);
    } catch (err) {
      console.error(`❌ Error al crear worktree para ${wt.name}:`, err.message);
      continue;
    }
  }

  // 2. Copiar archivo .env
  const localEnv = path.join(currentDir, '.env');
  const targetEnv = path.join(wt.dir, '.env');
  
  if (fs.existsSync(localEnv)) {
    try {
      fs.copyFileSync(localEnv, targetEnv);
      console.log(`✅ Archivo .env copiado a ${wt.name}.`);
    } catch (err) {
      console.error(`❌ Error al copiar .env a ${wt.name}:`, err.message);
    }
  } else {
    console.log(`⚠️ No se encontró .env en el repositorio maestro para copiar.`);
  }

  // 3. Ejecutar npm install en el worktree
  try {
    console.log(`📦 Instalando dependencias en ${wt.name} (${wt.dir})...`);
    execSync('npm install', { cwd: wt.dir, stdio: 'inherit' });
    console.log(`✅ Dependencias de ${wt.name} instaladas.`);
  } catch (err) {
    console.error(`❌ Error al ejecutar 'npm install' en ${wt.name}:`, err.message);
  }
}

console.log('\n🎉 ¡Automatización de worktrees finalizada!');
