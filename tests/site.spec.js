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
 expect(await page.locator('.portada-navega').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 for(const sel of ['.portada-barco','.portada-delfin','.portada-ave','.portada-humo'])expect(await page.locator(sel).first().evaluate(e=>getComputedStyle(e).animationName),sel).toBe('none');
 await page.waitForTimeout(5200);
 await expect(page.locator('.portada')).toHaveAttribute('data-capa','rios');
});
const capasPortada=[['rios','Ríos'],['bosques','Selva'],['territorio','Territorio'],['movilidad','Movilidad fluvial']];
for(const width of [1280,390])test(`portada: pausa real y reanudación con teclado a ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.clock.install();
 await page.goto('/');
 const portada=page.locator('.portada');
 const pausa=portada.locator('.portada-pausa');
 await expect(pausa).toBeVisible();
 await expect(pausa).toHaveAccessibleName('Pausar animación');
 await pausa.focus();await pausa.press('Enter');
 await expect(pausa).toHaveAccessibleName('Reanudar animación');
 const animaciones=()=>portada.evaluate(e=>e.getAnimations({subtree:true})
  .filter(a=>a.effect.getTiming().iterations===Infinity)
  .map(a=>({estado:a.playState,tiempo:a.currentTime})));
 for(const [capa,nombre] of capasPortada){
  await portada.getByRole('button',{name:nombre,exact:true}).click();
  await expect(portada).toHaveAttribute('data-animacion-pausada','true');
  await expect(portada).toHaveAttribute('data-capa',capa);
  const antes=await animaciones();
  expect(antes.length).toBeGreaterThan(0);
  expect(antes.every(a=>a.estado==='paused')).toBe(true);
  await page.waitForTimeout(150);
  expect(await animaciones()).toEqual(antes);
  await page.clock.fastForward(5000);
  await expect(portada).toHaveAttribute('data-capa',capa);
 }
 await pausa.focus();await pausa.press('Space');
 await expect(pausa).toHaveAccessibleName('Pausar animación');
 await expect(portada).toHaveAttribute('data-animacion-pausada','false');
 const activas=portada.locator('.portada-capa-movilidad .portada-barco,.portada-logo img,.portada-orbita,.portada-orbita-inversa');
 expect(await activas.evaluateAll(es=>es.every(e=>e.getAnimations().some(a=>a.playState==='running')))).toBe(true);
 const antes=await activas.first().evaluate(e=>e.getAnimations()[0].currentTime);
 await page.waitForTimeout(150);
 expect(await activas.first().evaluate(e=>e.getAnimations()[0].currentTime)).toBeGreaterThan(antes);
 await page.clock.fastForward(5000);
 await expect(portada).toHaveAttribute('data-capa','rios');
});
test('portada: movimiento reducido inicial y cambios de preferencia respetan la pausa manual',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.clock.install();
 await page.goto('/');
 const portada=page.locator('.portada');
 const pausa=portada.locator('.portada-pausa');
 const infinitas=()=>portada.evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations===Infinity).length);
 await expect(pausa).toHaveAccessibleName('Reanudar animación');
 await expect(pausa).toBeDisabled();
 await expect(page.locator('#portada-movimiento-reducido')).toBeVisible();
 expect(await infinitas()).toBe(0);
 await page.clock.fastForward(5000);
 await expect(portada).toHaveAttribute('data-capa','rios');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(pausa).toBeEnabled();
 await expect(pausa).toHaveAccessibleName('Pausar animación');
 await page.clock.fastForward(5000);
 await expect(portada).toHaveAttribute('data-capa','bosques');
 await pausa.click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(pausa).toBeDisabled();
 expect(await infinitas()).toBe(0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(pausa).toBeEnabled();
 await expect(pausa).toHaveAccessibleName('Reanudar animación');
 await page.clock.fastForward(5000);
 await expect(portada).toHaveAttribute('data-capa','bosques');
 expect(await portada.evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations===Infinity).every(a=>a.playState==='paused'))).toBe(true);
});
test('portada: cada capa se resalta sola y se activa con teclado',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const portada=page.locator('.portada');
 for(const [i,[capa,nombre]] of capasPortada.entries()){
  const boton=portada.getByRole('button',{name:nombre,exact:true});
  await boton.focus();await boton.press(i%2?'Space':'Enter');
  await expect(portada).toHaveAttribute('data-capa',capa);
  await expect(portada.locator('.portada-capa-texto')).toHaveText(await boton.getAttribute('data-texto'));
  for(const [otra,otroNombre] of capasPortada){
   const activa=otra===capa;
   await expect(portada.getByRole('button',{name:otroNombre,exact:true}),`botón ${otroNombre} con ${capa} activa`).toHaveAttribute('aria-pressed',String(activa));
   await expect(portada.locator(`svg.portada-fondo .portada-capa-${otra}`),`capa ${otra} con ${capa} activa`).toHaveCSS('opacity',activa?'1':'0');
  }
 }
});
const modulosPortada=[['Geovisor','geovisor'],['Geoportal','geoportal'],['Avances del POD','avances-pod'],['Biblioteca Digital','biblioteca'],['Documentos del POD','documentos-pod'],['Certificados ambientales','certificados']];
test('portada: cada capa muestra su escena y pausa las demás',async({page})=>{
 await page.goto('/');
 const portada=page.locator('.portada');
 const estado=sel=>page.locator(sel).first().evaluate(e=>getComputedStyle(e).animationPlayState);
 const escenas=[['Ríos','.portada-delfin'],['Selva','.portada-ave'],['Territorio','.portada-humo'],['Movilidad fluvial','.portada-barco']];
 for(const [nombre,propia] of escenas){
  await portada.getByRole('button',{name:nombre,exact:true}).click();
  for(const [,sel] of escenas)expect(await estado(sel),`${sel} con ${nombre} activa`).toBe(sel===propia?'running':'paused');
 }
 await expect(page.locator('svg.portada-fondo use[href="#portada-peque"]')).toHaveCount(2);
 await expect(page.locator('svg.portada-fondo use[href="#portada-maloca"]')).toHaveCount(3);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(0);
});
test('portada: el delfín sale del agua cada vez que se muestra Ríos',async({page})=>{
 await page.goto('/');
 const medida=await page.locator('.portada-delfin').evaluate(el=>{
  const animacion=el.getAnimations()[0];
  const fondo=document.querySelector('svg.portada-fondo').getBoundingClientRect();
  const linea=fondo.top+585*fondo.height/660;
  const parte=t=>{animacion.pause();animacion.currentTime=t;return el.querySelector('use').getBoundingClientRect().top};
  return {duracion:getComputedStyle(el).animationDuration,linea,inicio:parte(0),medio:parte(2300)};
 });
 expect(medida.duracion).toBe('4.6s');
 expect(medida.inicio).toBeGreaterThan(medida.linea-20);
 expect(medida.medio).toBeLessThan(medida.linea-30);
});
test('portada: las seis tarjetas son exactamente las esperadas',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.portada-modulo strong')).toHaveText(modulosPortada.map(([t])=>t));
});
for(const [titulo,ruta] of modulosPortada)test(`portada: tarjeta ${titulo} abre la vista ${ruta}`,async({page})=>{
 await page.goto('/');
 const tarjeta=page.locator('.portada-modulo').filter({has:page.getByText(titulo,{exact:true})});
 await expect(tarjeta).toHaveCount(1);
 await expect(tarjeta).toHaveAttribute('href','#'+ruta);
 await expect(tarjeta).toHaveAttribute('data-route',ruta);
 await tarjeta.click();
 await expect(page).toHaveURL(new RegExp('#'+ruta+'$'));
 await expect(page.locator('#view-'+ruta)).toBeVisible();
 await expect(page.locator('#view-inicio')).toBeHidden();
});
const luminancia=([r,g,b])=>{const c=[r,g,b].map(n=>{n/=255;return n<=.03928?n/12.92:((n+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const contraste=(a,b)=>{const [x,y]=[luminancia(a),luminancia(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05)};
const controlesPortada='.portada-chip,.portada-cta,.portada-enlace,.portada-modulo';
// Mide píxeles reales: el anillo de foco debe verse y contrastar ≥3:1 con lo que tiene a ambos lados (WCAG 2.1, 1.4.11).
// Toma dos capturas gemelas: con anillo (para ver el anillo) y con el anillo transparente (para leer el fondo sin
// ninguna contaminación del suavizado del contorno). Confirma la escena antes y después de capturar.
// Fuera de alcance (#17): que el foco no quede tapado por el encabezado u otras capas (WCAG 2.2, 2.4.11).
async function medirFoco(page,capa){
 const leerPixeles=(png,puntos)=>page.evaluate(async({png,puntos})=>{
  const img=await createImageBitmap(await (await fetch('data:image/png;base64,'+png)).blob());
  const c=new OffscreenCanvas(img.width,img.height),ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  return puntos.map(([px,py])=>px<0||py<0||px>=img.width||py>=img.height?null:[...ctx.getImageData(px,py,1,1).data.slice(0,3)]);
 },{png,puntos});
 const escena=()=>page.locator('.portada').getAttribute('data-capa');
 const datos=await page.evaluate(()=>{
  const e=document.activeElement;
  e.scrollIntoView({block:'center',inline:'center'});
  const s=getComputedStyle(e),r=e.getBoundingClientRect();
  return {indice:e.dataset.pruebaFoco,focusVisible:e.matches(':focus-visible'),visible:!!e.checkVisibility?.({opacityProperty:true,visibilityProperty:true}),tipo:s.outlineStyle,
   ancho:parseFloat(s.outlineWidth),separacion:parseFloat(s.outlineOffset),color:s.outlineColor.match(/\d+/g).slice(0,3).map(Number),
   caja:{x:r.x,y:r.y,w:r.width,h:r.height},escala:devicePixelRatio,nombre:(e.getAttribute('aria-label')||e.textContent).trim().slice(0,40)};
 });
 const {x,y,w,h}=datos.caja,o=datos.separacion,a=datos.ancho,k=datos.escala,vista=page.viewportSize();
 // Recorte alrededor del control (más rápido con alta densidad), limitado a la ventana.
 const m=Math.max(0,o+a)+4,x0=Math.max(0,Math.floor(x-m)),y0=Math.max(0,Math.floor(y-m));
 const clip={x:x0,y:y0,width:Math.min(vista.width,Math.ceil(x+w+m))-x0,height:Math.min(vista.height,Math.ceil(y+h+m))-y0};
 const capturar=async()=>clip.width>0&&clip.height>0?(await page.screenshot({animations:'disabled',clip})).toString('base64'):null;
 const escenaAntes=await escena();
 const conAnillo=await capturar();
 await page.evaluate(()=>document.activeElement.style.setProperty('outline-color','transparent','important'));
 const sinAnillo=await capturar();
 await page.evaluate(()=>document.activeElement.style.removeProperty('outline-color'));
 datos.escenas=[escenaAntes,await escena()];
 const lados=[[x+w/2,y,0,-1],[x+w/2,y+h,0,1],[x,y+h/2,-1,0],[x+w,y+h/2,1,0]];
 const punto=(px,py,dx,dy,d)=>[Math.floor((px+dx*d-x0)*k),Math.floor((py+dy*d-y0)*k)];
 // Anillo: centro del contorno, en la captura con anillo.
 // Fondo: el píxel pegado a cada borde del anillo (fuera y en la separación), en la captura sin anillo; es el
 // «color adyacente» de WCAG y queda lejos del suavizado de controles vecinos.
 const anillo=conAnillo?await leerPixeles(conAnillo,lados.map(([px,py,dx,dy])=>punto(px,py,dx,dy,o+a/2))):[];
 const fondo=sinAnillo?await leerPixeles(sinAnillo,lados.flatMap(([px,py,dx,dy])=>[punto(px,py,dx,dy,o+a+.25),punto(px,py,dx,dy,o-.25)])):[];
 datos.muestras=lados.map((_,i)=>({anillo:anillo[i]??null,fuera:fondo[i*2]??null,dentro:fondo[i*2+1]??null}));
 return datos;
}
for(const size of [{width:1280,height:720},{width:390,height:844}])test(`portada: foco de teclado visible y ≥3:1 con sus fondos reales a ${size.width}px (#17)`,async({page})=>{
 await page.setViewportSize(size);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 // Hay 13 controles; la pausa está deshabilitada con movimiento reducido y no recibe Tab.
 await expect(page.locator(controlesPortada)).toHaveCount(13);
 await expect(page.locator('.portada-pausa')).toBeDisabled();
 // Identificador estable solo para los 12 controles habilitados que debe alcanzar el recorrido.
 const esperados=await page.locator(controlesPortada).evaluateAll(els=>els.filter(e=>!e.matches(':disabled')).map((e,i)=>(e.dataset.pruebaFoco=String(i))));
 expect(esperados).toHaveLength(12);
 for(const [capa,nombre] of capasPortada){
  await page.locator('.portada').getByRole('button',{name:nombre,exact:true}).evaluate(b=>b.click());
  await expect(page.locator('.portada')).toHaveAttribute('data-capa',capa);
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});
  const vistos=new Set();
  for(let i=0;i<80&&vistos.size<esperados.length;i++){
   await page.keyboard.press('Tab');
   if(!await page.evaluate(sel=>document.activeElement?.matches(sel),controlesPortada))continue;
   const f=await medirFoco(page,capa),id=`${capa} · ${f.nombre}`;
   vistos.add(f.indice);
   expect(f.focusVisible,id).toBe(true);
   expect(f.visible,id).toBe(true);
   expect(f.tipo,id).toBe('solid');
   expect(f.ancho,id).toBeGreaterThanOrEqual(2);
   expect(f.separacion,`${id}: el anillo debe quedar fuera del relleno del control`).toBeGreaterThanOrEqual(2);
   expect(f.escenas,`${id}: la escena no cambia durante la medición`).toEqual([capa,capa]);
   expect(f.muestras.every(m=>m.anillo&&m.fuera&&m.dentro),`${id}: los 4 lados del anillo deben estar dentro de la ventana`).toBe(true);
   for(const [lado,{anillo,fuera,dentro}] of f.muestras.entries()){
    expect(Math.max(...anillo.map((v,j)=>Math.abs(v-f.color[j]))),`${id} lado ${lado}: el anillo se ve en pantalla`).toBeLessThanOrEqual(24);
    for(const vecino of [fuera,dentro])expect(contraste(f.color,vecino),`${id} lado ${lado}: contra rgb(${vecino})`).toBeGreaterThanOrEqual(3);
   }
  }
  expect([...vistos].sort(),`controles alcanzados con Tab en ${capa}`).toEqual([...esperados].sort());
 }
});
