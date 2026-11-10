// Requiere el servidor local tests/servir_geovisor32.py. No usa Supabase real.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {chromium}=require('playwright');
const determinants=require('../catalogo_determinantes_para_geovisor.json').grupos.flatMap(g=>g.capas);
const pilot=require('../datos/piloto_29/catalogo_entrega.json');
const cases=[...determinants.filter(c=>[1,17].includes(c.objectid)).map(c=>({key:'det-'+c.objectid,id:c.objectid,field:'idPilot',url:c.archivo,count:JSON.parse(fs.readFileSync(c.archivo,'utf8')).features.length})),
 ...pilot.map(c=>({key:'cit-'+c.id_capa,id:c.id_capa,field:'idCitizen',url:'datos/piloto_29/'+c.ruta_relativa,count:c.entidades}))];
const output='docs/geovisor_32';fs.mkdirSync(output+'/vistas',{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chromium'}),results=[];
 try{for(const width of [1280,390])for(const def of cases){
  const context=await browser.newContext({viewport:{width,height:width===390?844:720},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],early=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.geojson'))early.push(r.url())});
  await page.route('**/*',route=>{const u=new URL(route.request().url());
   if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):route.continue();
   if(u.hostname.endsWith('tile.openstreetmap.org'))return route.continue();
   return route.fulfill({json:u.pathname.startsWith('/rest/v1/')?[]:{}});
  });
  await page.goto('http://127.0.0.1:8878/#geovisor');await page.waitForFunction(()=>window.obs19Api?.getMap?.()&&document.querySelectorAll('#obs19-thematic-tree [role="switch"]').length===36);
  const card=page.locator('[data-layer-key="'+def.key+'"]');await card.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true});
  if(early.length)throw Error('Descarga anticipada de geometrías');
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000,connectionType:'cellular3g'});
  const start=await page.evaluate(()=>performance.now()),pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/'+def.url);
  await card.getByRole('switch').click();const response=await pending;if(!response.ok())throw Error('Fallo de descarga');
  const bytes=await response.body(),sha=crypto.createHash('sha256').update(bytes).digest('hex');if(sha!==crypto.createHash('sha256').update(fs.readFileSync(def.url)).digest('hex'))throw Error('Archivo distinto al publicado');
  await page.waitForFunction(def=>window.obs19Api.getLayers().some(e=>e[def.field]===def.id),def);
  const measure=await page.evaluate(async({def,start})=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const entry=window.obs19Api.getLayers().find(e=>e[def.field]===def.id),p=performance.getEntriesByName(location.origin+'/'+def.url).at(-1);return {entidades:entry.count,visible:window.obs19Api.getMap().hasLayer(entry.layer),descarga_ms:p.responseEnd-p.startTime,hasta_dibujo_ms:performance.now()-start,bytes_gzip:p.encodedBodySize,bytes_brutos:p.decodedBodySize}}, {def,start});
  if(!measure.visible||measure.entidades!==def.count||await card.getByRole('switch').getAttribute('aria-checked')!=='true'||errors.length)throw Error('Estado de capa incorrecto: '+JSON.stringify(errors));
  if(def.key==='det-1'||def.key==='cit-division_politico_administrativa'){
   await page.waitForTimeout(1200);await card.screenshot({path:output+'/vistas/'+def.key+'_menu_'+width+'.png'});await page.locator('.map-stage').screenshot({path:output+'/vistas/'+def.key+'_mapa_'+width+'.png'});
  }
  await card.getByRole('switch').click();if(await card.getByRole('switch').getAttribute('aria-checked')!=='false')throw Error('No se apaga la capa');
  results.push({capa:def.key,viewport:{width,height:width===390?844:720},red:{megabits_por_segundo:1.6,latencia_ms:150,cache:'fria'},metodo:'Interruptor del menú; servidor HTTP local con gzip; OSM externo; Supabase y otros servicios simulados',sha256:sha,errores_js:errors,...measure});
  fs.writeFileSync(output+'/red_lenta.json',JSON.stringify(results,null,2)+'\n');console.log(width,def.key,Math.round(measure.hasta_dibujo_ms)+'ms');await context.close();
 }}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
