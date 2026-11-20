const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),digest=b=>crypto.createHash('sha256').update(b).digest('hex');
test('Certificados: bytes originales y orden entre seguimiento y radicados',()=>{
 const bytes=fs.readFileSync(path.join(root,'assets/js/certificados.js'));
 expect(bytes.length).toBe(36604);expect(digest(bytes)).toBe('29f64e094449ddbf48745a8d81ab502e9563a582fc6e1ea124e0f4b2b3faa22a');
 const scripts=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
 const matches=scripts.filter(s=>s[1].includes('src="assets/js/certificados.js"'));expect(matches).toHaveLength(1);
 const at=scripts.indexOf(matches[0]);expect(at).toBeGreaterThan(0);expect(matches[0][1]).not.toMatch(/\b(?:async|defer|type)\b/);expect(matches[0][2]).toBe('\n');
 function content(s){const src=s[1].match(/\bsrc="([^"]+)"/);if(!src)return Buffer.from(s[2]);const file=path.resolve(root,src[1]);expect(file.startsWith(root+path.sep)).toBe(true);return fs.readFileSync(file)}
 expect(scripts[at-1][1]).toContain('src="assets/js/seguimiento-pod.js"');
 expect(digest(content(scripts[at-1]))).toBe('b39e4a49aff6cf56a17dfd35a9c122b9f5f577288e9e5f23ecc7583be68c96e0');
 // Acepta también el vecino extraído, únicamente si conserva todos sus bytes.
 expect(digest(content(scripts[at+1]))).toBe('1b40e0d0c61d2bb14c32a466bbbb286f2e1c4e2f1479cee2b46d94f0455e8d56');
});
for(const prefix of ['/','/observatorio-departamental-amazonas/'])test.describe('Certificados bajo '+prefix,()=>{
 test.beforeEach(async({page})=>{
  await page.route('**/*',r=>{
   const u=new URL(r.request().url());
   if(u.hostname==='127.0.0.1'){
    if(u.pathname.endsWith('/config_supabase.js'))return r.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'});
    if(prefix!=='/'&&u.pathname.startsWith(prefix)){
     const file=path.join(root,decodeURIComponent(u.pathname.slice(prefix.length))||'index.html');return fs.existsSync(file)?r.fulfill({path:file}):r.fulfill({status:404,body:'No encontrado'});
    }
    return r.continue();
   }
   if(u.hostname.endsWith('tile.openstreetmap.org'))return r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});
   return r.fulfill({json:[]});
  });
 });
 test('carga clásica y geometría ficticia sin persistencia ni envío',async({page})=>{
  await page.setViewportSize({width:prefix==='/'?1280:390,height:prefix==='/'?720:844});await page.emulateMedia({reducedMotion:'reduce'});
  const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url())});await page.goto(prefix+'#certificados');
  expect(await page.evaluate(p=>{const s=[...document.scripts].find(s=>s.src?new URL(s.src).pathname.endsWith('/assets/js/certificados.js'):s.textContent.includes('function importGeoJSON(file)'));return !!s&&!s.async&&!s.defer&&!s.type&&(!s.src||new URL(s.src).pathname===p+'assets/js/certificados.js')},prefix)).toBe(true);
  const storage=()=>page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}})),before=await storage();
  await expect(page.getByRole('region',{name:'Formulario de demostración',exact:true})).toContainText('No radica solicitudes, no envía datos y no genera certificados');
  await page.locator('#obs19-location').selectOption('Área no Municipalizada');await page.locator('#cert13-name').fill('PROYECTO_FICTICIO_EXTRACCION');await page.locator('#cert13-desc').fill('Descripción ficticia sin información personal.');await page.locator('#cert13-sector').selectOption('Otro');await page.locator('#cert13-next').click();
  await page.locator('[name="obs19-doc-mode"][value="unificado"]').check();
  for(const tipo of ['unificado','registro','identidad'])await page.locator('[data-obs19-doc="'+tipo+'"]').setInputFiles({name:'FICTICIO_'+tipo+'.pdf',mimeType:'application/pdf',buffer:Buffer.from('Documento ficticio sin datos reales')});
  await page.locator('#cert13-next').click();await expect(page.locator('[data-cert13-panel="2"]')).toBeVisible();await expect(page.locator('#cert13-map')).toHaveClass(/leaflet-container/);
  const upload=page.locator('#cert14-import-geojson');
  await upload.setInputFiles({name:'invalido-ficticio.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify({type:'Point',coordinates:[200,95]}))});await expect(page.locator('#cert13-validation')).toContainText('No se pudo importar');
  const geometry={type:'LineString',coordinates:[[-70,-4],[-70.001,-4.001]]};
  await upload.setInputFiles({name:'linea-ficticia.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify(geometry))});await expect(page.locator('#cert13-map-feedback')).toContainText('GeoJSON importado');
  await expect(page.locator('[data-cert14-mode="LineString"]')).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>window.obs16GetDraft())).toMatchObject({project:'PROYECTO_FICTICIO_EXTRACCION',geometryType:'Línea',vertexCount:2,geometry});
  const pending=page.waitForEvent('download');await page.locator('#cert14-export-geojson').click();const file=await pending;const exported=JSON.parse(await fsp.readFile(await file.path(),'utf8'));
  expect(exported.type).toBe('FeatureCollection');expect(exported.features).toHaveLength(1);expect(exported.features[0].geometry).toEqual(geometry);expect(exported.features[0].properties.advertencia).toContain('NO OFICIAL');
  for(const id of ['obs16-flow','obs17-app','cert16-summary-send'])await expect(page.locator('#'+id)).toBeHidden();
  expect(await storage()).toEqual(before);expect(writes).toEqual([]);expect(errors).toEqual([]);
 });
});
