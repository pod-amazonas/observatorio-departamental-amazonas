const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const matrix=JSON.parse(html.match(/const DATA=(\[.*?\]);/)[1]);
test.beforeEach(async({page})=>{await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?r.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):r.continue();return r.fulfill({json:[]})})});
for(const width of [1280,390])test('Certificados informa y ofrece solo el formulario de demostración, sin roles, a '+width,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url())});
 await page.goto('/#inicio');await page.locator('.portada-modulo[data-route="certificados"]').click();
 const info=page.locator('#certificados-informacion'),archive=page.locator('#certificados-legacy');
 await expect(info).toBeVisible();await expect(info.getByRole('heading',{name:'¿Qué es?',exact:true})).toBeVisible();await expect(info.getByRole('heading',{name:'Requisitos e información para tu consulta',exact:true})).toBeVisible();await expect(info.getByRole('heading',{name:'Normativa de referencia',exact:true})).toBeVisible();
 await expect(info.getByRole('status')).toHaveText('La solicitud en línea estará disponible próximamente');
 await expect(info.getByRole('link',{name:'pod@amazonas.gov.co',exact:true})).toHaveAttribute('href','mailto:pod@amazonas.gov.co');
 expect(await info.locator('input,select,textarea,button,form').count()).toBe(0);await expect(archive).toBeVisible();expect(await archive.evaluate(e=>e.inert)).toBe(false);
 await expect(archive.getByRole('note').first()).toHaveText('Demostración: muestra cómo funcionará la solicitud en línea. No radica solicitudes, no envía datos y no genera certificados.');
 for(const id of ['cert13-name','cert13-next'])await expect(page.locator('#'+id)).toBeVisible();
 for(const id of ['cert16-summary-send','obs16-flow','obs16-submit']){await expect(page.locator('#'+id)).toHaveCount(1);await expect(page.locator('#'+id)).toBeHidden()}
 await expect(page.locator('#obs16-flow')).toHaveAttribute('inert','');await expect(page.locator('.obs16-complete-card')).toHaveAttribute('inert','');
 expect(await page.evaluate(()=>typeof window.obs16GetDraft)).toBe('function');
 const nav=page.locator('#admin-entry,a[href="#admin"],[data-route="admin"],[data-obs16-role="pod"]');for(const e of await nav.all())await expect(e).toBeHidden();
 expect(await info.innerText()).not.toMatch(/fictici|radicaci[oó]n local|prefijo LOCAL|referencia otra|Este versión|simulador/i);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await info.getByRole('link',{name:'pod@amazonas.gov.co',exact:true}).focus();await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement.closest('#certificados-legacy'))).toBe(true);expect(await page.evaluate(()=>!!document.activeElement.closest('[inert]'))).toBe(false);
 await page.goto('/#admin');await expect(page.locator('#obs17-app')).toBeHidden();expect(await page.locator('#view-admin input:visible,#view-admin select:visible,#view-admin textarea:visible').count()).toBe(0);expect(writes).toEqual([]);
});
test('mensajes de búsqueda redactados completos y sin sustituciones mecánicas',async({page})=>{
 await page.goto('/#documentos-pod');await page.locator('#pod-search').fill('zzzz_sin_resultados_ficticio_59');await expect(page.locator('#pod-doc-list')).toContainText('Intenta con otra palabra o selecciona una carpeta diferente.');
 await page.goto('/#biblioteca');await page.locator('#library-search').fill('zzzz_sin_resultados_ficticio_59');await expect(page.locator('#library-doc-list')).toContainText('Intenta con otro filtro');
 for(const route of ['inicio','avances-pod','certificados','biblioteca','documentos-pod','admin']){await page.goto('/#'+route);expect(await page.locator('#view-'+route).innerText()).not.toMatch(/Este versión|esta referencia no publica|referencia otra palabra|referencia otro filtro|gestión local local|aprobado en referencia|oportunidades de referencia/i)}
});
test('un registro ficticio anterior se identifica como cálculo no oficial',async({page})=>{
 const id=matrix[0].metas[0].id;
 await page.addInitScript(({id})=>localStorage.setItem('observatorio_amazonas_v11_seguimiento_demo',JSON.stringify({version:3,progreso:{[id]:{valor:40,modo:'porcentaje',estado:'Aprobado',evidencias:[{estado:'Aprobada',nombre:'Soporte ficticio',url:'https://example.invalid/soporte-ficticio.pdf'}]}},auditoria:[]})),{id});
 await page.goto('/#avances-pod');await expect(page.locator('#obs9-ind-detail')).toContainText('Cálculo de este navegador (no oficial):');expect(await page.locator('#obs9-public-panel').innerText()).not.toMatch(/DEMO|aprobado en prueba|aprobado en referencia|simulación anterior/i);await expect(page.locator('#obs9-admin-panel')).toBeHidden();
});
