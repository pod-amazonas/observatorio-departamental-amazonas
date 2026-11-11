const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{gzipSync}=require('node:zlib'),{spawnSync}=require('node:child_process');
const {hint}=require('@mapbox/geojsonhint');
const {abrirCapa}=require('./helpers/geovisor.cjs');
const root=path.join(__dirname,'..'),dir=path.join(root,'datos/tanda_3_29');
const catalog=require('../datos/tanda_3_29/catalogo_entrega.json');
const available=catalog.filter(c=>c.estado==='publicable'),pending=catalog.filter(c=>c.estado==='pendiente');
const sha=b=>createHash('sha256').update(b).digest('hex');

test('tanda 3: manifiesto completo, campos públicos, puntos RFC 7946 y exclusiones explícitas',()=>{
 const manifest=fs.readFileSync(path.join(dir,'SHA256SUMS'),'utf8').trim().split('\n').map(s=>s.split('  '));
 const actual=fs.readdirSync(dir,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()&&e.name!=='SHA256SUMS').map(e=>path.relative(dir,path.join(e.parentPath??e.path,e.name)).split(path.sep).join('/')).sort();
 expect(manifest.map(([,p])=>p).sort()).toEqual(actual);
 for(const [hash,file] of manifest)expect(sha(fs.readFileSync(path.join(dir,file))),file).toBe(hash);
 expect(available.map(c=>c.id_capa)).toEqual(['equipamientos_publicos','centros_poblados']);
 const quality=require('../datos/tanda_3_29/validacion.json');
 for(const meta of available){
  const b=fs.readFileSync(path.join(dir,meta.ruta_relativa)),data=JSON.parse(b);
  expect(b.length).toBe(meta.bytes);expect(sha(b)).toBe(meta.sha256);
  expect(b.length).toBeLessThan(1_000_000);expect(gzipSync(b,{level:6}).length).toBeLessThan(1_000_000);
  expect(hint(data,{precisionWarning:false})).toEqual([]);expect(data.features).toHaveLength(meta.entidades);
  expect(data.features.every(f=>f.geometry.type==='Point'&&f.geometry.coordinates.length===2&&Object.keys(f.properties).sort().join()===meta.campos_publicos.slice().sort().join())).toBe(true);
  expect(quality[meta.id_capa]).toMatchObject({recorte:false,simplificacion:false,redondeo:false,validez_geos_origen_y_salida:true,geometria_igual_a_copia_auditada:true,atributos_publicos_iguales_a_copia_auditada:true});
  expect(data.features.map(f=>f.id)).toEqual(quality[meta.id_capa].ids_publicados);
  expect(quality[meta.id_capa].residuo_inverso_max_m_capa).toBeLessThan(0.000001);
  expect([...new Set(data.features.map(f=>f.properties[meta.campo_leyenda]))].sort()).toEqual(meta.leyenda.map(x=>x.valor).sort());
  for(const item of meta.leyenda)expect(data.features.filter(f=>f.properties[meta.campo_leyenda]===item.valor)).toHaveLength(item.entidades);
 }
 const equip=JSON.parse(fs.readFileSync(path.join(dir,'capas/equipamientos_publicos.geojson')));
 expect(equip.features).toHaveLength(25);expect(equip.features.every(f=>!['Defensa y Seguridad','Bienestar Social','Educaciòn'].includes(f.properties.TIPO_EQUI))).toBe(true);
 expect(equip.features.every(f=>!/^Colegio$|^Cancha/i.test(f.properties.NOMBRE))).toBe(true);
 const centers=JSON.parse(fs.readFileSync(path.join(dir,'capas/centros_poblados.geojson')));
 expect(centers.features).toHaveLength(11);expect(new Set(centers.features.map(f=>f.properties.COD_CPOB)).size).toBeLessThan(11);
 expect(centers.features.map(f=>f.id)).toEqual(Array.from({length:11},(_,i)=>i+1));
 expect(pending.map(c=>c.id_capa)).toEqual(['cobertura_uso_tierra_clc','usos_pot_municipales']);
 expect(fs.readdirSync(path.join(dir,'capas')).sort()).toEqual(['centros_poblados.geojson','equipamientos_publicos.geojson']);
 const result=spawnSync('python3',['scripts/preparar_tanda3_29.py','--comprobar'],{cwd:root,encoding:'utf8'});
 expect(result.status,result.error?.message||result.stderr||result.stdout).toBe(0);
});

