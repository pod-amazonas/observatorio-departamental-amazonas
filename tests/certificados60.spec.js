const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const aviso='Demostración: muestra cómo funcionará la solicitud en línea. No radica solicitudes, no envía datos y no genera certificados.';
test.beforeEach(async({page})=>{
 await page.route('**/*',r=>{
  const u=new URL(r.request().url());
  if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?r.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):r.continue();
  if(u.hostname.endsWith('tile.openstreetmap.org'))return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({json:[]});
 });
});
for(const width of [1280,390])test('demostración: cinco etapas sin envío, persistencia ni radicados a '+width,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 const requests=[],errors=[];page.on('request',r=>requests.push({method:r.method(),url:r.url(),body:r.postData()}));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#certificados');
 const demo=page.getByRole('region',{name:'Formulario de demostración',exact:true});
 await expect(demo.getByRole('note').first()).toHaveText(aviso);await expect(demo).toContainText('Usa únicamente datos ficticios');
 expect(await page.evaluate(()=>document.querySelector('#certificados-informacion').compareDocumentPosition(document.querySelector('#certificados-legacy'))&Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
 const stored=()=>page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}})),before=await stored();
 await page.locator('#obs19-location').selectOption('Área no Municipalizada');await page.locator('#cert13-next').click();await expect(page.locator('#cert13-validation')).toContainText('Escribe el nombre');
 await page.locator('#cert13-name').fill('PROYECTO_FICTICIO_60');await page.locator('#cert13-desc').fill('Descripción ficticia para la presentación, sin datos reales.');await page.locator('#cert13-sector').selectOption('Otro');
 await page.locator('#cert13-next').click();await expect(page.locator('[data-cert13-panel="1"]')).toBeVisible();
 await page.locator('#cert13-next').click();await expect(page.locator('#cert13-validation')).toContainText('documentos ficticios');
 await page.locator('[name="obs19-doc-mode"][value="unificado"]').check();
 for(const tipo of ['unificado','registro','identidad'])await page.locator(`[data-obs19-doc="${tipo}"]`).setInputFiles({name:'FICTICIO_60_'+tipo+'.pdf',mimeType:'application/pdf',buffer:Buffer.from('SOLO CONTENIDO FICTICIO PARA DEMOSTRACIÓN')});
 await page.locator('#cert13-next').click();await expect(page.locator('[data-cert13-panel="2"]')).toBeVisible();
 await page.locator('#cert14-import-geojson').setInputFiles({name:'punto-ficticio.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify({type:'Point',coordinates:[-70,-4]}))});
 await expect(page.locator('#cert13-map-feedback')).toContainText('GeoJSON importado');
 await page.locator('#cert13-next').click();await expect(page.locator('[data-cert13-panel="3"]')).toBeVisible();await expect(page.locator('[data-cert13-panel="3"]')).toContainText('No se ha ejecutado un análisis espacial');
 await page.locator('#cert13-next').click();await expect(page.locator('[data-cert13-panel="4"]')).toBeVisible();await expect(page.locator('#cert13-summary')).toContainText('PROYECTO_FICTICIO_60');await expect(page.locator('#cert13-summary')).toContainText('No realizada');
 const pending=page.waitForEvent('download');await page.locator('#cert13-export').click();const download=await pending;const text=await fs.readFile(await download.path(),'utf8');expect(text).toContain('PROYECTO_FICTICIO_60');expect(text).toMatch(/NO OFICIAL/);
 for(const id of ['cert16-summary-send','cert16-summary-admin','obs16-flow','obs17-app','obs9-admin-panel','admin-entry'])await expect(page.locator('#'+id)).toBeHidden();
 await expect(page.locator('.obs16-complete-card')).toHaveAttribute('inert','');await expect(page.locator('#obs16-flow')).toHaveAttribute('inert','');
 expect(await stored()).toEqual(before);expect(requests.filter(r=>!['GET','HEAD'].includes(r.method))).toEqual([]);expect(JSON.stringify(requests)).not.toMatch(/PROYECTO_FICTICIO_60|FICTICIO_60_/);expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
