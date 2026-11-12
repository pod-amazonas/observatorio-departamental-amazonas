const {test,expect}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {abrirCapa}=require('./helpers/geovisor.cjs');
const delivery=require('../datos/rondas_43/entrega.json'),control=require('../datos/rondas_43/control_origen.json'),catalog=require('../catalogo_determinantes_para_geovisor.json');
const root=path.resolve(__dirname,'..'),cards=catalog.grupos.flatMap(g=>g.capas),rows=delivery.capas;
const card=(p,id)=>p.locator(`[data-determinant-layer="${id}"]`);
test.beforeEach(async({page})=>{await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):route.continue();return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}})});});
test('rondas: doce fuentes cotejadas, cuatro correcciones 0/0 y 19 pendiente',()=>{
 expect(rows.map(r=>r.objectid)).toEqual(Array.from({length:12},(_,i)=>i+20));expect(delivery.pendientes).toEqual([19]);
 expect(control.registros.filter(r=>!r.valida_geos).map(r=>r.fid)).toEqual([6,7,8,9]);
 for(const r of control.reparaciones){expect(r.valida_despues).toBe(true);expect(r.desplazamiento_max_vertices_m).toBe(0);expect(r.diferencia_area_numerador).toBe('0');expect(r.vertices_unicos_antes).toBe(r.vertices_unicos_despues);expect(r.vertices_originales_ausentes).toBe(0)}
 expect(control.reparaciones.map(r=>r.despues.tipos['2']||0)).toEqual([0,10,4,6]);
 for(const r of rows){const c=cards.find(c=>c.objectid===r.objectid),match=control.correspondencias.find(c=>c.objectid===r.objectid);expect(match.sha256_wkb_determinante).toBe(r.sha256_origen);expect(r.sha256_nativa_gpkg_releida).toBe(r.sha256_geometria_usada);expect(c.estado).toBe('aprobada_disponible_teselas');expect(c.norma).toBe('Resolución 957 de 2018')}
 expect(cards.find(c=>c.objectid===19).archivoTeselas).toBeUndefined();expect(catalog.pendientes).toBe(1);
 const result=spawnSync('python3',['scripts/preparar_rondas43.py','--comprobar'],{cwd:root,encoding:'utf8'});expect(result.status,result.stderr||result.stdout||result.error?.message).toBe(0);
 const native=fs.readFileSync(path.join(root,'assets/js/drenaje-pmtiles40.js'),'utf8'),v19=fs.readFileSync(path.join(root,'v19.js'),'utf8');expect((native.match(/new protomapsL\.PmtilesSource/g)||[]).length).toBe(1);expect(v19).not.toContain('new protomapsL.PmtilesSource');expect(v19).toContain('window.obs40Tiles.create');
});
for(const width of [1280,390])test(`rondas: las doce se dibujan por rangos, teclado y leyenda a ${width}px`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 const requests=[],responses=[];page.on('request',r=>{if(r.url().endsWith('.pmtiles')||r.url().endsWith('/protomaps-leaflet.js'))requests.push(r.url())});page.on('response',r=>{if(r.url().includes('/rondas_43/teselas/'))responses.push(r)});
 await page.goto('/#geovisor');await expect(page.locator('[data-determinant-layer]')).toHaveCount(33);expect(requests).toEqual([]);
 const pending=card(page,19);await abrirCapa(pending);await expect(pending).toContainText('pendiente de verificación');await expect(pending.getByRole('switch')).toBeDisabled();
 for(const [i,row] of rows.entries()){
  const c=card(page,row.objectid);await abrirCapa(c);await expect(c).toContainText('Corpoamazonia · 2022');await expect(c).toContainText('Resolución 957 de 2018');await expect(c).toContainText('Leyenda');expect((await c.textContent()).toLowerCase()).not.toContain('pendiente');
  const sw=c.getByRole('switch');await sw.focus();await sw.press(i%2?'Enter':'Space');await expect(sw).toHaveAttribute('aria-checked','true');await expect(sw).toHaveAttribute('aria-busy','false');
  await expect.poll(()=>page.evaluate(oid=>{const e=window.obs19Api.getLayers().find(e=>e.idPilot===oid);if(!e)return 0;let n=0;for(const canvas of e.layer.getContainer().querySelectorAll('canvas')){const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=0;i<data.length;i+=4)if(Math.abs(data[i]-23)<5&&Math.abs(data[i+1]-108)<5&&Math.abs(data[i+2]-139)<5&&data[i+3]>15)n++}return n},row.objectid)).toBeGreaterThan(25);
  await expect(page.locator('#obs19-stat-overview')).toContainText('Sin conteo');await expect(page.locator('#obs19-stat-detail')).toContainText('Resolución 957 de 2018');
  await c.getByRole('slider').fill('50');expect(await page.evaluate(oid=>window.obs19Api.getLayers().find(e=>e.idPilot===oid).layer.options.opacity,row.objectid)).toBe(.5);
  await c.locator('[data-layer-zoom]').click();await sw.focus();await sw.press('Space');await expect(sw).toHaveAttribute('aria-checked','false');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);
 }
 expect(requests.filter(u=>u.endsWith('/protomaps-leaflet.js'))).toHaveLength(1);expect(new Set(requests.filter(u=>u.endsWith('.pmtiles'))).size).toBe(12);
 for(const r of responses){expect(r.status()).toBe(206);expect(r.request().headers().range).toMatch(/^bytes=\d+-\d+$/)}
 await expect(page.locator('#local-layer-list input[type="checkbox"]')).toHaveCount(0);
});
test('rondas: error de rango no enciende la capa y permite reintentar',async({page})=>{
 let fail=true;await page.route('**/rondas_43/teselas/determinante_20.pmtiles',r=>fail?r.fulfill({status:200,body:Buffer.alloc(127)}):r.continue());await page.goto('/#geovisor');const c=card(page,20);await abrirCapa(c);const sw=c.getByRole('switch');await sw.click();await expect(c.locator('[role="status"]')).toContainText('no sirve rangos HTTP 206');await expect(sw).toHaveAttribute('aria-checked','false');fail=false;await sw.click();await expect(sw).toHaveAttribute('aria-checked','true');await page.locator('#geojson-reset').click();await expect(sw).toHaveAttribute('aria-checked','false');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);
});
test('rondas: cancelación de cabecera no reactiva la capa al llegar',async({page})=>{
 let release,hits=0;const held=new Promise(r=>release=r);await page.route('**/rondas_43/teselas/determinante_20.pmtiles',async r=>{hits++;await held;try{await r.continue()}catch{}});
 try{await page.goto('/#geovisor');const c=card(page,20);await abrirCapa(c);const sw=c.getByRole('switch');await sw.click();await expect.poll(()=>hits).toBe(1);await sw.click();release();await page.waitForLoadState('networkidle');await expect(sw).toHaveAttribute('aria-checked','false');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0)}finally{release()}
});

