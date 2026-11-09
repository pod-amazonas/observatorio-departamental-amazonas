const {test,expect}=require('@playwright/test');
const escenas=[['rios','Ríos'],['bosques','Selva'],['territorio','Territorio'],['movilidad','Movilidad fluvial']];
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1'){
   if(u.pathname.endsWith('config_supabase.js'))return route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'});
   return route.continue();
  }
  return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}});
 });
});
const estados=page=>page.locator('.portada').evaluate(e=>e.getAnimations({subtree:true}).map(a=>({estado:a.playState,pendiente:a.pending,tiempo:Math.round(a.currentTime*1000)/1000,iteraciones:a.effect.getTiming().iterations})));
for(const width of [1280,390]){
 test(`portada integrada: cinco segundos sin rotación y reinicio a ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-09T12:00:01Z'));
  await page.goto('/');
  const portada=page.locator('.portada');
  let inicio=await estados(page);expect(inicio.length).toBeGreaterThan(0);expect(inicio.some(a=>a.estado==='running')).toBe(true);
  expect(inicio.every(a=>Number.isFinite(a.iteraciones))).toBe(true);
  await page.clock.fastForward(5000);
  const quieta=await estados(page);expect(quieta.every(a=>a.estado!=='running'&&!a.pendiente)).toBe(true);
  await page.waitForTimeout(100);expect(await estados(page)).toEqual(quieta);
  await page.clock.fastForward(32000);await expect(portada).toHaveAttribute('data-capa','rios');
  for(const [id,nombre]of escenas){
   const boton=portada.getByRole('button',{name:nombre,exact:true});await boton.click();
   await expect(portada).toHaveAttribute('data-capa',id);
   await expect(page.locator('[data-paisaje]:not([hidden])')).toHaveAttribute('data-paisaje',id);
   expect(await page.locator('[data-paisaje][hidden]').evaluateAll(es=>es.every(e=>e.getAnimations({subtree:true}).length===0))).toBe(true);
   const activas=await estados(page);expect(activas.some(a=>a.estado==='running')).toBe(true);expect(activas.every(a=>Number.isFinite(a.iteraciones))).toBe(true);
   await page.clock.fastForward(5000);const antes=await estados(page);
   expect(antes.every(a=>a.estado!=='running'&&!a.pendiente)).toBe(true);
   await page.waitForTimeout(100);expect(await estados(page)).toEqual(antes);
   await page.clock.fastForward(16000);await expect(portada).toHaveAttribute('data-capa',id);
   await boton.press('Enter');expect((await estados(page)).some(a=>a.estado==='running')).toBe(true);
   await page.clock.fastForward(5000);expect((await estados(page)).every(a=>a.estado!=='running'&&!a.pendiente)).toBe(true);
  }
 });
 for(const legacy of [false,true])test(`portada integrada: opacidad y movimiento reducido a ${width}px${legacy?' con addListener':''}`,async({page})=>{
  await page.setViewportSize({width,height:844});
  if(legacy)await page.addInitScript(()=>{const original=matchMedia.bind(window);window.matchMedia=q=>{const m=original(q);if(q==='(prefers-reduced-motion: reduce)')Object.defineProperty(m,'addEventListener',{value:undefined});return m}});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const portada=page.locator('.portada');
  async function comprobar(){
   expect(await portada.evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
   const datos=await page.locator('.portada h1,.portada-frase,.portada-acciones,.portada-cta,.portada-enlace,.portada-chips,.portada-chip,.portada-logo,.portada-logo img').evaluateAll(es=>es.map(e=>({opacidad:getComputedStyle(e).opacity,display:getComputedStyle(e).display})));
   expect(datos.length).toBeGreaterThan(10);expect(datos.every(e=>e.opacidad==='1'&&e.display!=='none')).toBe(true);
  }
  await comprobar();
  for(const [id,nombre]of escenas){await portada.getByRole('button',{name:nombre,exact:true}).click();await expect(portada).toHaveAttribute('data-capa',id);await comprobar();}
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(portada).not.toHaveAttribute('data-movimiento','activo');
  await portada.getByRole('button',{name:'Selva',exact:true}).click();
  expect((await estados(page)).some(a=>a.estado==='running')).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(portada).not.toHaveAttribute('data-movimiento','activo');await comprobar();
 });
 test(`portada integrada: conserva contenido y accesos a ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await expect(page.locator('.portada h1')).toHaveText('Observatorio Departamental del Amazonas');
  await expect(page.locator('.portada-frase')).toHaveText('Descubre el Amazonas, capa por capa.');
  await expect(page.locator('.portada h1')).toHaveCSS('font-family',/Manrope/);
  await expect(page.locator('.portada-modulo')).toHaveCount(6);
  await expect(page.locator('.obs19-partner:not([aria-hidden=true])')).toHaveCount(16);
  await expect(page.locator('.portada-chip')).toHaveCount(4);
  await expect(page.locator('#guacamaya')).toHaveCount(0);
  await expect(page.locator('.casa-ribera')).toHaveCount(2);await expect(page.locator('.maloca')).toHaveCount(1);
  const marca=await page.locator('.portada-logo img').boundingBox();expect(marca.width).toBeLessThanOrEqual(width===390?88:144);
  const xs=await page.locator('.portada-modulo').evaluateAll(es=>es.map(e=>Math.round(e.getBoundingClientRect().x)));expect(new Set(xs).size).toBe(width===390?1:3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.portada-chip[data-capa=bosques]').focus();await page.keyboard.press('Space');await expect(page.locator('.portada')).toHaveAttribute('data-capa','bosques');
  const solicitadas=[];page.on('request',r=>solicitadas.push(r.url()));
  await page.locator('.portada-cta').click();await expect(page.locator('#view-geovisor')).toBeVisible();
  expect(solicitadas.some(u=>/propuestas\/portada-naturalista/.test(u))).toBe(false);
 });
}

