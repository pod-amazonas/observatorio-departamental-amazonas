const {test,expect}=require('@playwright/test');
const {abrirCapa}=require('./helpers/geovisor.cjs');

// Sin Supabase de producción ni recursos externos durante estas comprobaciones.
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1'){
   if(u.pathname.endsWith('/config_supabase.js'))return route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'});
   return route.continue();
  }
  return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}});
 });
});
const controles='a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex]';
const luminancia=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contraste=(a,b)=>(Math.max(luminancia(a),luminancia(b))+.05)/(Math.min(luminancia(a),luminancia(b))+.05);

async function comprobarFoco(page){
 // Esperar el pintado y las transiciones reducidas de .01ms, sin mover el foco.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const f=await page.evaluate(()=>{
  const e=document.activeElement;
  // La etiqueta representa visualmente el input de archivo oculto y conserva
  // la misma acción. El foco de teclado debe seguir perteneciendo al input.
  const indicador=e.id==='geojson-upload'?e.labels[0]:e;
  const r=indicador.getBoundingClientRect(),s=getComputedStyle(indicador);
  // Sin scrollIntoView: se comprueba el desplazamiento que produjo Tab.
  const puntos=[[.5,.5],[.15,.15],[.85,.15],[.15,.85],[.85,.85]];
  return {id:e.dataset.foco25,nombre:e.id||e.getAttribute('aria-label')||e.textContent.trim().slice(0,60),
   visible:indicador.checkVisibility({opacityProperty:true,visibilityProperty:true}),teclado:e.matches(':focus-visible'),
   libre:puntos.every(([u,v])=>{const x=r.x+r.width*u,y=r.y+r.height*v,encima=document.elementFromPoint(x,y);return encima===indicador||indicador.contains(encima)}),
   x:r.x,y:r.y,w:r.width,h:r.height,o:parseFloat(s.outlineOffset),a:parseFloat(s.outlineWidth),tipo:s.outlineStyle,
   color:s.outlineColor.match(/\d+/g).slice(0,3).map(Number),k:devicePixelRatio};
 });
 expect(f.visible,f.nombre).toBe(true);
 expect(f.teclado,f.nombre).toBe(true);
 expect(f.libre,`${f.nombre}: foco tapado o fuera de la ventana tras Tab`).toBe(true);
 expect(f.tipo,f.nombre).toBe('solid');
 expect(f.a,f.nombre).toBeGreaterThanOrEqual(3);
 // Captura de la ventana: sus coordenadas coinciden con getBoundingClientRect,
 // también después del desplazamiento automático al tabular.
 const png=(await page.screenshot({animations:'disabled'})).toString('base64');
 const lados=[[f.x+f.w/2,f.y,0,-1],[f.x+f.w/2,f.y+f.h,0,1],[f.x,f.y+f.h/2,-1,0],[f.x+f.w,f.y+f.h/2,1,0]];
 const puntos=lados.flatMap(([x,y,dx,dy])=>[f.o+f.a/2,f.o-.5,f.o+f.a+.5].map(d=>[Math.floor((x+dx*d)*f.k),Math.floor((y+dy*d)*f.k)]));
 const pixeles=await page.evaluate(async({png,puntos})=>{
  const img=await createImageBitmap(await(await fetch('data:image/png;base64,'+png)).blob());
  const c=new OffscreenCanvas(img.width,img.height),ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  return puntos.map(([x,y])=>x>=0&&y>=0&&x<img.width&&y<img.height?[...ctx.getImageData(x,y,1,1).data.slice(0,3)]:null);
 },{png,puntos});
 expect(pixeles.every(Boolean),`${f.nombre}: anillo completo dentro de la captura`).toBe(true);
 for(let i=0;i<12;i+=3){
  const anillo=pixeles[i];
  expect(Math.max(...anillo.map((v,j)=>Math.abs(v-f.color[j]))),`${f.nombre}: anillo realmente pintado, lado ${i/3}`).toBeLessThanOrEqual(24);
  for(const vecino of pixeles.slice(i+1,i+3))expect(contraste(anillo,vecino),`${f.nombre}: contraste real, lado ${i/3}`).toBeGreaterThanOrEqual(3);
 }
 return f.id;
}

