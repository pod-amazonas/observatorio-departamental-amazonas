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
      if(u.pathname.endsWith('/config_supabase.js'))return route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'});
      return route.continue();
    }
    if(u.hostname==='test.invalid'){
      if(u.pathname==='/auth/v1/token')return route.fulfill({status:400,json:{code:'invalid_credentials',message:'Credenciales de prueba rechazadas'}});
      return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}});
    }
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
 await expect(page.locator('#pod-review, #pod-show-review')).toHaveCount(0);
 const documents=await page.evaluate(()=>window.POD_CATALOGO.documents);
 expect(documents).toHaveLength(33);
 expect(documents.filter(d=>d.needsPrivacyReview===true)).toEqual([]);
 await expect(page.locator('a[href*="admin_borradores_v20.html"]')).toHaveCount(0);
});

const crypto=require('node:crypto');
const targets=['index.html','pod_reportes_publicos.js','V20_FORMULARIO_BORRADORES/admin_borradores_v20.html','V20_FORMULARIO_BORRADORES/recuperar_contrasena_v20.html'];
for(const file of targets)test(`dependencias sin CDN: ${file}`,()=>{
 const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 expect(source).not.toMatch(/(?:https?:)?\/\/(?:unpkg\.com|cdn\.jsdelivr\.net)\b/i);
});
test('todos los archivos vendor coinciden con los SHA-256 documentados',()=>{
 const root=path.join(__dirname,'../vendor');
 const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
 const entries=[...readme.matchAll(/^\| `([^`]+)` \|[^\n]+\| `([a-f0-9]{64})` \|$/gm)];
 const files=fs.readdirSync(root,{recursive:true}).filter(f=>fs.statSync(path.join(root,f)).isFile()&&f!=='README.md').sort();
 expect(entries.map(m=>m[1]).sort()).toEqual(files);
 for(const [,file,hash] of entries)expect(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),file).toBe(hash);
});
for(const prefix of ['/','/observatorio-departamental-amazonas/']){
 test(`Leaflet y Supabase locales bajo ${prefix}`,async({page})=>{
  // Simula la subruta de un sitio de proyecto en GitHub Pages.
  if(prefix!=='/')await page.route('http://127.0.0.1:8765'+prefix+'**',async route=>{
   const url=new URL(route.request().url());
   const relative=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html';
   if(relative.endsWith('config_supabase.js'))return route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'});
   return route.fulfill({path:path.join(__dirname,'..',relative)});
  });
  const requested=[];page.on('request',r=>requested.push(r.url()));
  await page.goto(prefix+'#geovisor');
  await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);
  await expect(page.locator('#pod-live-status')).toHaveText('No hay reportes publicados para consulta ciudadana.');
  expect(await page.evaluate(()=>L.version)).toBe('1.9.4');
  expect(requested).toContain('http://127.0.0.1:8765'+prefix+'vendor/leaflet-1.9.4/leaflet.js');
  expect(requested).toContain('http://127.0.0.1:8765'+prefix+'vendor/leaflet-1.9.4/leaflet.css');
  expect(requested).toContain('http://127.0.0.1:8765'+prefix+'vendor/supabase-2.118.0/supabase.js');
  // Comprueba también que las imágenes resuelven junto al CSS local.
  await page.evaluate(()=>L.marker([0,0]).addTo(window.obs19Api.getMap()));
  const icon=page.locator('.leaflet-marker-icon').first();
  await expect(icon).toHaveAttribute('src',/vendor\/leaflet-1\.9\.4\/images\/marker-icon\.png$/);
  await expect.poll(()=>icon.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  for(const file of ['admin_borradores_v20.html','recuperar_contrasena_v20.html']){
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=page.waitForResponse(r=>r.url()==='http://127.0.0.1:8765'+prefix+'vendor/supabase-2.118.0/supabase.js');
   await page.goto(prefix+'V20_FORMULARIO_BORRADORES/'+file);
   expect((await response).status()).toBe(200);
   expect(await page.evaluate(()=>typeof window.supabase.createClient)).toBe('function');
   expect(errors).toEqual([]);
   if(file.startsWith('admin')){
    await page.locator('#email').fill('admin@example.invalid');
    await page.locator('#password').fill('clave-ficticia-de-prueba');
    await page.locator('#login').click();
    await expect(page.locator('#authStatus')).toContainText('Credenciales de prueba rechazadas');
   }
   if(file.startsWith('recuperar')){
    await expect(page.locator('#request')).toBeEnabled();
    await page.locator('#email').fill('admin@example.invalid');
    await page.locator('#request').click();
    await expect(page.locator('#requestStatus')).toContainText('Si el correo corresponde');
   }
  }
  expect(requested.filter(u=>/^https?:\/\/(unpkg\.com|cdn\.jsdelivr\.net)\//i.test(u))).toEqual([]);
 });
}

for(const size of [{width:1280,height:720},{width:390,height:844}])test(`transparencia y zoom de capa 1 con clic a ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);
 await page.goto('/#geovisor');
 const card=page.locator('.obs20-pilot-card').filter({has:page.getByRole('checkbox',{name:'Mostrar u ocultar Rio Pure',exact:true})});
 const slider=card.getByRole('slider');
 await expect(slider).toBeDisabled();
 await card.getByRole('button',{name:'Zoom a capa'}).click();
 await expect(slider).toBeEnabled();
 await expect.poll(()=>page.evaluate(()=>window.obs19Api.getLayers().filter(l=>l.idPilot===1&&window.obs19Api.getMap().hasLayer(l.layer)).length)).toBe(1);
 const before=Number(await slider.inputValue());
 await slider.click({position:{x:8,y:8}});
 const value=Number(await slider.inputValue());
 expect(value).not.toBe(before);
 await expect(card.locator('output')).toHaveText(value+'%');
 expect(await page.evaluate(()=>{const e=window.obs19Api.getLayers().find(l=>l.idPilot===1);return e.layer.getLayers()[0].options.fillOpacity})).toBeCloseTo((100-value)/100*.52);
 await page.evaluate(()=>window.obs19Api.getMap().setView([0,0],3,{animate:false}));
 await card.getByRole('button',{name:'Zoom a capa'}).click();
 await expect.poll(()=>page.evaluate(()=>{const map=window.obs19Api.getMap(),e=window.obs19Api.getLayers().find(l=>l.idPilot===1);return map.getBounds().contains(e.layer.getBounds())&&map.getCenter().distanceTo(e.layer.getBounds().getCenter())<10000})).toBe(true);
 expect(await page.evaluate(()=>window.obs19Api.getLayers().filter(l=>l.idPilot===1).length)).toBe(1);
});
test('estado uniforme del prototipo y sin consulta al servidor retirado',async({page})=>{
 const requests=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/public/dashboard')requests.push(r.url())});
 await page.goto('/');
 await expect(page).toHaveTitle('Observatorio Departamental del Amazonas · Prototipo en desarrollo');
 await expect(page.locator('.prototype-ribbon')).toHaveText('Prototipo en desarrollo');
 await expect(page.locator('.footer-bottom span').last()).toHaveText('Prototipo en desarrollo');
 await expect(page.locator('#pod-live-status')).toHaveText('No hay reportes publicados para consulta ciudadana.');
 expect(requests).toEqual([]);
});

