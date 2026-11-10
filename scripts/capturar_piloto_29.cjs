// Diagnóstico local reproducible. No cambia el sitio ni accede a Supabase real.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');process.chdir(root);
const {chromium}=require(path.join(root,'node_modules/playwright'));
const catalog=JSON.parse(fs.readFileSync('datos/piloto_29/catalogo_entrega.json','utf8'));
const output=path.join(root,'docs/piloto_29/vistas');fs.mkdirSync(output,{recursive:true});
const labels={division_politico_administrativa:'División político administrativa',cuencas_hidrograficas:'Cuencas hidrográficas (fuera de Amazonas también)',sistema_nacional_de_areas_protegidas:'Áreas protegidas — 5 registros'};
(async()=>{const browser=await chromium.launch({channel:'chromium'});const results=[];
for(const width of [1280,390])for(const row of catalog){
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:720},reducedMotion:'reduce',serviceWorkers:'block'});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1'){
   if(u.pathname.endsWith('/config_supabase.js'))return route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'});
   return route.continue();
  }
  if(u.hostname.endsWith('tile.openstreetmap.org'))return route.continue();
  return route.fulfill({json:u.hostname==='test.invalid'&&u.pathname.startsWith('/rest/v1/')?[]:{}});
 });
 await page.goto('http://127.0.0.1:8877/#geovisor');
 await page.waitForFunction(()=>window.obs19Api?.getMap?.()&&document.querySelector('#obs19-pilot-list .obs20-pilot-card'));
 const cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000,connectionType:'cellular3g'});
 const measurement=await page.evaluate(async({row,label})=>{
  const url='/__piloto29/'+row.id_capa+'?fria='+Date.now(),start=performance.now();
  const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('No se pudo cargar capa');
  const buffer=await res.arrayBuffer(),download=performance.now()-start;
  const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(b=>b.toString(16).padStart(2,'0')).join('');if(sha!==row.sha256)throw Error('Descarga no coincide con manifiesto');
  const data=JSON.parse(new TextDecoder().decode(buffer));
  const entry=window.obs19Api.add(label,data,'Piloto de datos — copia fiel para revisión',true);entry.metadata={fuenteDeclarada:row.fuente_declarada_encargo};
  window.obs19SelectLayer(entry.id);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const loaded=performance.now()-start,perf=performance.getEntriesByName(location.origin+url).at(-1);
  return {capa:row.id_capa,entidades:entry.count,paths:entry.layer.getLayers().length,sha256:sha,bytes_gzip:perf?.encodedBodySize??null,bytes_decodificados:buffer.byteLength,descarga_ms:download,hasta_dibujo_ms:loaded,content_encoding:res.headers.get('content-encoding'),visible:window.obs19Api.getMap().hasLayer(entry.layer)};
 },{row,label:labels[row.id_capa]});
 await page.waitForTimeout(2000);
 await page.locator('#visor-map').screenshot({path:path.join(output,row.id_capa+'_'+width+'.png')});
 if(!measurement.visible||measurement.entidades!==row.entidades||errors.length)throw Error(JSON.stringify({measurement,errors}));
 results.push({viewport:{width,height:width===390?844:720},red:{megabits_por_segundo:1.6,latencia_ms:150,cache_capa:'fria'},base:'OpenStreetMap externa; Supabase y otros servicios externos simulados',metodo:'API de carga de GeoJSON que usa el catálogo actual; no se añadió menú público',...measurement,errores_js:errors});
 fs.writeFileSync('docs/piloto_29/carga_red_lenta.json',JSON.stringify(results,null,2)+'\n');
 console.log(width,row.id_capa,Math.round(measurement.hasta_dibujo_ms)+'ms',measurement.bytes_gzip);
 await ctx.close();
}
await browser.close()})().catch(e=>{console.error(e);process.exitCode=1});
