const {test,expect}=require('@playwright/test');

for(const width of [1280,390]){
 test(`propuesta naturalista: escenas, teclado y pausa real a ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const errors=[],externas=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();
   externas.push(route.request().url());return route.abort();
  });
  await page.goto('/propuestas/portada-naturalista/');
  const hero=page.locator('.hero'),pausa=page.locator('.pausa');
  await expect(pausa).toHaveAccessibleName('Pausar paisaje');
  // Alcanzar el botón de pausa con Tab, sin focus() ni clic forzado.
  for(let i=0;i<15&&!await pausa.evaluate(e=>e===document.activeElement);i++)await page.keyboard.press('Tab');
  await expect(pausa).toBeFocused();
  expect(await pausa.evaluate(e=>e.matches(':focus-visible'))).toBe(true);
  await page.keyboard.press('Enter');
  await expect(pausa).toHaveAccessibleName('Reanudar paisaje');
  const estados=()=>hero.evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations===Infinity).map(a=>({tiempo:a.currentTime,estado:a.playState})));
  for(const nombre of ['Selva','Territorio','Movilidad fluvial','Ríos']){
   await page.getByRole('button',{name:nombre,exact:true}).click();
   await expect(page.getByRole('button',{name:nombre,exact:true})).toHaveAttribute('aria-pressed','true');
   await expect(page.locator('[data-elegir][aria-pressed=true]')).toHaveCount(1);
   const antes=await estados();expect(antes.length).toBeGreaterThan(0);
   expect(antes.every(a=>a.estado==='paused')).toBe(true);
   await page.waitForTimeout(100);expect(await estados()).toEqual(antes);
  }
  await pausa.press('Space');
  await expect(pausa).toHaveAccessibleName('Pausar paisaje');
  const antes=(await estados())[0].tiempo;
  await expect.poll(async()=>(await estados())[0].tiempo).toBeGreaterThan(antes);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.sello img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
  await expect(page.locator('.sello')).toBeVisible();
  expect(externas).toEqual([]);expect(errors).toEqual([]);
 });
 test(`propuesta naturalista: movimiento reducido inicial y dinámico a ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/propuestas/portada-naturalista/');
  const pausa=page.locator('.pausa'),hero=page.locator('.hero');
  await expect(pausa).toBeDisabled();await expect(pausa).toHaveAccessibleName('Movimiento reducido');
  await expect(page.locator('#aviso-reducido')).toBeVisible();
  expect(await hero.evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(pausa).toBeEnabled();await pausa.click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(pausa).toBeDisabled();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(pausa).toHaveAccessibleName('Reanudar paisaje');
  await expect(hero).toHaveAttribute('data-pausa','true');
 });
}

test('propuesta naturalista: escenas independientes, salto sumergido, alas y navegación',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/propuestas/portada-naturalista/');
 await page.getByRole('button',{name:'Pausar paisaje',exact:true}).click();
 const imagenes=[];
 for(const [id,nombre] of [['rios','Ríos'],['bosques','Selva'],['territorio','Territorio'],['movilidad','Movilidad fluvial']]){
  await page.getByRole('button',{name:nombre,exact:true}).click();
  await expect(page.locator('[data-paisaje]:not([hidden])')).toHaveAttribute('data-paisaje',id);
  const ocultas=page.locator('[data-paisaje][hidden]');await expect(ocultas).toHaveCount(3);
  expect(await ocultas.evaluateAll(es=>es.every(e=>e.getAnimations({subtree:true}).length===0))).toBe(true);
  imagenes.push((await page.locator('.paisaje').screenshot()).toString('base64'));
 }
 expect(new Set(imagenes).size).toBe(4);
 await page.getByRole('button',{name:'Ríos',exact:true}).click();
 const salto=await page.locator('.salto-delfin').first().evaluate(e=>{
  const a=e.getAnimations()[0];a.pause();const desfase=a.effect.getTiming().delay;
  const agua=new DOMPoint(0,697).matrixTransform(e.ownerSVGElement.getScreenCTM()).y;
  a.currentTime=desfase;const inicio=e.getBoundingClientRect().top;
  a.currentTime=desfase+3840;const cima=e.getBoundingClientRect().bottom;
  a.currentTime=desfase+7900;const final=e.getBoundingClientRect().top;
  return {agua,inicio,cima,final};
 });
 expect(salto.inicio).toBeGreaterThan(salto.agua);
 expect(salto.cima).toBeLessThan(salto.agua);
 expect(salto.final).toBeGreaterThan(salto.agua);
 await page.getByRole('button',{name:'Selva',exact:true}).click();
 const alas=await page.locator('[data-paisaje=bosques] .ala-guacamaya').first().evaluate(e=>{
  const a=e.getAnimations()[0];a.pause();a.currentTime=0;const extendida=e.getBoundingClientRect().height;
  a.currentTime=1200;return {extendida,recogida:e.getBoundingClientRect().height};
 });
 expect(alas.extendida-alas.recogida).toBeGreaterThan(10);
 await page.getByRole('button',{name:'Movilidad fluvial',exact:true}).click();
 const viaje=await page.locator('.bote-travesia').evaluate(e=>{
  const a=e.getAnimations()[0];a.pause();a.currentTime=0;const inicio=e.getBoundingClientRect().x;
  a.currentTime=22000;return e.getBoundingClientRect().x-inicio;
 });
 expect(viaje).toBeGreaterThan(200);
});