test('portada: nombre, frase, logo y capas interactivas',async({page})=>{
 await page.goto('/');
 const portada=page.locator('.portada');
 await expect(portada.locator('h1')).toHaveText('Observatorio Departamental del Amazonas');
 await expect(portada.locator('.portada-frase')).toHaveText('Descubre el Amazonas, capa por capa.');
 const logo=portada.locator('.portada-logo img');
 await expect.poll(()=>logo.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await portada.getByRole('button',{name:'Movilidad fluvial'}).click();
 await expect(portada).toHaveAttribute('data-capa','movilidad');
 await expect(portada.getByRole('button',{name:'Movilidad fluvial'})).toHaveAttribute('aria-pressed','true');
 await expect(portada.locator('.portada-capa-texto')).toContainText('puertos');
 await page.waitForTimeout(5200);
 await expect(portada).toHaveAttribute('data-capa','movilidad');
});
for(const [size,columnas] of [[{width:1280,height:720},3],[{width:390,height:844},1]])test(`portada: 6 módulos en ${columnas} columna(s) a ${size.width}px`,async({page})=>{
 await page.setViewportSize(size);
 await page.goto('/');
 const tarjetas=page.locator('.portada-modulo');
 await expect(tarjetas).toHaveCount(6);
 const xs=await tarjetas.evaluateAll(a=>a.map(e=>Math.round(e.getBoundingClientRect().left)));
 expect(new Set(xs).size).toBe(columnas);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('portada: conserva la franja con los logos de las 16 entidades',async({page})=>{
 await page.goto('/');
 const originales=page.locator('.obs19-partner:not([aria-hidden="true"])');
 await expect(originales).toHaveCount(16);
 await expect(originales.locator('img')).toHaveCount(16);
});
test('portada: respeta la preferencia de reducir movimiento',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 await expect(page.locator('.portada-frase')).toHaveCSS('opacity','1');
 expect(await page.locator('.portada-navega').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 await page.waitForTimeout(5200);
 await expect(page.locator('.portada')).toHaveAttribute('data-capa','rios');
});
