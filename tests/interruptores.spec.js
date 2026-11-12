const {test,expect}=require('@playwright/test');
const {abrirCapa}=require('./helpers/geovisor.cjs');
const fs=require('node:fs'),path=require('node:path');
const determinants=require('../catalogo_determinantes_para_geovisor.json').grupos.flatMap(g=>g.capas);
const pilot=require('../datos/piloto_29/catalogo_entrega.json');
const tanda=require('../datos/tanda_1_29/catalogo_entrega.json');
const tanda2=require('../datos/tanda_2_29/catalogo_entrega.json');
const tanda3=require('../datos/tanda_3_29/catalogo_entrega.json');
const available=[...determinants.filter(c=>c.archivo).map(c=>({selector:'[data-determinant-layer="'+c.objectid+'"]',id:c.objectid,kind:'idPilot',count:JSON.parse(fs.readFileSync(path.join(__dirname,'..',c.archivo),'utf8')).features.length})),
 ...pilot.map(c=>({selector:'[data-citizen-layer="'+c.id_capa+'"]',id:c.id_capa,kind:'idCitizen',count:c.entidades})),
 ...tanda.map(c=>({selector:'[data-tanda-layer="'+c.id_capa+'"]',id:c.id_capa,kind:'idCitizen',count:c.entidades,metadata:c})),
 ...tanda2.map(c=>({selector:'[data-tanda2-layer="'+c.id_capa+'"]',id:c.id_capa,kind:'idCitizen',count:c.entidades,metadata:c})),
 ...tanda3.filter(c=>c.estado==='publicable').map(c=>({selector:'[data-tanda3-layer="'+c.id_capa+'"]',id:c.id_capa,kind:'idCitizen',count:c.entidades,metadata:c}))];
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):route.continue();
  return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}});
 });
});

for(const width of [1280,390])test(`menú único: todas las capas con interruptor, texto y teclado a ${width}px`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 const requests=[];page.on('request',r=>{if(r.url().endsWith('.geojson'))requests.push(r.url())});
 await page.goto('/#geovisor');const tree=page.locator('#obs19-thematic-tree');
 await expect(tree.locator('[role="switch"]')).toHaveCount(36+tanda.length+tanda2.length+tanda3.length+1);
 await expect(page.locator('#obs19-pilot-list')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Determinantes ambientales · Capas individuales'})).toHaveCount(0);
 await expect(tree.locator('input[type="checkbox"]')).toHaveCount(0);
 expect(requests).toEqual([]);expect(available).toHaveLength(23+tanda.length+tanda2.length+tanda3.filter(c=>c.estado==='publicable').length);
 for(const pending of determinants.filter(c=>!c.archivo)){
  const card=tree.locator('[data-determinant-layer="'+pending.objectid+'"]');
  await expect(card).toContainText('Pendiente de preparación web');
  await expect(card.locator('[role="switch"]')).toBeDisabled();await expect(card.locator('[role="switch"]')).toHaveAttribute('aria-checked','false');
  await expect(card.locator('[data-layer-zoom]')).toBeDisabled();await expect(card.getByRole('slider',{includeHidden:true})).toBeDisabled();
 }
 for(const [i,def] of available.entries()){
  const card=tree.locator(def.selector);await abrirCapa(card);const sw=card.getByRole('switch'),key=i%2?'Enter':'Space';
  await expect(sw).toHaveAttribute('aria-checked','false');await expect(sw).toHaveText('Apagada');await sw.focus();await sw.press(key);
  await expect(sw).toHaveAttribute('aria-checked','true');await expect(sw).toHaveText('Encendida');await expect(sw).toBeFocused();
  expect(await page.evaluate(def=>{const es=window.obs19Api.getLayers().filter(e=>e[def.kind]===def.id);return {n:es.length,count:es[0]?.count,visible:es.length===1&&window.obs19Api.getMap().hasLayer(es[0].layer)}},def)).toEqual({n:1,count:def.count,visible:true});
  await expect(card.getByRole('slider')).toBeEnabled();
  if(def.metadata){
   const meta=def.metadata;
   await expect(card.locator('xpath=ancestor::details[1]/summary')).toHaveText(meta.categoria);
   await expect(card).toContainText(meta.fuente_declarada_encargo+' · '+meta.anio_declarado_encargo);
   if(def.id==='puerto')await expect(card.getByText('No garantiza acceso público, operación actual ni seguridad de navegación.',{exact:false})).toBeVisible();
   await expect(page.locator('#v7-dynamic-legend')).toContainText(meta.nombre_publico);
  }
  // Las temáticas no reaparecen con una casilla duplicada en archivos locales.
  await expect(page.locator('#local-layer-list input[type="checkbox"]')).toHaveCount(0);
  await sw.press(key);await expect(sw).toHaveAttribute('aria-checked','false');await expect(sw).toHaveText('Apagada');await expect(sw).toBeFocused();
  expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);
 }
});

test('determinante: error de red, reintento y cancelación sin encendido tardío',async({page})=>{
 let hits=0,release;const held=new Promise(resolve=>release=resolve);
 await page.route('**/determinante_01.geojson',async route=>{hits++;if(hits===1)return route.fulfill({status:503,body:'No disponible'});if(hits===2)await held;try{await route.continue()}catch{}});
 try{
  await page.goto('/#geovisor');const card=page.locator('[data-determinant-layer="1"]');await abrirCapa(card);const sw=card.getByRole('switch'),status=card.locator('[data-layer-status]');
  await sw.click();await expect(status).toContainText('No se pudo cargar');await expect(sw).toHaveAttribute('aria-checked','false');
  await sw.click();await expect.poll(()=>hits).toBe(2);await expect(status).toContainText('Cargando');
  await sw.click();release();await expect(sw).toHaveAttribute('aria-checked','false');await expect(status).toContainText('solo al activarla');
  await page.waitForLoadState('networkidle');expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);
  await sw.click();await expect(sw).toHaveAttribute('aria-checked','true');expect(hits).toBe(3);
  expect(await page.evaluate(()=>window.obs19Api.getLayers().filter(e=>e.idPilot===1).length)).toBe(1);
 }finally{release()}
});

test('archivos locales conservan sus controles y Limpiar todas sincroniza los interruptores',async({page})=>{
 await page.goto('/#geovisor');const card=page.locator('[data-determinant-layer="1"]');await abrirCapa(card);await card.getByRole('switch').click();await expect(card.getByRole('switch')).toHaveAttribute('aria-checked','true');
 await page.locator('#load-demo-layers').click();await expect(page.locator('#local-layer-list [data-toggle-layer]')).toHaveCount(3);
 await page.locator('#local-layer-list [data-toggle-layer]').first().uncheck();await expect(card.getByRole('switch')).toHaveAttribute('aria-checked','true');
 await page.locator('#geojson-reset').click();await expect(card.getByRole('switch')).toHaveAttribute('aria-checked','false');await expect(card.getByRole('switch')).toHaveText('Apagada');
 expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(0);await expect(page.locator('#v7-dynamic-legend')).toBeEmpty();
});
