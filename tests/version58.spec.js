const {test,expect}=require('@playwright/test');
const {abrirCapa}=require('./helpers/geovisor.cjs');
const {errorDeCapa}=require('./helpers/fichas.cjs');
const meta=require('../datos/teselas_40/catalogo.json');
const obsolete=/\b(?:pruebas?|prototipos?|demostraci[oó]n|simulaci[oó]n|simulador|simulad[oa]s?|demo)\b/i;
test.beforeEach(async({page})=>{await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?r.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):r.continue();return r.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}})})});
for(const width of [1280,390])test('versión inicial: todas las vistas y mapa amplio a '+width,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 for(const route of ['inicio','geovisor','geoportal','avances-pod','certificados','biblioteca','documentos-pod','secretaria','contacto','admin']){
  await page.goto('/#'+route);await expect(page.locator('#view-'+route)).toBeVisible();
  expect(await page.locator('#view-'+route).innerText()).not.toMatch(obsolete);
  expect(await page.title()).not.toMatch(obsolete);
 }
 await page.goto('/#geovisor');await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);
 await page.screenshot({path:test.info().outputPath('geovisor-'+width+'.png')});
 const map=page.locator('#visor-map'),size=await map.boundingBox();expect(size.height).toBeGreaterThan((width===390?844:720)*.5);expect(size.width).toBeGreaterThan(width*.65);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 const toggle=page.locator('#geo-layers-toggle58');await toggle.click();await expect(page.locator('.geo-sidebar')).toBeHidden();await expect(toggle).toHaveAttribute('aria-expanded','false');
 await toggle.press('Enter');await expect(page.locator('.geo-sidebar')).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect.poll(()=>page.evaluate(()=>{const m=window.obs19Api.getMap(),c=m.getContainer();return Math.abs(m.getSize().x-c.clientWidth)+Math.abs(m.getSize().y-c.clientHeight)})).toBe(0);
 await page.locator('.geo-tools58 > summary').click();await page.locator('#measure-mode').click();await expect(page.locator('#measure-mode')).toHaveAttribute('aria-pressed','true');await page.locator('#map-inspect').click();await expect(page.locator('#map-inspect')).toHaveAttribute('aria-pressed','true');
 await page.goto('/#certificados');await expect(page.locator('#cert16-summary-send')).toBeDisabled();
});
for(const width of [1280,390])for(const fallback of [false,true])test('pantalla completa: teclado, salida y restauración '+(fallback?'sin API':'nativa')+' a '+width,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.goto('/#geovisor');const root=page.locator('.geo-public58'),button=page.locator('#geo-fullscreen58');
 if(fallback)await root.evaluate(e=>e.requestFullscreen=undefined);
 await button.focus();await button.press('Enter');await expect(button).toHaveAttribute('aria-pressed','true');await expect(root).toHaveClass(/is-expanded58/);
 if(!fallback)await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.classList.contains('geo-public58'))).toBe(true);
 expect(await page.locator('.site-header').evaluate(e=>e.inert)).toBe(true);
 const box=await root.boundingBox();expect(box.x).toBe(0);expect(box.y).toBe(0);expect(box.height).toBeGreaterThan(700);
 await page.locator('#geo-stats58 > summary').focus();await page.keyboard.press('Tab');await expect(page.locator('#geo-layers-toggle58')).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(page.locator('#geo-stats58 > summary')).toBeFocused();
 await button.focus();await page.keyboard.press('Escape');await expect(button).toHaveAttribute('aria-pressed','false');await expect(button).toBeFocused();expect(await page.locator('.site-header').evaluate(e=>e.inert)).toBe(false);await expect(page.locator('.geo-sidebar')).toBeVisible();
 await button.click();await page.evaluate(()=>location.hash='inicio');await expect(root).not.toHaveClass(/is-expanded58/);expect(await page.locator('.site-header').evaluate(e=>e.inert)).toBe(false);
 if(fallback){await root.evaluate(e=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:e});document.dispatchEvent(new Event('fullscreenchange'))});await expect(root).not.toHaveClass(/is-expanded58/);expect(await page.locator('.site-header').evaluate(e=>e.inert)).toBe(false)}
});
test('PMTiles: cada rango usa el SHA del catálogo y cambia al actualizarlo',async({page})=>{
 const hashes=[meta.sha256,'1'.repeat(64)],requests=[];let current=hashes[0];
 await page.route('**/teselas_40/catalogo.json',r=>r.fulfill({json:{...meta,sha256:current}}));
 await page.route('**/drenaje_doble.pmtiles*',r=>{const u=new URL(r.request().url());requests.push({v:u.searchParams.get('v'),range:r.request().headers().range});return u.searchParams.get('v')===current?r.continue():r.fulfill({status:503,body:'Copia anterior'})});
 for(const hash of hashes){current=hash;await page.goto('/#geovisor');await page.reload();const c=page.locator('[data-pmtiles-layer]');await abrirCapa(c);await c.getByRole('switch').click();await expect(c.getByRole('switch')).toHaveAttribute('aria-checked','true');await expect(c.getByRole('switch')).toHaveAttribute('aria-busy','false')}
 expect(new Set(requests.map(r=>r.v))).toEqual(new Set(hashes));for(const r of requests)expect(r.range).toMatch(/^bytes=\d+-\d+$/);
});
test('PMTiles: no descarga sin una versión SHA-256 válida',async({page})=>{
 const requests=[];page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('.pmtiles'))requests.push(r.url())});
 await page.route('**/teselas_40/catalogo.json',r=>r.fulfill({json:{...meta,sha256:'sin-version'}}));await page.goto('/#geovisor');const c=page.locator('[data-pmtiles-layer]');await abrirCapa(c);await c.getByRole('switch').click();await errorDeCapa(c,'Falta la versión SHA-256');expect(requests).toEqual([]);
});
