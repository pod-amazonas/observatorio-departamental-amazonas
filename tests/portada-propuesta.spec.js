const {test,expect}=require('@playwright/test');
const escenas=[['rios','Ríos'],['bosques','Selva'],['territorio','Territorio'],['movilidad','Movilidad fluvial']];

for(const width of [1280,390]){
 test(`propuesta naturalista: teclado, seis módulos y recursos locales a ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  const errors=[],externas=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();
   externas.push(route.request().url());return route.abort();
  });
  await page.goto('/propuestas/portada-naturalista/');
  const rios=page.getByRole('button',{name:'Ríos',exact:true});
  for(let i=0;i<15&&!await rios.evaluate(e=>e===document.activeElement);i++)await page.keyboard.press('Tab');
  await expect(rios).toBeFocused();
  expect(await rios.evaluate(e=>e.matches(':focus-visible'))).toBe(true);
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  await expect(page.locator('.hero')).toHaveAttribute('data-escena','bosques');
  for(const [id,nombre]of escenas){
   await page.getByRole('button',{name:nombre,exact:true}).click();
   await expect(page.locator('[data-elegir][aria-pressed=true]')).toHaveCount(1);
   await expect(page.locator('[data-paisaje]:not([hidden])')).toHaveAttribute('data-paisaje',id);
  }
  await expect(page.getByRole('button',{name:/Pausar paisaje|Reanudar paisaje/})).toHaveCount(0);
  await expect(page.locator('.recorrido')).toHaveCount(6);
  const nombres=['Geovisor','Geoportal','Avances del POD','Biblioteca Digital','Documentos del POD','Certificados ambientales'];
  const rutas=['geovisor','geoportal','avances-pod','biblioteca','documentos-pod','certificados'];
  for(let i=0;i<6;i++){
   await expect(page.locator('.recorrido').nth(i)).toContainText(nombres[i]);
   await expect(page.locator('.recorrido').nth(i)).toHaveAttribute('href','../../index.html#'+rutas[i]);
  }
  const xs=await page.locator('.recorrido').evaluateAll(es=>es.map(e=>Math.round(e.getBoundingClientRect().x)));
  expect(new Set(xs).size).toBe(width===390?1:3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.sello img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
  await expect(page.locator('.sello')).toBeVisible();
  expect(externas).toEqual([]);expect(errors).toEqual([]);
 });
 test(`propuesta naturalista: rotación exacta cada ocho segundos a ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-11-09T12:00:01Z'));await page.goto('/propuestas/portada-naturalista/');
  const hero=page.locator('.hero');
  await page.clock.fastForward(7999);await expect(hero).toHaveAttribute('data-escena','rios');
  await page.clock.fastForward(1);await expect(hero).toHaveAttribute('data-escena','bosques');
  for(const id of ['territorio','movilidad','rios']){
   await page.clock.fastForward(8000);await expect(hero).toHaveAttribute('data-escena',id);
   await expect(page.locator('[data-elegir][aria-pressed=true]')).toHaveAttribute('data-elegir',id);
   await expect(page.locator('[data-paisaje]:not([hidden])')).toHaveAttribute('data-paisaje',id);
  }
  await expect(page.locator('.descripcion')).toHaveAttribute('aria-live','off');
  await page.clock.fastForward(3900);
  await page.getByRole('button',{name:'Territorio',exact:true}).click();
  await expect(page.locator('.descripcion')).toHaveAttribute('aria-live','polite');
  await page.clock.fastForward(7999);await expect(hero).toHaveAttribute('data-escena','territorio');
  await page.clock.fastForward(1);await expect(hero).toHaveAttribute('data-escena','movilidad');
 });
 test(`propuesta naturalista: movimiento reducido detiene animaciones y rotación a ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-11-09T12:00:01Z'));await page.goto('/propuestas/portada-naturalista/');
  const hero=page.locator('.hero');
  await expect(page.locator('#aviso-reducido')).toBeVisible();
  expect(await hero.evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
  await page.clock.fastForward(32000);await expect(hero).toHaveAttribute('data-escena','rios');
  await page.getByRole('button',{name:'Selva',exact:true}).click();
  await page.clock.fastForward(32000);await expect(hero).toHaveAttribute('data-escena','bosques');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(page.locator('#aviso-reducido')).toBeHidden();
  await expect.poll(()=>hero.evaluate(e=>e.getAnimations({subtree:true}).length)).toBeGreaterThan(0);
  await page.clock.fastForward(7999);await expect(hero).toHaveAttribute('data-escena','bosques');
  await page.clock.fastForward(1);await expect(hero).toHaveAttribute('data-escena','territorio');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#aviso-reducido')).toBeVisible();
  expect(await hero.evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
  await page.clock.fastForward(32000);await expect(hero).toHaveAttribute('data-escena','territorio');
 });
}

test('propuesta naturalista: composiciones, delfines viajeros, aves y viviendas',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/propuestas/portada-naturalista/');
 const imagenes=[];
 for(const [id,nombre]of escenas){
  await page.getByRole('button',{name:nombre,exact:true}).click();
  await expect(page.locator('[data-paisaje]:not([hidden])')).toHaveAttribute('data-paisaje',id);
  imagenes.push((await page.locator('.paisaje').screenshot()).toString('base64'));
 }
 expect(new Set(imagenes).size).toBe(4);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'Ríos',exact:true}).click();
 const ocultas=page.locator('[data-paisaje][hidden]');await expect(ocultas).toHaveCount(3);
 expect(await ocultas.evaluateAll(es=>es.every(e=>e.getAnimations({subtree:true}).length===0))).toBe(true);
 const salto=await page.locator('.salto-delfin').first().evaluate(e=>{
  const a=e.getAnimations()[0];a.pause();const {delay,duration}=a.effect.getTiming();
  const agua=new DOMPoint(0,697).matrixTransform(e.ownerSVGElement.getScreenCTM()).y;
  a.currentTime=delay;const inicio=e.getBoundingClientRect().top;
  a.currentTime=delay+duration*.48;const cima=e.getBoundingClientRect().bottom;
  a.currentTime=delay+duration*.99;const final=e.getBoundingClientRect().top;
  return {agua,inicio,cima,final};
 });
 expect(salto.inicio).toBeGreaterThan(salto.agua);expect(salto.cima).toBeLessThan(salto.agua);expect(salto.final).toBeGreaterThan(salto.agua);
 async function desplazamiento(selector,tiempo){
  return page.locator(selector).first().evaluate((e,t)=>{
   const a=e.getAnimations()[0];a.pause();a.currentTime=0;const inicio=e.getBoundingClientRect().x;
   a.currentTime=t;return e.getBoundingClientRect().x-inicio;
  },tiempo);
 }
 expect(await desplazamiento('.ruta-delfin',8000)).toBeGreaterThan(200);
 await page.getByRole('button',{name:'Selva',exact:true}).click();
 expect(await desplazamiento('.vuelo-guacamayas',8000)).toBeGreaterThan(400);
 const alas=await page.locator('[data-paisaje=bosques] .ala-guacamaya').first().evaluate(e=>{
  const a=e.getAnimations()[0];a.pause();a.currentTime=0;const extendida=e.getBoundingClientRect().height;
  a.currentTime=1200;return extendida-e.getBoundingClientRect().height;
 });
 expect(alas).toBeGreaterThan(10);
 await page.getByRole('button',{name:'Territorio',exact:true}).click();
 await expect(page.locator('.maloca')).toBeVisible();await expect(page.locator('.casa-ribera')).toHaveCount(2);
 for(const casa of await page.locator('.casa-ribera').all())await expect(casa).toBeVisible();
 await page.getByRole('button',{name:'Movilidad fluvial',exact:true}).click();
 expect(await desplazamiento('.bote-travesia',22000)).toBeGreaterThan(200);
});
