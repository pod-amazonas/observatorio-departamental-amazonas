const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib'),{spawnSync}=require('node:child_process');
const {hint}=require('@mapbox/geojsonhint');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'datos/piloto_29');
const catalog=JSON.parse(fs.readFileSync(path.join(folder,'catalogo_entrega.json'),'utf8'));
const check=(dir,extra=[])=>spawnSync('python3',[path.join(root,'scripts/preparar_piloto_29.py'),'--comprobar','--salida',dir,...extra],{encoding:'utf8'});

test('piloto #29: RFC 7946, esquema, huellas y peso declarado',()=>{
 const result=check(folder);expect(result.status,result.stderr).toBe(0);
 expect(catalog.map(x=>x.entidades)).toEqual([11,202,5]);
 for(const row of catalog){
  const bytes=fs.readFileSync(path.join(folder,row.ruta_relativa)),data=JSON.parse(bytes);
  expect(hint(data,{precisionWarning:false}),row.id_capa).toEqual([]);
  expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(row.sha256);
  // El número de bytes gzip depende del compresor; la meta debe coincidir
  // también con la compresión independiente de Node. La huella exacta es del GeoJSON.
  expect(zlib.gzipSync(bytes,{level:6}).length<=row.limite_transferencia_bytes).toBe(row.cumple_meta_transferencia);
  expect(row.simplificacion).toBe(false);expect(row.reduccion_precision).toBe(false);
 }
});

test('piloto #29: el gate de peso rechaza la entrega fiel y no oculta el incumplimiento',()=>{
 const result=check(folder,['--exigir-meta']);expect(result.status,result.stderr).toBe(2);
 expect(result.stdout).toContain('3 superan la meta');
 expect(catalog.every(x=>!x.cumple_meta_transferencia&&x.estado.includes('peso_pendiente'))).toBe(true);
});

test('piloto #29: el manifiesto detecta una copia alterada',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'piloto29-'));
 try{
  fs.cpSync(folder,tmp,{recursive:true});
  fs.appendFileSync(path.join(tmp,catalog[0].ruta_relativa),' ');
  const result=check(tmp);expect(result.status).toBe(1);expect(result.stderr).toContain('Huellas incorrectas');
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});

test('piloto #29: evaluación separada sin candidatos adoptados ni datos experimentales publicados',()=>{
 const report=JSON.parse(fs.readFileSync(path.join(root,'docs/piloto_29/evaluacion_simplificacion.json'),'utf8'));
 expect(report.candidatos_adoptados).toBe(0);expect(report.adopcion_autorizada).toBe(false);expect(report.ensayos).toHaveLength(9);
 for(const row of report.ensayos)expect(row.adoptado).toBe(false);
 expect(catalog.every(x=>!x.simplificacion)).toBe(true);
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
 test(`piloto #29: ${row.id_capa}, ${size.width}px, carga por API del catálogo`,async({page})=>{
  await page.setViewportSize(size);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#geovisor');
  await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);
  const result=await page.evaluate(async row=>{
   const res=await fetch('datos/piloto_29/'+row.ruta_relativa);if(!res.ok)throw Error('GeoJSON no disponible');
   const data=await res.json();const e=window.obs19Api.add(row.nombre_origen,data,'Piloto #29 — copia fiel',true);e.metadata={fuenteDeclarada:row.fuente_declarada_encargo};window.obs19SelectLayer(e.id);
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const map=window.obs19Api.getMap(),bounds=e.layer.getBounds();
   return {count:e.count,features:e.layer.getLayers().length,visible:map.hasLayer(e.layer),bounds:bounds.isValid()};
  },row);
  expect(result.count).toBe(row.entidades);expect(result.features).toBe(row.entidades);expect(result.visible).toBe(true);expect(result.bounds).toBe(true);// fitBounds centra en la proyección del mapa, no en la media de latitudes.
  // Lo que debe cumplirse es que el encuadre incluya toda la capa.
  await expect.poll(()=>page.evaluate(name=>{const e=window.obs19Api.getLayers().find(x=>x.name===name);return window.obs19Api.getMap().getBounds().contains(e.layer.getBounds())},row.nombre_origen)).toBe(true);
  await expect(page.locator('#obs19-stat-detail')).toContainText(row.nombre_origen);
  await expect(page.locator('#obs19-stat-overview')).toContainText(String(row.entidades));

 });
}

test('piloto #29: importador local conserva su límite de 15 MiB para Cuencas',async({page})=>{
 await page.goto('/#geovisor');await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);
 const row=catalog.find(x=>x.id_capa==='cuencas_hidrograficas');
 await page.locator('#geojson-upload').setInputFiles(path.join(folder,row.ruta_relativa));
 await expect(page.locator('#local-layer-summary')).toContainText('supera 15 MB');
});
