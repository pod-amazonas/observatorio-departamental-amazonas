const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib'),{spawnSync}=require('node:child_process');
const {hint}=require('@mapbox/geojsonhint');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'datos/piloto_29');
const catalog=JSON.parse(fs.readFileSync(path.join(folder,'catalogo_entrega.json'),'utf8'));
const check=(dir,extra=[])=>spawnSync('python3',[path.join(root,'scripts/preparar_piloto_29.py'),'--comprobar','--salida',dir,...extra],{encoding:'utf8'});

test('piloto #29: RFC 7946, esquema, huellas y peso declarado',()=>{
 const result=check(folder);expect(result.status,result.stderr).toBe(0);
 expect(catalog.map(x=>x.entidades)).toEqual([11,19,5]);
 for(const row of catalog){
  const bytes=fs.readFileSync(path.join(folder,row.ruta_relativa)),data=JSON.parse(bytes);
  expect(hint(data,{precisionWarning:false}),row.id_capa).toEqual([]);
  expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(row.sha256);
  // El número de bytes gzip depende del compresor; la meta debe coincidir
  // también con la compresión independiente de Node. La huella exacta es del GeoJSON.
  expect(zlib.gzipSync(bytes,{level:6}).length<=row.limite_transferencia_bytes).toBe(row.cumple_meta_transferencia);
  expect(row.simplificacion).toBe(row.id_capa==='division_politico_administrativa');expect(row.reduccion_precision).toBe(false);
 }
});

test('piloto #29: el gate mantiene visibles las dos excepciones de peso aprobadas',()=>{
 const result=check(folder,['--exigir-meta']);expect(result.status,result.stderr).toBe(2);
 expect(result.stdout).toContain('2 superan la meta');
 expect(catalog.filter(x=>x.excepcion_peso_autorizada).map(x=>x.id_capa)).toEqual(['cuencas_hidrograficas','sistema_nacional_de_areas_protegidas']);
});

test('piloto #29: el manifiesto detecta una copia alterada',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'piloto29-'));
 try{
  fs.cpSync(folder,tmp,{recursive:true});
  fs.appendFileSync(path.join(tmp,catalog[0].ruta_relativa),' ');
  const result=check(tmp);expect(result.status).toBe(1);expect(result.stderr).toContain('Huellas incorrectas');
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});

test('piloto #29: adopta solo División 10 m y conserva las entidades completas seleccionadas',()=>{
 const report=JSON.parse(fs.readFileSync(path.join(root,'docs/piloto_29/evaluacion_simplificacion.json'),'utf8'));
 expect(report.candidatos_adoptados).toBe(0);expect(report.adopcion_autorizada).toBe(false);expect(report.ensayos).toHaveLength(9);
 for(const row of report.ensayos)expect(row.adoptado).toBe(false);
 const adoption=JSON.parse(fs.readFileSync(path.join(folder,'adopcion.json'),'utf8'));
 expect(adoption.capas.division_politico_administrativa.sha256_publicado).toBe(report.ensayos.find(x=>x.capa==='division_politico_administrativa'&&x.parametro_m===10).sha256);
 const basins=adoption.capas.cuencas_hidrograficas;expect(basins.ids_interseccion_nativa).toHaveLength(19);expect(basins.huellas_entidades_publicadas).toEqual(basins.huellas_entidades_fieles_seleccionadas);
 expect(adoption.capas.sistema_nacional_de_areas_protegidas.sha256_publicado).toBe(adoption.capas.sistema_nacional_de_areas_protegidas.sha256_fiel_previo);
});

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
for(const size of [{width:1280,height:720},{width:390,height:844}])for(const row of catalog){
 test(`piloto #29: ${row.id_capa}, ${size.width}px, menú bajo demanda, fuente, año, leyenda y controles`,async({page})=>{
  await page.setViewportSize(size);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#geovisor');
  await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);
  await expect(page.locator('[data-citizen-layer]')).toHaveCount(3);
  expect(await page.evaluate(()=>window.obs19Api.getLayers().filter(e=>e.idCitizen).length)).toBe(0);
  const card=page.locator('[data-citizen-layer="'+row.id_capa+'"]');
  await card.evaluate(el=>el.closest('details').open=true);
  await expect(card).toContainText(row.fuente_declarada_encargo+' · '+row.anio_declarado_encargo);
  const cb=card.locator('input[type="checkbox"]');await cb.focus();await cb.press('Space');
  await expect.poll(()=>page.evaluate(id=>window.obs19Api.getLayers().filter(e=>e.idCitizen===id).length,row.id_capa)).toBe(1);
  const result=await page.evaluate(id=>{const entry=window.obs19Api.getLayers().find(e=>e.idCitizen===id);return {count:entry.count,features:entry.layer.getLayers().length,visible:window.obs19Api.getMap().hasLayer(entry.layer),bounds:entry.layer.getBounds().isValid()}},row.id_capa);
  expect(result).toEqual({count:row.entidades,features:row.entidades,visible:true,bounds:true});
  await expect.poll(()=>page.evaluate(id=>{const e=window.obs19Api.getLayers().find(x=>x.idCitizen===id);return window.obs19Api.getMap().getBounds().contains(e.layer.getBounds())},row.id_capa)).toBe(true);
  await expect(page.locator('#v7-dynamic-legend')).toContainText(row.nombre_publico);
  await expect(page.locator('#obs19-stat-detail')).toContainText(row.fuente_declarada_encargo+' · '+row.anio_declarado_encargo);
  const slider=card.locator('input[type="range"]');await slider.fill('80');await slider.dispatchEvent('input');
  expect(await page.evaluate(id=>window.obs19Api.getLayers().find(e=>e.idCitizen===id).layer.getLayers()[0].options.fillOpacity,row.id_capa)).toBeCloseTo(.2*.52);
  await cb.uncheck();await expect(page.locator('#v7-dynamic-legend')).not.toContainText(row.nombre_publico);
  await cb.check();await expect(page.locator('#v7-dynamic-legend')).toContainText(row.nombre_publico);
  await card.locator('button').click();
  expect(await page.evaluate(id=>window.obs19Api.getLayers().filter(e=>e.idCitizen===id).length,row.id_capa)).toBe(1);

 });
}