test('rondas: prefijo de GitHub Pages y lector único compartido con drenaje',async({page})=>{let vendors=0;page.on('request',r=>{if(r.url().endsWith('/protomaps-leaflet.js'))vendors++});await page.route('**/observatorio-departamental-amazonas/**',route=>{const u=new URL(route.request().url());u.pathname=u.pathname.replace('/observatorio-departamental-amazonas','');return route.continue({url:u.href})});await page.goto('/observatorio-departamental-amazonas/#geovisor');const c=card(page,25);await abrirCapa(c);await c.getByRole('switch').click();await expect(c.getByRole('switch')).toHaveAttribute('aria-checked','true');await expect(c.getByRole('switch')).toHaveAttribute('aria-busy','false');const d=page.locator('[data-pmtiles-layer]');await abrirCapa(d);await expect(d.getByRole('switch')).toBeEnabled();await d.getByRole('switch').click();await expect(d.getByRole('switch')).toHaveAttribute('aria-busy','false');await expect(d.getByRole('switch')).toHaveAttribute('aria-checked','true');expect(vendors).toBe(1);expect(await page.evaluate(()=>window.obs19Api.getLayers().filter(e=>e.vectorTiles).length)).toBe(2);await page.locator('#geojson-reset').click();await expect(c.getByRole('switch')).toHaveAttribute('aria-checked','false');await expect(d.getByRole('switch')).toHaveAttribute('aria-checked','false')});
test('rondas: métricas exactas preservan líneas y detectan un cambio submilimétrico',()=>{const r=spawnSync('python3',['-m','unittest','discover','-s','tests','-p','test_rondas43_integridad.py'],{cwd:root,encoding:'utf8'});expect(r.status,r.stderr||r.stdout||r.error?.message).toBe(0)});
