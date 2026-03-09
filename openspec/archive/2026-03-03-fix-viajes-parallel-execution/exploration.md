## Exploration: Desajuste de IDs en Viajes (Planificar vs Asignar)

### Current State

Actualmente, los tests `viajes-planificar.test.ts` y `viajes-asignar.test.ts` están diseñados como pruebas *Legacy Secuenciales*. El test de planificación crea un viaje y guarda el `nroViaje` en un archivo JSON local (ej. `last-run-data-chromium-qa.json`), y luego el test de asignación lee ese mismo JSON para continuar el flujo.
Sin embargo, `playwright.config.ts` tiene configurado `fullyParallel: true`. Al correr todo el módulo o ambos tests simultáneamente (por ejemplo, al ejecutar la carpeta completa mediante `npx playwright test`), Playwright ejecuta ambos tests **en paralelo**.

### Affected Areas

- `tests/e2e/modules/02-operaciones/viajes/viajes-planificar.test.ts` — Genera y guarda el `nroViaje`.
- `tests/e2e/modules/02-operaciones/viajes/viajes-asignar.test.ts` — Lee el `nroViaje`.

**Por qué ocurre el error reportado:**
Al correr en paralelo, `viajes-asignar.test.ts` arranca de inmediato y **lee el JSON** antes de que `viajes-planificar.test.ts` termine de crear el nuevo viaje y actualizar el archivo. Por ende, `asignar` lee el ID residual de una ejecución anterior (ej. el 78387 para chromium o 64228 para firefox), mientras que `planificar` termina creando uno nuevo (ej. 47100) segundos después.

### Approaches

1. **Runner Secuencial Estricto (Recomendado a corto plazo)** — No cambiar el código, instruir el uso exclusivo de los comandos de `package.json` diseñados para esto (`npm run test:legacy:fullviajes`), los cuales ejecutan los tests concatenados y de forma secuencial con `&&` o forzar la secuencialidad sin modificar el código.
   - Pros: Cero cambios en el código. Respeta la arquitectura "Legacy" actual.
   - Cons: Propenso a error manual si el desarrollador lanza Playwright directo sobre la carpeta.
   - Effort: Low

2. **Serializar los tests con Playwright (`test.describe.serial`)** — Unir o coordinar `viajes-planificar.test.ts`, `viajes-asignar.test.ts` y monitoreo mediante las herramientas seriales de Playwright para evitar paralelismo dentro de este directorio.
   - Pros: Garantiza ejecución secuencial sin importar cómo se invoque Playwright.
   - Cons: Requiere combinar archivos en uno solo, ya que `test.describe.serial` no funciona a un nivel interarchivos fácilmente sin project dependencies.
   - Effort: Medium

3. **Migrar a Tests Atómicos (Recomendado a largo plazo)** — Ya existe un esfuerzo en el proyecto por pruebas atómicas (ej. en `package.json` existen comandos `test:atomic:asignar`). Reemplazar estas pruebas legacy con sus contrapartes atómicas, donde `viajes-asignar` generaría por API su propia base de viaje sin depender del JSON.
   - Pros: Elimina por completo la fragilidad y dependencias entre tests. Permite verdadero paralelismo y escalabilidad.
   - Cons: Requiere completar los helpers de API si aún faltan.
   - Effort: High

### Recommendation

Adoptar **Approach 1** inmediatamente. De hecho, se ha actualizado la regla del comando `test:legacy:viajes` en el `package.json` para que ejecute explícitamente `viajes-planificar.test.ts` seguido de `viajes-asignar.test.ts` usando el operador `&&` y `--workers=1`. Esto asegura la regla secuencial que evita la colisión de datos en el JSON.
Para el futuro del proyecto, debe avanzarse al **Approach 3** (migración a atómicos) para devolverle al CI/CD la velocidad del paralelismo.

### Risks

- Si se sigue ejecutando el test con paralelismo activo, la data seguirá corrompiéndose, resultando en falsos negativos de automatización constantes y creando "basura" en la DB del TMS sin que los flujos finalicen porque fallan a la mitad.

### Ready for Proposal

Yes — Podemos crear un `proposal.md` para migrar completamente al enfoque atómico, o simplemente dar por resuelto el problema de entendimiento dictando una regla de ejecución en un README.
