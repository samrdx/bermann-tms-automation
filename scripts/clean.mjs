// scripts/clean.mjs
import { rimraf } from 'rimraf';

const patterns = [
  'playwright-report*',
  'test-results*',
  'allure-results*',
  'allure-report*',
  '**/playwright-report-*',
  '**/test-results-*',
  '**/allure-results-*',
  '**/allure-report-*'
];

console.log('🧹 Iniciando limpieza de artefactos...');

try {
  // Usamos rimraf de forma programática, que es más estable en Windows
  await rimraf(patterns, { glob: true });
  console.log('✅ Limpieza completada con éxito.');
} catch (error) {
  console.error('❌ Error durante la limpieza:', error);
  process.exit(1);
}