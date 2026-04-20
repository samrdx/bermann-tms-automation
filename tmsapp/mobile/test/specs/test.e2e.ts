const runLegacyPocFallback = process.env.MOBILE_POC_FALLBACK === 'true';

(runLegacyPocFallback ? describe : describe.skip)('Flujo de Login Bermann TMS (legacy POC fallback)', () => {
    it('debería hacer clic en el botón de ingreso inicial', async () => {
        // En Apps nativas NO usamos browser.url()
        // Esperamos a que el botón sea visible
        // Usamos accesibility id o xpath por texto
        const btnIngreso = await $('android=new UiSelector().text("INGRESO")');
        
        // Esperar hasta 10 segundos a que aparezca por si la carga es lenta
        await btnIngreso.waitForDisplayed({ timeout: 10000 });
        await btnIngreso.click();

        // Pausa pequeña para que veas el cambio en el emulador
        await driver.pause(2000);

        // Aquí iría el siguiente paso de "Empresa"
        const inputEmpresa = await $('android=new UiSelector().className("android.widget.EditText")');
        await inputEmpresa.setValue('moveontruckqa');
        
        await driver.pause(5000); // Solo para que alcances a ver que escribió
    });
});
