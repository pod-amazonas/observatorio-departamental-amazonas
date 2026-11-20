const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),key='OBS_AMAZONAS_DEMO_V16_SESSION';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
test('radicados: bytes originales y orden entre Certificados y puente',()=>{
 const bytes=fs.readFileSync(path.join(root,'assets/js/radicados-locales.js'));
 expect(bytes.length).toBe(8140);expect(digest(bytes)).toBe('1b40e0d0c61d2bb14c32a466bbbb286f2e1c4e2f1479cee2b46d94f0455e8d56');
 const scripts=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
 const matches=scripts.filter(s=>s[1].includes('src="assets/js/radicados-locales.js"'));expect(matches).toHaveLength(1);
 const at=scripts.indexOf(matches[0]);expect(at).toBeGreaterThan(0);expect(matches[0][1]).not.toMatch(/\b(?:async|defer|type)\b/);expect(matches[0][2]).toBe('\n');
 function content(s){const src=s[1].match(/\bsrc="([^"]+)"/);if(!src)return Buffer.from(s[2]);const file=path.resolve(root,src[1]);expect(file.startsWith(root+path.sep)).toBe(true);return fs.readFileSync(file)}
 // Los vecinos se identifican por sus bytes, estén en línea o ya extraídos.
 expect(digest(content(scripts[at-1]))).toBe('29f64e094449ddbf48745a8d81ab502e9563a582fc6e1ea124e0f4b2b3faa22a');
 expect(digest(content(scripts[at+1]))).toBe('a4489395910bd9d7986effdc7577bf1647f3959c891ba103a08c216c8570cd37');
});
for(const prefix of ['/','/observatorio-departamental-amazonas/'])test.describe('radicados archivados bajo '+prefix,()=>{
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
 test('carga clásica y eventos conservados sin reactivar la interfaz',async({page})=>{
  await page.setViewportSize({width:prefix==='/'?1280:390,height:prefix==='/'?720:844});await page.emulateMedia({reducedMotion:'reduce'});
  const record={id:'DEMO-FICTICIO-EXTRACCION',created:'2020-01-01T00:00:00Z',project:'PROYECTO_FICTICIO_RADICADOS',sector:'Otro',geometryType:'Punto',vertexCount:1,docNames:[],supportTypes:[],status:'Recibida',history:[]};
  const initial=JSON.stringify([record]);await page.addInitScript(({key,initial})=>sessionStorage.setItem(key,initial),{key,initial});
  const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url())});await page.goto(prefix+'#inicio');
  expect(await page.evaluate(p=>{const s=[...document.scripts].find(s=>s.src?new URL(s.src).pathname.endsWith('/assets/js/radicados-locales.js'):s.textContent.includes("const STATES=['Recibida'"));return !!s&&!s.async&&!s.defer&&!s.type&&(!s.src||new URL(s.src).pathname===p+'assets/js/radicados-locales.js')},prefix)).toBe(true);
  const beforeLocal=await page.evaluate(()=>({...localStorage}));
  // Se prueba el evento existente sin quitar hidden/inert ni habilitar controles archivados.
  await page.evaluate(id=>{document.getElementById('obs16-code').value=id;window.dispatchEvent(new CustomEvent('obs17-record-changed'))},record.id);
  await expect(page.locator('#obs16-total')).toHaveText('1 en sesión');await expect(page.locator('#obs16-queue > button')).toHaveCount(1);await expect(page.locator('#obs16-queue')).toContainText(record.project);
  const result=page.locator('#obs16-citizen-result');await expect(result).toContainText(record.project);await expect(result).toContainText('Recibida');expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBe(initial);
  const changed=JSON.stringify([{...record,status:'Revisión documental',history:[{at:'2020-01-02T00:00:00Z',status:'Revisión documental',note:'NOTA_FICTICIA_DE_EXTRACCION'}]}]);
  await page.evaluate(({key,changed})=>{sessionStorage.setItem(key,changed);window.dispatchEvent(new CustomEvent('obs17-record-changed'))},{key,changed});
  await expect(result).toContainText('Revisión documental');await expect(result).toContainText('NOTA_FICTICIA_DE_EXTRACCION');await expect(page.locator('#obs16-queue > button')).toHaveCount(1);await expect(page.locator('#obs16-queue')).toContainText('Revisión documental');
  for(const id of ['obs16-flow','obs17-app','admin-entry']){await expect(page.locator('#'+id)).toBeHidden();await expect(page.locator('#'+id)).toHaveAttribute('inert','')}
  expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBe(changed);expect(await page.evaluate(()=>({...localStorage}))).toEqual(beforeLocal);expect(writes).toEqual([]);expect(errors).toEqual([]);
 });
});
