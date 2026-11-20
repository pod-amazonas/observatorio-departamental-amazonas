const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
test('vistas: bytes originales y orden entre arranque y seguimiento',()=>{
 const bytes=fs.readFileSync(path.join(root,'assets/js/vistas-informes.js'));
 expect(bytes.length).toBe(6006);expect(digest(bytes)).toBe('3ab0ee3b0583d76a24f2f8869f41e32f85a77bb36e380e8b648bccb38eaff7a0');
 const scripts=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
 const matches=scripts.filter(s=>/\bsrc="assets\/js\/vistas-informes\.js"/.test(s[1]));expect(matches).toHaveLength(1);
 const at=scripts.indexOf(matches[0]);expect(at).toBeGreaterThan(0);expect(matches[0][1]).not.toMatch(/\b(?:async|defer|type)\b/);expect(matches[0][2]).toBe('');
 function content(s){
  const src=s[1].match(/\bsrc="([^"]+)"/);if(!src)return Buffer.from(s[2]);
  const file=path.resolve(root,src[1]);expect(file.startsWith(root+path.sep)).toBe(true);return fs.readFileSync(file);
 }
 // Identifica los vecinos por contenido, también cuando sean archivos externos.
 expect(digest(content(scripts[at-1]))).toBe('c7c90f9c4dcd7c5c3bf35c330c3afb26b498d965fb570d36bc095aaa547db861');
 expect(digest(content(scripts[at+1]))).toBe('b39e4a49aff6cf56a17dfd35a9c122b9f5f577288e9e5f23ecc7583be68c96e0');
});
for(const prefix of ['/','/observatorio-departamental-amazonas/'])test.describe('vistas e informes bajo '+prefix,()=>{
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
   if(u.hostname==='app.powerbi.com')return r.fulfill({contentType:'text/html',body:'<!doctype html><p>Informe ficticio: respuesta simulada.</p>'});
   return r.fulfill({json:[]});
  });
 });
 test('carga clásica, validación de enlaces y cierre de informe ficticio',async({page})=>{
  await page.setViewportSize({width:prefix==='/'?1280:390,height:prefix==='/'?720:844});await page.emulateMedia({reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(prefix+'#avances-pod');
  const mode=await page.evaluate(p=>{
   const s=[...document.scripts].find(s=>s.src?new URL(s.src).pathname.endsWith('/assets/js/vistas-informes.js'):s.textContent.includes('function normalizePowerBIUrl('));
   return {classic:!!s&&!s.async&&!s.defer&&!s.type,path:!!s&&(!s.src||new URL(s.src).pathname===p+'assets/js/vistas-informes.js')};
  },prefix);expect(mode).toEqual({classic:true,path:true});
  const input=page.locator('#obs8-bi-url'),button=page.locator('#obs8-bi-preview'),frame=page.locator('#obs8-bi-frame'),status=page.locator('#obs8-bi-status');
  for(const url of ['https://app.powerbi.com.ejemplo.invalid/view?r=FICTICIO_14','http://app.powerbi.com/view?r=FICTICIO_14','https://app.powerbi.com/']){
   await input.fill(url);await button.click();await expect(status).toHaveClass(/is-error/);expect(await frame.getAttribute('src')).toBeNull();
  }
  for(const suffix of ['/view?r=INFORME_FICTICIO_14','/reportEmbed?reportId=INFORME_FICTICIO_14']){
   const url='https://app.powerbi.com'+suffix;await input.fill(' '+url+' ');await input.press('Enter');await expect(status).toHaveClass(/is-ok/);await expect(frame).toHaveAttribute('src',url);await expect(page.locator('#obs8-bi-open')).toHaveAttribute('href',url);
   await frame.scrollIntoViewIfNeeded();await expect(page.frameLocator('#obs8-bi-frame').getByText('Informe ficticio: respuesta simulada.',{exact:true})).toBeVisible();
   await page.locator('#obs8-bi-clear').click();expect(await frame.getAttribute('src')).toBeNull();await expect(page.locator('#obs8-bi-empty')).toBeVisible();await expect(status).toContainText('Vista previa cerrada');
  }
  expect(errors).toEqual([]);
 });
});
