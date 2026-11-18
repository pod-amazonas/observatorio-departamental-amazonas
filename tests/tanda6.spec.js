const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {abrirCapa}=require('./helpers/geovisor.cjs');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'datos/tanda_6_29');
const catalog=require('../datos/tanda_6_29/catalogo_entrega.json');
const card=(page,id)=>page.locator('[data-tanda6-layer="'+id+'"]');
test.beforeEach(async({page})=>{
 await page.route('**/*',r=>{const u=new URL(r.request().url());
  if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?r.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):r.continue();
  return r.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}});
 });
});
test('tanda 6: integridad, dos fuentes autorizadas y exclusión aun recalculando SHA-256',()=>{
 test.setTimeout(120000);
 const r=spawnSync('python3',['scripts/preparar_tanda6_29.py','--comprobar'],{cwd:root,encoding:'utf8',timeout:120000});
 expect(r.status,r.stderr||r.stdout||r.error?.message).toBe(0);
 const negative=spawnSync('python3',['-c',`
import sys,tempfile,shutil
from pathlib import Path
sys.path.insert(0,'scripts')
import preparar_tanda6_29 as m
with tempfile.TemporaryDirectory() as tmp:
 target=(Path(tmp)/'paquete').resolve();shutil.copytree(m.OUT,target);m.OUT=target
 (target/'teselas/distribucion_de_poblacion.pmtiles').write_bytes(b'no autorizado')
 m.manifest()
 try:m.check()
 except AssertionError as e:assert 'fuera del alcance' in str(e)
 else:raise SystemExit('Se admitió una fuente aplazada')
`],{cwd:root,encoding:'utf8',timeout:120000});
 expect(negative.status,negative.stderr||negative.error?.message).toBe(0);
 const control=require('../datos/tanda_6_29/control_geometrias.json');
 expect(control.fuente_sin_cambios).toBe(true);expect(control.reparaciones).toEqual([]);
 expect(catalog.map(c=>c.entidades)).toEqual([65165,1811]);
 for(const c of catalog){
  const row=control.capas.find(r=>r.id_capa===c.id_capa);
  expect(row.gpkg_wkb_identicas).toBe(true);expect(row.residuo_inversa_m).toBeLessThan(.000001);
  expect(c.campos_publicos).toEqual(['fid_origen',c.id_capa==='drenaje_sencillo'?'ESTADO_DRENAJE':'highway']);
  expect(crypto.createHash('sha256').update(fs.readFileSync(path.join(folder,c.ruta_relativa))).digest('hex')).toBe(c.sha256);
  expect(row.registros.every(r=>r.original===r.lineal||row.contenedores_curvos.includes(r.fid))).toBe(true);
 }
 expect(control.capas[0].curvas).toEqual([153715,154134,155345,155639,155701,392170]);
 expect(catalog[0].restricciones).toContain('No es una ruta navegable certificada');
 expect(catalog[1].licencia).toBe('ODbL 1.0');expect(catalog[1].restricciones).toContain('no garantiza transitabilidad');
 expect(require('../datos/tanda_6_29/pendientes.json').map(r=>r.origen)).toEqual(['Cobertura_Uso_Tierra_CLC','BIC_Declarados','Distribucion_de_Poblacion']);
});
async function painted(page,id){return page.evaluate(id=>{
 const e=window.obs19Api.getLayers().find(e=>e.idCitizen===id);if(!e)return 0;
 let count=0;for(const c of e.layer.getContainer().querySelectorAll('canvas')){
  const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  for(let i=3;i<pixels.length;i+=4)if(pixels[i]>15)count++;
 }return count;
},id)}
for(const width of [1280,390])test('tanda 6: líneas dibujadas, teclado, avisos y atribución independiente a '+width,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto('/#geovisor');
 await expect(page.locator('[data-tanda6-layer]')).toHaveCount(2);await page.waitForFunction(()=>window.obs19Api?.getMap?.());
 expect(requests.filter(u=>u.endsWith('.pmtiles')||u.endsWith('/protomaps-leaflet.js'))).toEqual([]);
 for(const row of catalog){
  const c=card(page,row.id_capa);await abrirCapa(c);
  await expect(c).toContainText(String(row.anio_declarado_encargo));await expect(c).toContainText(row.restricciones);
  await expect(c.getByRole('link',{name:row.licencia,exact:true})).toHaveAttribute('href',row.licencia_url);
  await expect(c.getByRole('list')).toContainText(row.leyenda[0].valor);
  // Las vías se concentran en los centros poblados; la vista general del
  // departamento no debe usarse como prueba de ausencia de esas líneas.
  await page.evaluate(id=>window.obs19Api.getMap().setView(id==='vias_y_caminos'?[-4.21,-69.94]:[-1.5,-71.5],id==='vias_y_caminos'?12:6,{animate:false}),row.id_capa);
  const sw=c.getByRole('switch');await sw.focus();await sw.press('Space');
  await expect(sw).toHaveAttribute('aria-checked','true');await expect(sw).toHaveAttribute('aria-busy','false');
  await expect.poll(()=>painted(page,row.id_capa),{message:'Las teselas deben pintar líneas, no solo dar HTTP 206'}).toBeGreaterThan(30);
  await expect(page.locator('#obs19-stat-detail')).toContainText(row.restricciones);
  await c.getByRole('slider').fill('50');
  expect(await page.evaluate(id=>window.obs19Api.getLayers().find(e=>e.idCitizen===id).opacity,row.id_capa)).toBe(50);
  if(row.id_capa==='vias_y_caminos'){
   await page.evaluate(()=>{const m=window.obs19Api.getMap();m.eachLayer(l=>{if(l instanceof L.TileLayer)m.removeLayer(l)})});
   await expect(page.locator('.leaflet-control-attribution')).toContainText('© colaboradores de OpenStreetMap');
   await expect(page.locator('.leaflet-control-attribution').getByRole('link',{name:'ODbL 1.0'})).toHaveAttribute('href',row.licencia_url);
  }
  await c.locator('[data-layer-zoom]').click();expect(await page.evaluate(()=>window.obs19Api.getMap().getZoom())).toBeGreaterThanOrEqual(5);
  await sw.focus();await sw.press('Enter');await expect(sw).toHaveAttribute('aria-checked','false');
  expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);
 }
 expect(new Set(requests.filter(u=>u.includes('/tanda_6_29/')&&u.endsWith('.pmtiles'))).size).toBe(2);
 expect(requests.filter(u=>u.endsWith('.geojson'))).toEqual([]);
});
test('tanda 6: error de rangos, reintento y cancelar no dejan capas huérfanas',async({page})=>{
 let fail=true;await page.route('**/tanda_6_29/teselas/drenaje_sencillo.pmtiles',r=>fail?r.fulfill({status:200,body:Buffer.alloc(127)}):r.continue());
 await page.goto('/#geovisor');const c=card(page,'drenaje_sencillo');await abrirCapa(c);await c.getByRole('switch').click();
 await expect(c.locator('[role="status"]')).toContainText('no sirve rangos HTTP 206');await expect(c.getByRole('switch')).toHaveAttribute('aria-checked','false');
 fail=false;await c.getByRole('switch').click();await expect(c.getByRole('switch')).toHaveAttribute('aria-busy','false');await expect(c.getByRole('switch')).toHaveAttribute('aria-checked','true');
 await page.locator('#geojson-reset').click();expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);await expect(c.getByRole('switch')).toHaveAttribute('aria-checked','false');
});
