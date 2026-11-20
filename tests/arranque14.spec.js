const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
// Huellas de los bloques originales en main 2bba3c5, antes de moverlos.
const original='c7c90f9c4dcd7c5c3bf35c330c3afb26b498d965fb570d36bc095aaa547db861';
const siguiente='3ab0ee3b0583d76a24f2f8869f41e32f85a77bb36e380e8b648bccb38eaff7a0';
test('arranque: bytes originales y posición entre publicación y vistas',()=>{
 const body=fs.readFileSync(path.join(root,'assets/js/observatorio.js'));
 expect(body.length).toBe(67024);expect(digest(body)).toBe(original);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
 const matches=scripts.filter(s=>/\bsrc="assets\/js\/observatorio\.js"/.test(s[1]));expect(matches).toHaveLength(1);
 const at=scripts.indexOf(matches[0]);expect(at).toBeGreaterThan(0);
 expect(scripts[at-1][1]).toContain('src="assets/js/version-publica.js"');
 expect(matches[0][1]).not.toMatch(/\b(?:async|defer|type)\b/);expect(matches[0][2]).toBe('');
 const next=scripts[at+1],src=next[1].match(/\bsrc="([^"]+)"/);
 let bytes=Buffer.from(next[2]);
 if(src){const file=path.resolve(root,src[1]);expect(file.startsWith(root+path.sep)).toBe(true);bytes=fs.readFileSync(file)}
 // Sigue siendo válida cuando el bloque siguiente se extraiga sin alterarlo.
 expect(digest(bytes)).toBe(siguiente);
});
for(const prefix of ['/','/observatorio-departamental-amazonas/'])test.describe('arranque bajo '+prefix,()=>{
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
 test('carga clásica, catálogo, navegación y mapa conservados',async({page})=>{
  await page.setViewportSize({width:prefix==='/'?1280:390,height:prefix==='/'?720:844});await page.emulateMedia({reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(prefix+'#inicio');
  const script=page.locator('script[src="assets/js/observatorio.js"]');await expect(script).toHaveCount(1);
  expect(await script.evaluate((s,p)=>!s.async&&!s.defer&&!s.type&&new URL(s.src).pathname===p+'assets/js/observatorio.js',prefix)).toBe(true);
  expect(await page.evaluate(()=>({catalogo:Array.isArray(window.POD_CATALOGO.documents),navegacion:typeof window.viewRoute,mapa:typeof window.obs19Api.getMap}))).toEqual({catalogo:true,navegacion:'function',mapa:'function'});
  await page.goto(prefix+'#documentos-pod');await page.locator('#pod-search').fill('zzzz_ficticio_arranque_14');await expect(page.locator('#pod-doc-list')).toContainText('Intenta con otra palabra');
  await page.goto(prefix+'#geovisor');await expect(page.locator('#visor-map')).toHaveClass(/leaflet-container/);expect(errors).toEqual([]);
 });
});
