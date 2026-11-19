const {test,expect}=require('@playwright/test');
const {abrirCapa}=require('./helpers/geovisor.cjs');
const {abrirFicha,sinConteo}=require('./helpers/fichas.cjs');
const catalog=require('../datos/tanda_4_29/catalogo_entrega.json');
const r19=require('../datos/rondas_46/determinante_19.json');
const internal=/(?:#[0-9]+|\b(?:FID|OBJECTID|MakeValid|PMTiles|teselas)\b|área algebraica|(?:datos|assets)\/|\b[A-Z][A-Za-z]+_[A-Za-z_]+|\btanda \d)/i;
test.beforeEach(async({page})=>{
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?r.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):r.continue();return r.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}})});
});
async function loaded(page){
 await page.goto('/#geovisor');await expect(page.locator('[data-tanda6-layer]')).toHaveCount(2);await expect(page.locator('[data-tanda5-layer]')).toHaveCount(2);await expect(page.locator('[data-tanda4-layer]')).toHaveCount(3);await expect(page.locator('[data-tanda3-layer]')).toHaveCount(4);await expect(page.locator('[data-pmtiles-layer] [role="switch"]')).toBeEnabled();
 await page.locator('#obs19-thematic-tree details:not([data-ficha-tecnica])').evaluateAll(es=>es.forEach(e=>e.open=true));
}
for(const width of [1280,390])test('textos ciudadanos: fichas cerradas, sin referencias internas y sin descargas a '+width,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 const requests=[];page.on('request',r=>requests.push(r.url()));await loaded(page);
 const cards=page.locator('#obs19-thematic-tree .obs32-layer-card');expect(await cards.count()).toBeGreaterThan(30);
 for(const c of await cards.all()){
  const sheet=c.locator(':scope > [data-ficha-tecnica]');await expect(sheet).toHaveCount(1);expect(await sheet.getAttribute('open')).toBeNull();
  const prose=await c.innerText();expect(prose).not.toMatch(internal);expect(prose).toContain('Fuente:');expect(prose).toContain('Año:');
 }
 const view=page.locator('#view-geovisor');expect(await view.innerText()).not.toMatch(internal);
 await expect(view).toContainText('Capas del Observatorio');expect(await view.innerText()).not.toContain('Capas locales de prueba');
 expect(requests.filter(u=>u.endsWith('.geojson')||u.endsWith('.pmtiles')||u.endsWith('/protomaps-leaflet.js'))).toEqual([]);
 const c=page.locator('[data-tanda4-layer="humedales"]'),pre=c.locator('.obs53-metadata');await expect(pre).not.toBeVisible();
 const f=await abrirFicha(c);await expect(pre).toBeVisible();await expect(f).toContainText(catalog.find(c=>c.id_capa==='humedales').restricciones);
 const saved=JSON.parse(await pre.textContent()),original=catalog.find(c=>c.id_capa==='humedales');for(const [k,v]of Object.entries(original))expect(saved[k]).toEqual(v);
 await f.locator(':scope > summary').press('Enter');await expect(pre).not.toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 if(width===390){await c.scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('fichas-celular.png')})}
});
for(const width of [1280,390])test('textos ciudadanos: consulta, estadísticas y ficha de rondas a '+width,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});await loaded(page);
 const c=page.locator('[data-rondas-layer]');await c.getByRole('switch').click();await expect(c.getByRole('switch')).toHaveAttribute('aria-busy','false');await sinConteo(page);
 const detail=page.locator('#obs19-stat-detail');expect(await detail.innerText()).not.toMatch(internal);
 await page.evaluate(p=>{const m=window.obs19Api.getMap();m.setView([p.lat,p.lng],16,{animate:false});m.fire('click',{latlng:L.latLng(p.lat,p.lng)})},r19.punto_prueba);
 const pop=page.locator('[data-rondas-consulta]');await expect(pop).toBeVisible();expect(await pop.innerText()).not.toMatch(internal);
 const f=await abrirFicha(pop);await expect(f).toContainText('Determinante 19');await expect(f).toContainText('Resolución 957 de 2018');await expect(f).toContainText('#44');
 await expect.poll(()=>pop.evaluate(el=>{const p=el.closest('.leaflet-popup').getBoundingClientRect(),m=document.querySelector('#visor-map').getBoundingClientRect();return p.left>=m.left-1&&p.right<=m.right+1&&p.top>=m.top-1&&p.bottom<=m.bottom+1})).toBe(true);
});
test('textos ciudadanos: las fichas muestran contenido no confiable como texto',async({page})=>{
 const data=structuredClone(catalog);data[0].restricciones='<img src=x onerror="window.xss53=1"> #999 origen_tecnico';
 await page.route('**/tanda_4_29/catalogo_entrega.json',r=>r.fulfill({json:data}));await loaded(page);
 const c=page.locator('[data-tanda4-layer="reserva_forestal_ley_2da"]');expect(await c.innerText()).not.toContain('origen_tecnico');const f=await abrirFicha(c);await expect(f).toContainText(data[0].restricciones);await expect(f.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.xss53)).toBeUndefined();
});
