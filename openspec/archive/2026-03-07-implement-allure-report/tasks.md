# Tasks: Implement Allure Report

- [ ] Instalar dependencias `allure-playwright` y `allure-commandline`.
- [ ] Actualizar `playwright.config.ts` agregando `['allure-playwright', { outputFolder: 'allure-results' }]`.
- [ ] Confirmar que capturas, trazas y videos estén en modo 'retain-on-failure' o 'only-on-failure'.
- [ ] Actualizar `package.json` con scripts:
  - `clean:allure`: para borrar `allure-results` y `allure-report`.
  - `allure:generate`: para empaquetar resultados.
  - `allure:serve`/`allure:open`: para poder desplegar en vivo el servidor del reporte local.
- [ ] En pruebas clave (`viajes-asignar.test.ts`, `viajes-monitoreo.test.ts`):
  - Añadir anotaciones de Allure (`epic`, `feature`, `story`).
  - Mostrar cómo se guardan payloads JSON usando `allure.attachment`.
  - Explicar o añadir `test.step` para pasos de Asignar/Finalizar.
