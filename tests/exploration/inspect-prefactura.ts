import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Logging in...");
    await page.goto('https://moveontruckqa.bermanntms.cl/login');
    await page.fill('#login-usuario', 'arivas');
    await page.fill('#login-clave', 'arivas');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    console.log("Navigating to prefactura/crear...");
    await page.goto('https://moveontruckqa.bermanntms.cl/prefactura/crear');
    await page.waitForTimeout(3000);

    console.log("Selecting client using jQuery Selectpicker...");
    await page.evaluate(() => {
        // @ts-ignore
        const optionVal = $('select[name="Prefactura[cliente_id]"] option').filter(function() { 
            // @ts-ignore
            return $(this).text().toUpperCase().includes("QA_CLI_DISTRIBUIDORA_724"); 
        }).val();
        // @ts-ignore
        $('select[name="Prefactura[cliente_id]"]').selectpicker('val', optionVal);
        // @ts-ignore
        $('select[name="Prefactura[cliente_id]"]').trigger('change');
    });
    
    await page.waitForTimeout(1000);
    console.log("Clicking processar...");
    await page.click('button:has-text("Buscar viajes")');
    await page.waitForTimeout(5000); 
    
    console.log("Capturing elements in the grid...");
    const elements = await page.evaluate(() => {
        const results: any[] = [];
        // Look for checkboxes inside the trips table
        const checkboxes = document.querySelectorAll('table input[type="checkbox"]');
        checkboxes.forEach(el => {
            const input = el as HTMLInputElement;
            results.push({
                tag: input.tagName,
                type: input.type,
                name: input.name,
                id: input.id,
                value: input.value,
                class: input.className
            });
        });
        return results;
    });

    console.log("Found checkboxes:");
    console.log(JSON.stringify(elements, null, 2));

    await browser.close();
})();
