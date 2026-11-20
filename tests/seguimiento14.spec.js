const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),key='observatorio_amazonas_v11_seguimiento_demo';
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
function content(s){
 const src=s[1].match(/\bsrc="([^"]+)"/);if(!src)return Buffer.from(s[2]);
 const file=path.resolve(root,src[1]);expect(file.startsWith(root+path.sep)).toBe(true);return fs.readFileSync(file);
}
const script=scripts.find(s=>s[1].includes('src="assets/js/seguimiento-pod.js"')||s[2].includes("const KEY='"+key+"'"));
const matrix=JSON.parse(content(script).toString('utf8').match(/const DATA=(\[.*?\]);/)[1]);
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
test('seguimiento: bytes originales y orden entre vistas y Certificados',()=>{
 const bytes=fs.readFileSync(path.join(root,'assets/js/seguimiento-pod.js'));
 expect(bytes.length).toBe(53593);expect(digest(bytes)).toBe('b39e4a49aff6cf56a17dfd35a9c122b9f5f577288e9e5f23ecc7583be68c96e0');
 const matches=scripts.filter(s=>s[1].includes('src="assets/js/seguimiento-pod.js"'));expect(matches).toHaveLength(1);
 const at=scripts.indexOf(matches[0]);expect(at).toBeGreaterThan(0);expect(matches[0][1]).not.toMatch(/\b(?:async|defer|type)\b/);expect(matches[0][2]).toBe('\n');
 expect(scripts[at-1][1]).toContain('src="assets/js/vistas-informes.js"');
 expect(digest(content(scripts[at-1]))).toBe('3ab0ee3b0583d76a24f2f8869f41e32f85a77bb36e380e8b648bccb38eaff7a0');
 // Sigue verificando el vecino aunque Certificados se extraiga después.
 expect(digest(content(scripts[at+1]))).toBe('29f64e094449ddbf48745a8d81ab502e9563a582fc6e1ea124e0f4b2b3faa22a');
});
for(const prefix of ['/','/observatorio-departamental-amazonas/'])test.describe('seguimiento bajo '+prefix,()=>{
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
   return r.fulfill({json:[]});
  });
 });
 test('carga clásica, filtros y avances ficticios conservados',async({page})=>{
  await page.setViewportSize({width:prefix==='/'?1280:390,height:prefix==='/'?720:844});await page.emulateMedia({reducedMotion:'reduce'});
  const seed=JSON.stringify({version:3,progreso:Object.fromEntries(matrix[0].metas.map(m=>[m.id,{valor:40,modo:'porcentaje',estado:'Aprobado',evidencias:[{estado:'Aprobada',nombre:'Soporte ficticio de extracción',url:'https://example.invalid/soporte-ficticio.pdf'}]}])),auditoria:[]});
  await page.addInitScript(({key,seed})=>localStorage.setItem(key,seed),{key,seed});
  const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url())});await page.goto(prefix+'#avances-pod');
  expect(await page.evaluate(({prefix,key})=>{const s=[...document.scripts].find(s=>s.src?new URL(s.src).pathname.endsWith('/assets/js/seguimiento-pod.js'):s.textContent.includes("const KEY='"+key+"'"));return !!s&&!s.async&&!s.defer&&!s.type&&(!s.src||new URL(s.src).pathname===prefix+'assets/js/seguimiento-pod.js')},{prefix,key})).toBe(true);
  const rows=page.locator('#obs9-ind-list > button'),detail=page.locator('#obs9-ind-detail'),search=page.locator('#obs9-search');
  await expect(rows).toHaveCount(57);await expect(page.locator('#obs9-apuestas > details')).toHaveCount(4);
  await expect(page.locator('#obs9-complete')).toHaveText('1 / 57');await expect(page.locator('#obs9-overall')).toHaveText('40 %');
  await expect(detail).toContainText('Cálculo de este navegador (no oficial): 40 %');await expect(detail.getByRole('link',{name:/Soporte ficticio de extracción/})).toHaveCount(matrix[0].metas.length);
  await rows.nth(1).click();await expect(detail.locator('h3')).toHaveText(matrix[1].nombre);
  await search.fill('zzzz_ficticio_seguimiento14');await expect(rows).toHaveCount(0);await expect(page.locator('#obs9-ind-list')).toContainText('No se encontraron indicadores con estos filtros');
  await search.fill('');await page.locator('#obs9-filter-state').selectOption('completo');await expect(rows).toHaveCount(1);await expect(detail.locator('h3')).toHaveText(matrix[0].nombre);
  await page.locator('#obs9-filter-state').selectOption('');await page.locator('#obs9-filter-apuesta').selectOption(matrix[0].apuesta);await expect(rows).toHaveCount(matrix.filter(d=>d.apuesta===matrix[0].apuesta).length);
  await expect(page.locator('#obs9-admin-panel')).toBeHidden();expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(seed);expect(writes).toEqual([]);expect(errors).toEqual([]);
 });
});
