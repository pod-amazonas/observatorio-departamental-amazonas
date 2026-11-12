const {test,expect}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {abrirCapa}=require('./helpers/geovisor.cjs');
const delivery=require('../datos/rondas_43/entrega.json'),control=require('../datos/rondas_43/control_origen.json'),catalog=require('../catalogo_determinantes_para_geovisor.json'),unified=require('../datos/rondas_46/entrega.json');
const root=path.resolve(__dirname,'..'),cards=catalog.grupos.flatMap(g=>g.capas),rows=delivery.capas;
const card=p=>p.locator('[data-rondas-layer]');
test.beforeEach(async({page})=>{await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):route.continue();return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}})});});
test('rondas: doce fuentes cotejadas, cuatro correcciones 0/0 y 19 pendiente',()=>{
 expect(rows.map(r=>r.objectid)).toEqual(Array.from({length:12},(_,i)=>i+20));expect(delivery.pendientes).toEqual([19]);
 expect(control.registros.filter(r=>!r.valida_geos).map(r=>r.fid)).toEqual([6,7,8,9]);
 for(const r of control.reparaciones){expect(r.valida_despues).toBe(true);expect(r.desplazamiento_max_vertices_m).toBe(0);expect(r.diferencia_area_numerador).toBe('0');expect(r.vertices_unicos_antes).toBe(r.vertices_unicos_despues);expect(r.vertices_originales_ausentes).toBe(0)}
 expect(control.reparaciones.map(r=>r.despues.tipos['2']||0)).toEqual([0,10,4,6]);
 for(const r of rows){const c=cards.find(c=>c.objectid===r.objectid),match=control.correspondencias.find(c=>c.objectid===r.objectid);expect(match.sha256_wkb_determinante).toBe(r.sha256_origen);expect(r.sha256_nativa_gpkg_releida).toBe(r.sha256_geometria_usada);expect(c.estado).toBe('aprobada_disponible_teselas');expect(c.norma).toBe('Resolución 957 de 2018');expect(c.archivoTeselas).toBe(unified.archivo)}
 expect(cards.find(c=>c.objectid===19).archivoTeselas).toBeUndefined();expect(catalog.pendientes).toBe(1);expect(catalog.cantidadTeselas).toBe(1);
 const result=spawnSync('python3',['scripts/preparar_rondas43.py','--comprobar'],{cwd:root,encoding:'utf8'});expect(result.status,result.stderr||result.stdout||result.error?.message).toBe(0);
 const proof=require('../datos/rondas_46/integridad.json');expect(proof.antes).toHaveLength(96);expect(proof.antes).toEqual(proof.despues);
 const native=fs.readFileSync(path.join(root,'assets/js/drenaje-pmtiles40.js'),'utf8'),v19=fs.readFileSync(path.join(root,'v19.js'),'utf8');expect((native.match(/new protomapsL\.PmtilesSource/g)||[]).length).toBe(1);expect(v19).not.toContain('new protomapsL.PmtilesSource');expect(v19).toContain('window.obs40Tiles.create');
 expect(fs.existsSync(path.join(root,'datos/rondas_43/teselas/determinante_20.pmtiles'))).toBe(false);
});
async function dibujada(page){await expect.poll(()=>page.evaluate(()=>{const e=window.obs19Api.getLayers().find(e=>e.idPilot===46);if(!e)return 0;let n=0;for(const c of e.layer.getContainer().querySelectorAll('canvas')){const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<a.length;i+=4)if(a[i+3]>15&&a[i+2]>a[i+1]&&a[i+1]>a[i])n++}return n})).toBeGreaterThan(25);expect(await page.evaluate(()=>window.obs19Api.getLayers().find(e=>e.idPilot===46).color)).toBe('#176c8b')}
async function consultar(page,p,touch=false){
 await page.evaluate(p=>window.obs19Api.getMap().setView([p.lat,p.lng],16,{animate:false}),p);
 await page.locator('#visor-map').scrollIntoViewIfNeeded();
 const pos=await page.evaluate(p=>{const map=window.obs19Api.getMap(),q=map.latLngToContainerPoint([p.lat,p.lng]),r=map.getContainer().getBoundingClientRect();return {x:r.left+q.x,y:r.top+q.y}},p);
 if(touch)await page.touchscreen.tap(pos.x,pos.y);else await page.mouse.click(pos.x,pos.y);
}
for(const width of [1280,390])test.describe('rondas unificadas '+width,()=>{
 test.use({hasTouch:width===390});
 test(`rondas: una capa, doce determinantes consultables y controles a ${width}px`,async({page})=>{
  test.setTimeout(120000);await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
  const requests=[],responses=[];page.on('request',r=>{if(r.url().endsWith('.pmtiles')||r.url().endsWith('/protomaps-leaflet.js'))requests.push(r.url())});page.on('response',r=>{if(r.url().includes('/rondas_46/'))responses.push(r)});
  await page.goto('/#geovisor');await expect(page.locator('[data-determinant-layer]')).toHaveCount(33);expect(requests).toEqual([]);
  const pending=page.locator('[data-determinant-layer="19"]');await abrirCapa(pending);await expect(pending).toContainText('pendiente de verificación');await expect(pending.getByRole('switch')).toBeDisabled();
  const c=card(page);await expect(c).toHaveCount(1);await abrirCapa(c);await expect(c).toContainText('Corpoamazonia · 2022');await expect(c).toContainText('Resolución 957 de 2018');await expect(c).toContainText('Ronda 19 pendiente');
  for(const row of rows){const record=c.locator('[data-determinant-layer="'+row.objectid+'"]');await expect(record).toContainText('Determinante '+row.objectid);await expect(record).toContainText(row.norma);await expect(record.getByRole('switch')).toHaveCount(0)}
  await expect(c.getByRole('switch')).toHaveCount(1);const sw=c.getByRole('switch');await sw.focus();await sw.press('Space');await expect(sw).toHaveAttribute('aria-checked','true');await expect(sw).toHaveAttribute('aria-busy','false');await dibujada(page);
  expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(1);
  await expect(page.locator('#view-geoportal .obs19-geo-tip')).toContainText('32 de 33 registros disponibles en 21 capas');await expect(page.locator('#view-geoportal .obs19-geo-tip')).toContainText('1 pendiente: ronda 19');
  await expect(page.locator('#obs19-stat-overview')).toContainText('Sin conteo');await expect(page.locator('#obs19-stat-detail')).toContainText('Resolución 957 de 2018');
  await c.getByRole('slider').fill('50');expect(await page.evaluate(()=>window.obs19Api.getLayers().find(e=>e.idPilot===46).layer.options.opacity)).toBe(.5);
  const points=require('./fixtures/rondas46_puntos.json');
  for(const p of points.puntos){await consultar(page,p,width===390);const popup=page.locator('[data-rondas-consulta]');await expect(popup).toHaveCount(1);await expect(popup).toBeVisible();const texts=await popup.locator('p').allTextContents();expect(texts.filter(t=>t.startsWith('Determinante ')).map(t=>Number(t.match(/^Determinante (\d+)/)[1]))).toEqual(p.esperadas);await expect(popup).toContainText('Resolución 957 de 2018')}
  expect(points.hueco).toBeTruthy();{await consultar(page,points.hueco,width===390);await expect(page.locator('[data-rondas-consulta]')).toHaveCount(0)}
  const p=points.puntos[0];await page.evaluate(p=>window.obs19Api.getMap().setView([p.lat,p.lng],16,{animate:false}),p);await c.getByRole('button',{name:'Consultar centro del mapa',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('[data-rondas-consulta]')).toContainText('Determinante '+p.determinante);
  await c.locator('[data-layer-zoom]').click();await sw.focus();await sw.press('Enter');await expect(sw).toHaveAttribute('aria-checked','false');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);await expect(page.locator('[data-rondas-consulta]')).toHaveCount(0);
  expect(requests.filter(u=>u.endsWith('/protomaps-leaflet.js'))).toHaveLength(1);expect(new Set(requests.filter(u=>u.endsWith('.pmtiles'))).size).toBe(1);
  for(const r of responses){expect(r.status()).toBe(206);expect(r.request().headers().range).toMatch(/^bytes=\d+-\d+$/)}await expect(page.locator('#local-layer-list input[type="checkbox"]')).toHaveCount(0);
 });
});
test('rondas: error de rango no enciende la capa y permite reintentar',async({page})=>{
 let fail=true;await page.route('**/rondas_46/rondas.pmtiles',r=>fail?r.fulfill({status:200,body:Buffer.alloc(127)}):r.continue());await page.goto('/#geovisor');const c=card(page);await abrirCapa(c);const sw=c.getByRole('switch');await sw.click();await expect(c.locator('[role="status"]')).toContainText('no sirve rangos HTTP 206');await expect(sw).toHaveAttribute('aria-checked','false');fail=false;await sw.click();await expect(sw).toHaveAttribute('aria-checked','true');await page.locator('#geojson-reset').click();await expect(sw).toHaveAttribute('aria-checked','false');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);
});
test('rondas: cancelación de cabecera no reactiva la capa al llegar',async({page})=>{
 let release,hits=0;const held=new Promise(r=>release=r);await page.route('**/rondas_46/rondas.pmtiles',async r=>{hits++;await held;try{await r.continue()}catch{}});
 try{await page.goto('/#geovisor');const c=card(page);await abrirCapa(c);const sw=c.getByRole('switch');await sw.click();await expect.poll(()=>hits).toBe(1);await sw.click();release();await page.waitForLoadState('networkidle');await expect(sw).toHaveAttribute('aria-checked','false');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0)}finally{release()}
});
test('rondas: prefijo de GitHub Pages y lector único compartido con drenaje',async({page})=>{let vendors=0;page.on('request',r=>{if(r.url().endsWith('/protomaps-leaflet.js'))vendors++});await page.route('**/observatorio-departamental-amazonas/**',route=>{const u=new URL(route.request().url());u.pathname=u.pathname.replace('/observatorio-departamental-amazonas','');return route.continue({url:u.href})});await page.goto('/observatorio-departamental-amazonas/#geovisor');const c=card(page);await abrirCapa(c);await c.getByRole('switch').click();await expect(c.getByRole('switch')).toHaveAttribute('aria-checked','true');await expect(c.getByRole('switch')).toHaveAttribute('aria-busy','false');const d=page.locator('[data-pmtiles-layer]');await abrirCapa(d);await expect(d.getByRole('switch')).toBeEnabled();await d.getByRole('switch').click();await expect(d.getByRole('switch')).toHaveAttribute('aria-busy','false');await expect(d.getByRole('switch')).toHaveAttribute('aria-checked','true');expect(vendors).toBe(1);expect(await page.evaluate(()=>window.obs19Api.getLayers().filter(e=>e.vectorTiles).length)).toBe(2);await page.locator('#geojson-reset').click();await expect(c.getByRole('switch')).toHaveAttribute('aria-checked','false');await expect(d.getByRole('switch')).toHaveAttribute('aria-checked','false')});
test('rondas: unión exacta detecta cambios de comandos y colisiones de diccionario',()=>{const r=spawnSync('python3',['-m','unittest','discover','-s','tests','-p','test_unificar_rondas46.py'],{cwd:root,encoding:'utf8'});expect(r.status,r.stderr||r.stdout||r.error?.message).toBe(0)});
test('rondas: métricas exactas preservan líneas y detectan un cambio submilimétrico',()=>{const r=spawnSync('python3',['-m','unittest','discover','-s','tests','-p','test_rondas43_integridad.py'],{cwd:root,encoding:'utf8'});expect(r.status,r.stderr||r.stdout||r.error?.message).toBe(0)});
test('rondas: una sola plaza del límite de ocho capas',async({page})=>{
 test.setTimeout(90000);await page.goto('/#geovisor');const c=card(page);await abrirCapa(c);await c.getByRole('switch').click();await expect(c.getByRole('switch')).toHaveAttribute('aria-busy','false');
 for(const id of [1,2,3,4,5,6,18]){const native=page.locator('[data-determinant-layer="'+id+'"]');await abrirCapa(native);await native.getByRole('switch').click();await expect(native.getByRole('switch')).toHaveAttribute('aria-busy','false');await expect(native.getByRole('switch')).toHaveAttribute('aria-checked','true')}
 expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(8);const d=page.locator('[data-pmtiles-layer]');await abrirCapa(d);await d.getByRole('switch').click();await expect(d.locator('[role="status"]')).toContainText('máximo de 8 capas');await expect(d.getByRole('switch')).toHaveAttribute('aria-checked','false');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(8);
});
