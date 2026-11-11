const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const {abrirCapa}=require('./helpers/geovisor.cjs');
const meta=require('../datos/teselas_40/catalogo.json');
const root=path.resolve(__dirname,'..'),file=path.join(root,'datos/teselas_40/drenaje_doble.pmtiles');
const cardOf=p=>p.locator('[data-pmtiles-layer]');
async function ready(page){await page.goto('/#geovisor');const card=cardOf(page);await abrirCapa(card);await expect(card.getByRole('switch')).toBeEnabled();return card}
async function on(page,card){await card.getByRole('switch').click();await expect(card.getByRole('switch')).toHaveAttribute('aria-busy','false');await expect(card.getByRole('switch')).toHaveAttribute('aria-checked','true');await expect(card.locator('#estado-pmtiles40')).toContainText('Drenaje visible')}
test('PMTiles: archivo íntegro, zooms, exclusiones y campos públicos',()=>{
 const b=fs.readFileSync(file);expect(b.subarray(0,8)).toEqual(Buffer.from('PMTiles\x03'));expect(b.length).toBe(meta.bytes);expect(createHash('sha256').update(b).digest('hex')).toBe(meta.sha256);
 expect(meta.entidades).toBe(90);expect(meta.excluidos_invalidos).toEqual([484,2165]);expect(new Set(meta.ids_seleccionados).size).toBe(90);expect(meta.ids_seleccionados.some(x=>[484,2165].includes(x))).toBe(false);
 expect([b[100],b[101]]).toEqual([5,12]);expect(meta.simplification_max_zoom).toBe(0);expect(meta.max_size_configurado).toBe(100000000);expect(meta.residuo_inverso_m).toBeLessThan(.000001);
 const audit=require('../datos/teselas_40/auditoria_teselas.json');expect(audit.sha256_pmtiles).toBe(meta.sha256);expect(audit.por_zoom.at(-1).entidades_representadas).toBe(90);expect(audit.tesela_comprimida_max_bytes).toBeLessThan(meta.max_size_configurado);
 const r=spawnSync('python3',['scripts/preparar_pmtiles40.py','--comprobar'],{cwd:root,encoding:'utf8'});expect(r.status,r.stderr||r.stdout||r.error?.message).toBe(0);
 for(const dir of ['datos/teselas_40','vendor/protomaps-leaflet-5.1.0'])for(const line of fs.readFileSync(path.join(root,dir,'SHA256SUMS'),'utf8').trim().split('\n')){const [hash,name]=line.split('  ');expect(createHash('sha256').update(fs.readFileSync(path.join(root,dir,name))).digest('hex')).toBe(hash)}
});
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):route.continue();
  return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}});
 });
});
for(const width of [1280,390])test(`PMTiles: rango real, dibujo, teclado, transparencia y limpieza a ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 const req=[],responses=[];page.on('request',r=>{if(r.url().endsWith('.pmtiles')||r.url().endsWith('/protomaps-leaflet.js'))req.push(r)});page.on('response',r=>{if(r.url().endsWith('.pmtiles'))responses.push(r)});
 const card=await ready(page);expect(req).toHaveLength(0);await expect(card).toContainText('IGAC 2022');await expect(card).toContainText('Río Caquetá');await expect(card).toContainText('Río Putumayo');await expect(card).toContainText('Leyenda');
 const sw=card.getByRole('switch');await sw.focus();await sw.press('Space');await expect(sw).toHaveAttribute('aria-busy','false');await expect(sw).toHaveAttribute('aria-checked','true');
 await expect.poll(()=>page.evaluate(()=>{const e=window.obs19Api.getLayers().find(e=>e.vectorTiles);if(!e)return 0;let n=0;for(const c of e.layer.getContainer().querySelectorAll('canvas')){const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-21)<4&&Math.abs(a[i+1]-111)<4&&Math.abs(a[i+2]-153)<4&&a[i+3]>15)n++}return n})).toBeGreaterThan(50);
 await expect(page.locator('#obs19-stat-overview')).toContainText('Sin conteo');await expect(page.locator('#v7-dynamic-legend')).toContainText('Drenaje doble');
 let bytes=0;for(const response of responses){expect(response.status()).toBe(206);expect(response.request().headers().range).toMatch(/^bytes=\d+-\d+$/);bytes+=(await response.body()).length}expect(bytes).toBeGreaterThan(0);expect(bytes).toBeLessThan(meta.bytes/2);
 await card.getByRole('slider').fill('50');expect(await page.evaluate(()=>window.obs19Api.getLayers().find(e=>e.vectorTiles).layer.options.opacity)).toBe(.5);
 await card.getByRole('button',{name:'Centrar Amazonas',exact:false}).click();await sw.click();await expect(sw).toHaveAttribute('aria-checked','false');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);
 await on(page,card);await page.locator('#geojson-reset').click();await expect(sw).toHaveAttribute('aria-checked','false');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);await expect(page.locator('#local-layer-list input[type="checkbox"]')).toHaveCount(0);
});
test('PMTiles: rechaza HTTP 200 sin continuar la descarga ni encender la capa',async({page})=>{
 let hits=0;await page.route('**/drenaje_doble.pmtiles',route=>{hits++;return route.fulfill({status:200,contentType:'application/octet-stream',body:Buffer.alloc(127)})});
 const card=await ready(page);await card.getByRole('switch').click();await expect(card.locator('#estado-pmtiles40')).toContainText('no sirve rangos HTTP 206');await expect(card.getByRole('switch')).toHaveAttribute('aria-checked','false');expect(hits).toBe(1);expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);
});
test('PMTiles: error en una tesela no se presenta como carga vacía exitosa y permite reintento',async({page})=>{
 let hits=0,fail=true;await page.route('**/drenaje_doble.pmtiles',route=>{hits++;return fail&&hits>1?route.fulfill({status:503,body:'No disponible'}):route.continue()});
 const card=await ready(page);await card.getByRole('switch').click();await expect(card.locator('#estado-pmtiles40')).toContainText('No se pudo cargar');await expect(card.getByRole('switch')).toHaveAttribute('aria-checked','false');expect(hits).toBeGreaterThan(1);
 fail=false;await on(page,card);
});
test('PMTiles: cancelar una cabecera pendiente no reactiva la capa al llegar',async({page})=>{
 let release,hits=0;const held=new Promise(resolve=>release=resolve);
 await page.route('**/drenaje_doble.pmtiles',async route=>{hits++;await held;try{await route.continue()}catch{}});
 try{const card=await ready(page),sw=card.getByRole('switch');await sw.click();await expect.poll(()=>hits).toBe(1);await expect(sw).toHaveAttribute('aria-busy','true');await sw.click();release();await expect(sw).toHaveAttribute('aria-checked','false');await expect(sw).toHaveAttribute('aria-busy','false');await page.waitForLoadState('networkidle');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0)}finally{release()}
});
test('PMTiles: funciona con el prefijo del proyecto de Pages, sin CDN',async({page})=>{
 await page.route('**/observatorio-departamental-amazonas/**',route=>{const url=new URL(route.request().url());url.pathname=url.pathname.replace('/observatorio-departamental-amazonas','');return route.continue({url:url.href})});
 await page.goto('/observatorio-departamental-amazonas/#geovisor');const card=cardOf(page);await abrirCapa(card);await expect(card.getByRole('switch')).toBeEnabled();await on(page,card);
});
