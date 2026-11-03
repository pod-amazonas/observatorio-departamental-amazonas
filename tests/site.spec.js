const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {hint}=require('@mapbox/geojsonhint');
const catalog=require('../catalogo_determinantes_para_geovisor.json');
const layers=catalog.grupos.flatMap(g=>g.capas);
test.beforeEach(async({page})=>{
  await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='127.0.0.1'){
      if(u.pathname==='/api/public/dashboard')return route.fulfill({json:{}});
      if(u.pathname.endsWith('/config_supabase.js'))return route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"test"}'});
      return route.continue();
    }
    if(u.pathname.endsWith('/leaflet.js'))return route.fulfill({path:require.resolve('leaflet/dist/leaflet.js'),contentType:'application/javascript'});
    if(u.pathname.endsWith('/leaflet.css'))return route.fulfill({path:require.resolve('leaflet/dist/leaflet.css'),contentType:'text/css'});
    if(u.pathname.includes('supabase-js'))return route.fulfill({contentType:'application/javascript',body:`window.supabase={createClient:()=>({from:()=>{const q={select:()=>q,eq:()=>q,order:()=>q,in:()=>q,then:r=>Promise.resolve({data:[],error:null}).then(r)};return q}})}`});
    return route.fulfill({status:200,body:'',contentType:'text/plain'});
  });
});
for(const view of ['inicio','geovisor','geoportal','avances-pod','certificados','biblioteca','documentos-pod','secretaria','contacto','admin']){
 test(`vista ${view} sin errores JavaScript`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('/#'+view);await expect(page.locator('#view-'+view)).toBeVisible();
  await expect(page.locator('#obs19-pilot-list .obs20-pilot-card')).toHaveCount(33);
  await expect(page.locator('#pod-live-status')).toHaveText('No hay reportes publicados para consulta ciudadana.');
  expect(errors).toEqual([]);
 });
}
test('mapa, catálogo y activación/desactivación de capa 1',async({page})=>{
 await page.goto('/#geovisor');
 await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);
 await expect(page.locator('#obs19-pilot-list .obs20-pilot-card')).toHaveCount(33);
 const cb=page.getByRole('checkbox',{name:'Mostrar u ocultar Rio Pure',exact:true});
 await cb.focus();await cb.press('Space');
 await expect.poll(()=>page.evaluate(()=>window.obs19Api.getLayers().filter(l=>l.idPilot===1&&window.obs19Api.getMap().hasLayer(l.layer)).length)).toBe(1);
 await expect(cb).toBeChecked();await cb.focus();await cb.press('Space');
 await expect.poll(()=>page.evaluate(()=>window.obs19Api.getLayers().filter(l=>l.idPilot===1).length)).toBe(0);
 await expect(cb).not.toBeChecked();
});
test('catálogo contiene 33 entradas únicas y 20 archivos preparados',()=>{
 expect(layers).toHaveLength(33);expect(new Set(layers.map(l=>l.objectid)).size).toBe(33);
 expect(layers.filter(l=>l.archivo)).toHaveLength(20);
 expect(layers.filter(l=>!l.archivo).map(l=>l.objectid)).toEqual(Array.from({length:13},(_,i)=>i+19));
});
for(const layer of layers.filter(l=>l.archivo))test(`GeoJSON ${layer.objectid}: existe y es válido`,()=>{
 const file=path.resolve(__dirname,'..',layer.archivo);
 expect(fs.existsSync(file)).toBe(true);
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 expect(data.type).toBe('FeatureCollection');expect(data.features.length).toBeGreaterThan(0);
 expect(hint(data).filter(e=>e.level!=='message')).toEqual([]);
});

for(const size of [{width:1280,height:720},{width:390,height:844}])test(`lista de capas visible y usable con clic a ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);
 await page.goto('/#geovisor');
 await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);
 const list=page.locator('#obs19-pilot-list');
 await expect(list.locator('.obs20-pilot-card')).toHaveCount(33);
 expect((await list.boundingBox()).height).toBeGreaterThan(0);
 const cb=page.getByRole('checkbox',{name:'Mostrar u ocultar Rio Pure',exact:true});
 await cb.check();
 await expect.poll(()=>page.evaluate(()=>window.obs19Api.getLayers().filter(l=>l.idPilot===1).length)).toBe(1);
 await expect(cb).toBeChecked();
 await cb.uncheck();
 await expect.poll(()=>page.evaluate(()=>window.obs19Api.getLayers().filter(l=>l.idPilot===1).length)).toBe(0);
});

for(const view of ['documentos-pod','avances-pod'])test(`regresión pública POD: ${view}`,async({page})=>{
 await page.goto('/#'+view);
 await expect(page.locator('#view-'+view)).toBeVisible();
 await expect(page.locator('#pod-total')).toHaveText('33');
 await expect(page.locator('#pod-review')).toHaveText('0');
 const documents=await page.evaluate(()=>window.POD_CATALOGO.documents);
 expect(documents).toHaveLength(33);
 expect(documents.filter(d=>d.needsPrivacyReview===true)).toEqual([]);
 await expect(page.locator('a[href*="admin_borradores_v20.html"]')).toHaveCount(0);
});