test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):route.continue();
  return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}});
 });
});
for(const width of [1280,390])test(`tanda 3: carga diferida, leyendas reales, consulta de puntos y controles a ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 const requests=[];page.on('request',r=>{if(r.url().includes('/tanda_3_29/capas/'))requests.push(r.url())});
 await page.goto('/#geovisor');await expect(page.locator('[data-tanda3-layer]')).toHaveCount(4);expect(requests).toEqual([]);
 for(const meta of available){
  const card=page.locator('[data-tanda3-layer="'+meta.id_capa+'"]');await abrirCapa(card);
  await expect(card).toContainText(meta.fuente_declarada_encargo+' · '+meta.anio_declarado_encargo);
  for(const item of meta.leyenda)await expect(card.getByRole('list',{name:'Leyenda de '+meta.nombre_publico})).toContainText(item.valor+' · '+item.entidades);
  const sw=card.getByRole('switch');await sw.focus();await sw.press('Space');await expect(sw).toHaveAttribute('aria-checked','true');
  const info=await page.evaluate(id=>{const e=window.obs19Api.getLayers().find(e=>e.idCitizen===id);return {count:e.count,styles:e.layer.getLayers().map(l=>({value:l.feature.properties[e.metadata.campo_leyenda],color:l.options.fillColor})),name:e.layer.getLayers()[0].getElement().getAttribute('aria-label')}},meta.id_capa);
  expect(info.count).toBe(meta.entidades);for(const style of info.styles)expect(style.color).toBe(meta.leyenda.find(x=>x.valor===style.value).color);
  const point=page.getByRole('button',{name:info.name,exact:true}).first();await point.focus();await point.press('Enter');
  const popup=page.locator('.leaflet-popup');await expect(popup).toBeVisible();await expect(popup).toContainText(meta.fuente_declarada_encargo);
  await expect.poll(()=>page.evaluate(()=>{const p=document.querySelector('.leaflet-popup').getBoundingClientRect(),m=window.obs19Api.getMap().getContainer().getBoundingClientRect();return p.left>=m.left-1&&p.right<=m.right+1&&p.top>=m.top-1&&p.bottom<=m.bottom+1}),{message:'La ventana debe quedar completa dentro del mapa después del desplazamiento de Leaflet'}).toBe(true);
  await page.locator('.leaflet-popup-close-button').click();await card.getByRole('slider').fill('50');await expect(card.locator('output')).toHaveText('50%');
  await card.getByRole('button',{name:'Zoom a capa '+meta.nombre_publico,exact:true}).click();await sw.click();await expect(sw).toHaveText('Apagada');
 }
 expect(requests).toHaveLength(2);
 for(const meta of pending){
  const card=page.locator('[data-tanda3-layer="'+meta.id_capa+'"]');await abrirCapa(card);await expect(card).toContainText('Pendiente');
  await expect(card.getByRole('switch')).toBeDisabled();await expect(card.getByRole('button')).toBeDisabled();await expect(card.getByRole('slider')).toBeDisabled();
 }
 await expect(page.locator('[data-tanda3-layer="cobertura_uso_tierra_clc"]')).toContainText('La cobertura observada no equivale al uso permitido');
});

test('tanda 3: error visible y reintento desde el mismo interruptor',async({page})=>{
 let hits=0;await page.route('**/equipamientos_publicos.geojson',route=>++hits===1?route.fulfill({status:503,body:'No disponible'}):route.continue());
 await page.goto('/#geovisor');const card=page.locator('[data-tanda3-layer="equipamientos_publicos"]');await abrirCapa(card);const sw=card.getByRole('switch');
 await sw.click();await expect(card.locator('[data-layer-status]')).toContainText('No se pudo cargar');await expect(sw).toHaveAttribute('aria-checked','false');
 await sw.click();await expect(sw).toHaveAttribute('aria-checked','true');expect(hits).toBe(2);
});