async function recorrerConTab(page,vista){
 // El catálogo se monta de forma asíncrona; identificar nodos después del montaje.
 await expect(page.locator('#obs19-thematic-tree [data-determinant-layer]')).toHaveCount(33);
 await expect(page.locator('[data-citizen-layer]')).toHaveCount(3);
 if(vista==='geovisor')await page.locator('#obs19-thematic-tree details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
 const esperados=await page.locator(controles).evaluateAll(els=>{
  const cerrados=[...document.querySelectorAll('details:not([open])')];
  return els.filter(e=>e.tabIndex>=0&&!e.disabled&&
   !(e.type==='radio'&&e.name&&!e.checked)&&
   (e.id==='geojson-upload'?e.labels[0]:e).checkVisibility({opacityProperty:true,visibilityProperty:true})&&
   cerrados.every(d=>!d.contains(e)||d.querySelector(':scope>summary')?.contains(e))
  ).map((e,i)=>e.dataset.foco25=String(i));
 });
 const vistos=new Set();
 for(let i=0;i<esperados.length+4&&vistos.size<esperados.length;i++){
  await page.keyboard.press('Tab');
  const activo=await page.evaluate(sel=>{
   const e=document.activeElement,s=getComputedStyle(e);
   return {id:e.dataset.foco25,tag:e.tagName,nativo:!e.matches(sel)&&[s.overflowX,s.overflowY].some(v=>['auto','scroll'].includes(v))};
  },controles);
  if(activo.id===undefined){
   // Chromium permite tabular a contenedores desplazables sin tabindex.
   // También deben superar las comprobaciones; no se omiten sus anillos.
   if(activo.tag!=='BODY'){
    expect(activo.nativo,'control inesperado en el recorrido de Tab').toBe(true);
    await comprobarFoco(page);
   }
   continue;
  }
  vistos.add(await comprobarFoco(page));
 }
 expect([...vistos].sort(),`todos los controles visibles de ${vista} alcanzables con Tab`).toEqual([...esperados].sort());
}

for(const size of [{width:1280,height:720},{width:390,height:844}]){
 for(const vista of ['geoportal','avances-pod','certificados','geovisor','biblioteca','documentos-pod','secretaria','contacto','admin']){
  test(`foco fuera de portada: ${vista} a ${size.width}px (#25)`,async({page})=>{
   test.setTimeout(120000);
   await page.setViewportSize(size);
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.goto('/#'+vista);
   await expect(page.locator('#view-'+vista)).toBeVisible();
   if(vista==='geovisor')await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);
   await recorrerConTab(page,vista);
  });
 }
}

for(const size of [{width:1280,height:720},{width:390,height:844}]){
 for(const etapa of [1,2])test(`foco en certificados, etapa ${etapa+1}, a ${size.width}px (#25)`,async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize(size);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#certificados');
  await page.evaluate(()=>{
   for(const [id,value] of Object.entries({'cert13-name':'Proyecto ficticio de prueba','cert13-desc':'Demostración de foco sin datos personales','cert13-sector':'Otro','obs19-location':'Área no Municipalizada'}))document.getElementById(id).value=value;
  });
  await page.locator('[data-cert13-step="1"]').evaluate(e=>e.click());
  if(etapa===2){
   await page.locator('[name="obs19-doc-mode"][value="unificado"]').evaluate(e=>e.click());
   for(const tipo of ['unificado','registro','identidad'])await page.locator(`[data-obs19-doc="${tipo}"]`).setInputFiles({name:'soporte-ficticio.pdf',mimeType:'application/pdf',buffer:Buffer.from('Documento ficticio de prueba')});
   await page.locator('[data-cert13-step="2"]').evaluate(e=>e.click());
   // El editor reconstruye sus filas al ajustar Leaflet (temporizador de 100ms).
   // Esperar 200ms sin cambios en esas filas antes de identificarlas.
   await page.locator('#cert14-vertices').evaluate(root=>new Promise(resolve=>{
    let timer;
    const terminar=()=>{observer.disconnect();resolve()};
    const reiniciar=()=>{clearTimeout(timer);timer=setTimeout(terminar,200)};
    const observer=new MutationObserver(reiniciar);
    observer.observe(root,{childList:true,subtree:true});reiniciar();
   }));
  }
  await expect(page.locator(`[data-cert13-panel="${etapa}"]`)).toBeVisible();
  await recorrerConTab(page,'certificados');
 });
}

