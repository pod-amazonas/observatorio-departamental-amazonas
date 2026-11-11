const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {abrirCapa}=require('./helpers/geovisor.cjs');
const folder=path.join(__dirname,'../datos/indicadores_29');
const data=require('../datos/indicadores_29/municipios.json');
test('indicadores: tabla pequeña, códigos únicos y geometría base intacta',()=>{
 const root=path.join(__dirname,'..'),bytes=fs.readFileSync(path.join(folder,'municipios.json'));
 expect(bytes.length).toBeLessThan(1_000_000);expect(zlib.gzipSync(bytes).length).toBeLessThan(1_000_000);
 const geometry=fs.readFileSync(path.join(root,data.geometria_base));
 expect(crypto.createHash('sha256').update(geometry).digest('hex')).toBe(data.sha256_geometria_base);
 const codes=JSON.parse(geometry).features.map(f=>f.properties.MpCodigo).sort();
 expect(data.municipios.map(row=>row.codigo).sort()).toEqual(codes);
 expect(new Set(codes).size).toBe(11);
 expect(fs.readdirSync(folder).some(name=>name.endsWith('.geojson'))).toBe(false);
 for(const row of data.municipios){
  expect(row).not.toHaveProperty('geometry');expect(row).not.toHaveProperty('coordinates');
  expect(Object.keys(row.valores).sort()).toEqual(data.indicadores.map(field=>field.campo).sort());
 }
 expect(data.indicadores.find(field=>field.campo==='IPM')).toMatchObject({anio:2018,unidad:'% (rango)'});
 expect(data.indicadores.find(field=>field.campo==='Indi_Salud')).toMatchObject({anio:2020,unidad:'por confirmar',definicion:'por confirmar'});
 const entries=fs.readFileSync(path.join(folder,'SHA256SUMS'),'utf8').trim().split('\n').map(line=>line.split('  '));
 expect(entries.map(([,name])=>name).sort()).toEqual(fs.readdirSync(folder).filter(name=>name!=='SHA256SUMS').sort());
 for(const [hash,name] of entries)expect(crypto.createHash('sha256').update(fs.readFileSync(path.join(folder,name))).digest('hex')).toBe(hash);
});
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):route.continue();
  return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}});
 });
});
async function consult(page){
 const card=page.locator('#indicadores-municipales');await abrirCapa(card);
 const button=card.getByRole('button',{name:'Consultar indicadores municipales'});await expect(button).toBeEnabled();await button.click();return card;
}
for(const width of [1280,390])test('indicadores: consulta por código y popup con metadatos a '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto('/#geovisor');await expect(page.locator('#indicadores-municipales')).toHaveCount(1);
 expect(requests.filter(url=>url.endsWith('/municipios.json'))).toEqual([]);
 const card=await consult(page);await expect(card.getByRole('status')).toContainText('Selecciona una unidad');
 const code=data.municipios.find(row=>row.valores.Indi_Salud===0).codigo;
 await page.evaluate(code=>{
  const entry=window.obs19Api.getLayers().find(e=>e.idCitizen==='division_politico_administrativa');
  entry.layer.getLayers().find(layer=>layer.feature.properties.MpCodigo===code).getElement().dataset.pruebaIndicador='unidad';
 },code);
 const polygon=page.locator('[data-prueba-indicador="unidad"]');await polygon.focus();await polygon.press('Enter');
 const popup=page.locator('.leaflet-popup');
 await expect(popup).toBeVisible();
 await expect.poll(async()=>{
  const p=await popup.boundingBox(),m=await page.locator('#visor-map').boundingBox();
  return p.y>=m.y-1&&p.y+p.height<=m.y+m.height+1&&p.x>=m.x-1&&p.x+p.width<=m.x+m.width+1;
 }).toBe(true);
 await expect(popup.locator('[data-indicator-code]')).toHaveAttribute('data-indicator-code',code);
 await expect(popup).toContainText('Unidad: por confirmar');await expect(popup).toContainText('Año: 2018');
 await expect(popup).toContainText('Año: 2020');await expect(popup).toContainText('Valor: 0');await expect(popup).toContainText('Definición: por confirmar');
 expect(requests.filter(url=>url.endsWith('/municipios.json'))).toHaveLength(1);
 expect(requests.filter(url=>url.endsWith('.geojson'))).toHaveLength(1);
 expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(1);
});
test('indicadores: error de descarga permite reintentar sobre la misma División',async({page})=>{
 let hits=0;await page.route('**/datos/indicadores_29/municipios.json',route=>++hits===1?route.fulfill({status:503,body:'No disponible'}):route.continue());
 await page.goto('/#geovisor');let card=await consult(page);await expect(card.getByRole('status')).toContainText('Puedes reintentar');
 card=await consult(page);await expect(card.getByRole('status')).toContainText('Selecciona una unidad');
 expect(await page.evaluate(()=>window.obs19Api.getLayers().length)).toBe(1);
});
test('indicadores: rechaza códigos duplicados sin asociar datos a otra unidad',async({page})=>{
 const broken=structuredClone(data);broken.municipios[1].codigo=broken.municipios[0].codigo;
 await page.route('**/datos/indicadores_29/municipios.json',route=>route.fulfill({json:broken}));
 await page.goto('/#geovisor');const card=await consult(page);await expect(card.getByRole('status')).toContainText('duplicado');
});