test('piloto #29: no descarga geometrías al abrir el sitio o desplegar categorías',async({page})=>{
 const requests=[];page.on('request',r=>{if(r.url().includes('/datos/piloto_29/capas/'))requests.push(r.url())});
 await page.goto('/#geovisor');await expect(page.locator('[data-citizen-layer]')).toHaveCount(3);
 await page.locator('#obs19-thematic-tree > details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
 await expect(page.locator('[data-citizen-layer]').first()).toBeVisible();expect(requests).toEqual([]);
});

test('piloto #29: llegada tardía del catálogo conserva el foco y las categorías desplegadas',async({page})=>{
 let release;const held=new Promise(resolve=>release=resolve);
 await page.route('**/datos/piloto_29/catalogo_entrega.json',async route=>{await held;await route.continue()});
 try{
  await page.goto('/#geovisor');const button=page.locator('#obs19-thematic-tree .obs19-topic-button:not([disabled])').first();
  await button.waitFor({state:'attached'});await page.locator('#obs19-thematic-tree details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await button.focus();
  release();await expect(page.locator('[data-citizen-layer]')).toHaveCount(3);await expect(button).toBeFocused();
  expect(await page.locator('#obs19-thematic-tree > details').evaluateAll(nodes=>nodes.every(n=>n.open))).toBe(true);
 }finally{release()}
});

test('piloto #29: fallo de red permite reintentar sin duplicar capas',async({page})=>{
 const row=catalog[0];let hits=0;
 await page.route('**/datos/piloto_29/capas/**',route=>++hits===1?route.fulfill({status:503,body:'No disponible'}):route.continue());
 await page.goto('/#geovisor');const card=page.locator('[data-citizen-layer="'+row.id_capa+'"]');await card.waitFor({state:'attached'});await card.evaluate(el=>el.closest('details').open=true);
 const cb=card.locator('input[type="checkbox"]');await cb.focus();await cb.press('Space');await expect(card.locator('[data-citizen-status]')).toContainText('No se pudo cargar');await expect(cb).not.toBeChecked();
 await cb.check();await expect(card.locator('[data-citizen-status]')).toContainText('Capa visible');expect(hits).toBe(2);
 expect(await page.evaluate(()=>window.obs19Api.getLayers().filter(e=>e.idCitizen).length)).toBe(1);
});

test('piloto #29: cancelar descarga impide activación tardía y conserva foco de teclado',async({page})=>{
 let release;const held=new Promise(resolve=>release=resolve);let started;const requested=new Promise(resolve=>started=resolve);
 await page.route('**/datos/piloto_29/capas/**',async route=>{started();await held;try{await route.continue()}catch{}});
 await page.goto('/#geovisor');const card=page.locator('[data-citizen-layer]').first();await card.waitFor({state:'attached'});await card.evaluate(el=>el.closest('details').open=true);
 const cb=card.locator('input[type="checkbox"]');await cb.focus();await cb.press('Space');await requested;await expect(card.locator('[data-citizen-status]')).toContainText('Cargando');
 await cb.press('Space');release();await expect(cb).not.toBeChecked();await expect(cb).toBeFocused();
 await expect(card.locator('[data-citizen-status]')).toContainText('solo al activarla');
 expect(await page.evaluate(()=>window.obs19Api.getLayers().filter(e=>e.idCitizen).length)).toBe(0);
});