test('la comprobación rechaza foco invisible, poco contraste y superposición (#25)',async({page})=>{
 await page.goto('/#geoportal');
 await page.keyboard.press('Tab');
 await comprobarFoco(page);
 for(const regla of [
  'body :focus-visible{outline:none!important}',
  'body :focus-visible{outline-color:#eee!important}',
  'body::after{content:"";position:fixed;inset:0;background:white;z-index:99999}'
 ]){
  const estilo=await page.addStyleTag({content:regla});
  await expect(comprobarFoco(page)).rejects.toThrow();
  await estilo.evaluate(e=>e.remove());
 }
});

for(const size of [{width:1280,height:720},{width:390,height:844}])test(`GeoJSON: selector oculto, etiqueta única y operativa a ${size.width}px (#25 P2)`,async({page})=>{
 await page.setViewportSize(size);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#geovisor');
 await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);
 await expect(page.locator('#obs19-thematic-tree [data-determinant-layer]')).toHaveCount(33);
 const input=page.locator('#geojson-upload'),etiqueta=page.locator('label[for="geojson-upload"]');
 await expect(etiqueta).toHaveCount(1);
 await expect(etiqueta).toBeVisible();
 expect(await input.evaluate(e=>!e.checkVisibility({opacityProperty:true})&&getComputedStyle(e).clipPath==='inset(50%)'&&e.getBoundingClientRect().width<=1)).toBe(true);
 // Alcanzar el input oculto con Tab; el anillo medido pertenece a su etiqueta.
 for(let i=0;i<100&&!await input.evaluate(e=>e===document.activeElement);i++)await page.keyboard.press('Tab');
 await expect(input).toBeFocused();
 await comprobarFoco(page);
 const sinAnillo=await page.addStyleTag({content:'.local-import-control:has(+ #geojson-upload:focus-visible){outline:none!important}'});
 await expect(comprobarFoco(page)).rejects.toThrow();
 await sinAnillo.evaluate(e=>e.remove());
 await comprobarFoco(page);
 const selector=page.waitForEvent('filechooser');
 await etiqueta.click();
 const chooser=await selector;
 expect(chooser.isMultiple()).toBe(true);
 await chooser.setFiles({name:'punto-ficticio.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',properties:{nombre:'Prueba ficticia'},geometry:{type:'Point',coordinates:[-70,-4]}}]}))});
 await expect(page.locator('#local-layer-list')).toContainText('punto-ficticio');
});

for(const width of [1280,390])test(`foco real de interruptores encendidos y apagados a ${width}px (#32)`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#geovisor');
 for(const selector of ['[data-determinant-layer="1"]','[data-citizen-layer="division_politico_administrativa"]']){
  const card=page.locator(selector);await abrirCapa(card);const sw=card.getByRole('switch');await sw.focus();await sw.press('Space');
  await expect(sw).toHaveAttribute('aria-checked','true');await sw.press('Tab');await page.keyboard.press('Shift+Tab');await expect(sw).toBeFocused();await comprobarFoco(page);
  await sw.press('Enter');await expect(sw).toHaveAttribute('aria-checked','false');await comprobarFoco(page);
 }
});