test('portada integrada: carga móvil con red lenta simulada',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000,connectionType:'cellular3g'});
 const errores=[];page.on('pageerror',e=>errores.push(e.message));await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.portada h1')).toHaveCSS('opacity','1');
 await expect.poll(()=>page.locator('.portada-logo img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
 await page.locator('.portada-chip[data-capa=bosques]').click();await expect(page.locator('.portada')).toHaveAttribute('data-capa','bosques');
 expect(await page.locator('.portada').evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
 console.log('RED_LENTA_390',JSON.stringify(await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),bytes:n.encodedBodySize,ancho:innerWidth}})));
 expect(errores).toEqual([]);await cdp.detach();
});

for(const width of [1280,1440,390]){
 test(`portada: delfín visible fuera del texto durante al menos 2 s a ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-09T12:00:01Z'));await page.goto('/');
  await page.locator('.portada-chip[data-capa=rios]').click();
  await page.locator('.portada').evaluate(e=>window.scrollTo({top:e.getBoundingClientRect().bottom+scrollY-innerHeight,behavior:"instant"}));
  const resultado=await page.locator('.portada').evaluate(e=>{
   const rect=r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom});
   const panel=rect(e.querySelector('.portada-texto').getBoundingClientRect());
   // Incluye los 10 px de halo de los paneles conservados.
   const paneles=[panel,...Array.from(e.querySelectorAll('.portada-acciones,.portada-capas'),n=>{const r=n.getBoundingClientRect();return {left:r.left-10,right:r.right+10,top:r.top-10,bottom:r.bottom+10}})];
   const svg=e.querySelector('.portada-fondo'),hero=rect(e.getBoundingClientRect());
   const linea=new DOMPoint(0,Number(svg.querySelector('#salto-agua rect').getAttribute('height'))).matrixTransform(svg.getScreenCTM()).y;
   const a=e.getAnimations({subtree:true});a.forEach(x=>x.pause());
   const d=e.querySelector('.salto-delfin');let muestras=0,racha=0,maxRacha=0;
   for(let t=0;t<5000;t+=100){
    a.forEach(x=>{x.currentTime=Math.min(t,x.effect.getComputedTiming().endTime)});
    const r=d.getBoundingClientRect();const visible={left:r.left,right:r.right,top:r.top,bottom:Math.min(r.bottom,linea)};
    const suficiente=visible.bottom-visible.top>=12;
    const dentro=visible.left>=Math.max(0,hero.left)&&visible.right<=Math.min(innerWidth,hero.right)&&visible.top>=Math.max(0,hero.top)&&visible.bottom<=Math.min(innerHeight,hero.bottom);
    const libre=paneles.every(p=>visible.right<=p.left||visible.left>=p.right||visible.bottom<=p.top||visible.top>=p.bottom);
    if(suficiente&&dentro&&libre){muestras++;racha++;maxRacha=Math.max(maxRacha,racha)}else racha=0;
   }
   return {visibleMs:muestras*100,consecutivosMs:Math.max(0,maxRacha-1)*100,panel};
  });
  console.log("DELFIN_VISIBLE",width,JSON.stringify(resultado));
  expect(resultado.visibleMs,JSON.stringify(resultado)).toBeGreaterThanOrEqual(2000);
  expect(resultado.consecutivosMs,JSON.stringify(resultado)).toBeGreaterThanOrEqual(2000);
 });
 test(`portada: cuadro final de Selva completo y lejos del logo a ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-09T12:00:01Z'));await page.goto('/');
  await page.locator('.portada-chip[data-capa=bosques]').click();await page.mouse.move(0,0);
  await page.locator('.portada').evaluate(e=>window.scrollTo({top:e.getBoundingClientRect().bottom+scrollY-innerHeight,behavior:"instant"}));
  await page.clock.fastForward(5000);
  const aves=await page.locator('.portada').evaluate(e=>{
   const h=e.getBoundingClientRect(),logo=e.querySelector('.portada-logo').getBoundingClientRect(),p=e.querySelector('.portada-texto').getBoundingClientRect();
   return Array.from(e.querySelectorAll('.vuelo-guacamayas > g'),ave=>{
    const r=ave.getBoundingClientRect();return {
     completa:r.left>=Math.max(0,h.left)&&r.right<=Math.min(innerWidth,h.right)&&r.top>=Math.max(0,h.top)&&r.bottom<=Math.min(innerHeight,h.bottom),
     lejos:r.right+16<=logo.left||r.left-16>=logo.right||r.bottom+16<=logo.top||r.top-16>=logo.bottom,
     libre:r.right+10<=p.left||r.left-10>=p.right||r.bottom+10<=p.top||r.top-10>=p.bottom,
     caja:{x:r.x,y:r.y,w:r.width,h:r.height}
    };
   });
  });
  expect(aves).toHaveLength(2);for(const ave of aves){expect(ave.completa,JSON.stringify(ave)).toBe(true);expect(ave.lejos,JSON.stringify(ave)).toBe(true);expect(ave.libre,JSON.stringify(ave)).toBe(true)}
  expect((await estados(page)).every(a=>a.estado!=='running'&&!a.pendiente)).toBe(true);
 });
}
