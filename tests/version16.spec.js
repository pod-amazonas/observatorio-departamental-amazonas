const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
// Las claves y la matriz siguen en los scripts cargados por el HTML, ahora separados.
const source=fs.readFileSync(path.join(root,'index.html'),'utf8')+'\n'+fs.readFileSync(path.join(root,'assets/js/seguimiento-pod.js'),'utf8');
const publication='Versión inicial · en actualización permanente';
const files=['index.html','v19.js',...fs.readdirSync(path.join(root,'assets/js')).filter(n=>n.endsWith('.js')).map(n=>'assets/js/'+n),...fs.readdirSync(path.join(root,'assets/css')).filter(n=>n.endsWith('.css')).map(n=>'assets/css/'+n)];
const routes=['inicio','geovisor','geoportal','avances-pod','certificados','biblioteca','documentos-pod','secretaria','contacto','admin'];
const internal=/\b(?:V(?:[4-9]|1\d|20)(?:-[A-Z0-9]+)?|piloto)\b/i;
test.beforeEach(async({page})=>{
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1')return u.pathname.endsWith('/config_supabase.js')?r.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}):r.continue();return r.fulfill({json:[]})});
});
test('publicación: una fuente de etiqueta y comentarios sin nombres internos',()=>{
 const texts=files.map(f=>({f,text:fs.readFileSync(path.join(root,f),'utf8')}));
 expect(texts.filter(r=>r.text.includes(publication)).map(r=>r.f)).toEqual(['assets/js/version-publica.js']);
 for(const {f,text}of texts){
  const comments=[...text.matchAll(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g)].map(m=>m[0]);
  comments.push(...text.split('\n').filter(l=>/^\s*\/\//.test(l)));
  for(const c of comments)expect(c,f).not.toMatch(internal);
  expect(text,f).not.toContain('pod_logo_portada');
 }
 for(const n of ['pod_logo_portada.jpg','pod_logo_portada.png'])expect(fs.existsSync(path.join(root,n))).toBe(false);
 for(const key of ['observatorio_amazonas_v11_seguimiento_demo','OBS_AMAZONAS_DEMO_V16_SESSION','observatorio-amazonas-v11-demo'])expect(source).toContain(key);
});
for(const width of [1280,390])test('publicación configurable: títulos, avisos y vistas sin nombres internos a '+width,async({page})=>{
 const changed='Edición de ensayo · actualización configurada';
 await page.setViewportSize({width,height:width===390?844:720});await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/assets/js/version-publica.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'assets/js/version-publica.js'),'utf8').replace(publication,changed)}));
 await page.goto('/#inicio');
 for(const route of routes){
  await page.goto('/#'+route);await expect(page).toHaveTitle(new RegExp(changed));
  // Las versiones de documentos de origen son datos, no nombres internos
  // del software. Se conservan sus títulos literales en el catálogo.
  let text=await page.locator('#view-'+route).innerText();
  for(const name of await page.evaluate(()=>window.POD_CATALOGO.documents.map(d=>d.name)))text=text.replaceAll(name,'[Documento de origen]');
  expect(text).not.toMatch(internal);
 }
 for(const el of await page.locator('[data-publicacion]').all())expect(await el.textContent()).toBe(await el.getAttribute('data-publicacion')==='corta'?'Edición de ensayo':changed);
 await page.goto('/#geovisor');await expect(page.locator('.side-info')).toContainText(changed);expect(await page.locator('body').innerText()).not.toContain(publication);
 await page.goto('/V20_FORMULARIO_BORRADORES/recuperar_contrasena_v20.html');expect(await page.title()).not.toMatch(internal);expect(await page.locator('body').innerText()).not.toMatch(internal);
});
test('compatibilidad: conserva los datos ficticios en las claves existentes',async({page})=>{
 const matrix=JSON.parse(source.match(/const DATA=(\[.*?\]);/)[1]),meta=matrix[0].metas[0].id;
 const progress=JSON.stringify({version:3,progreso:{[meta]:{valor:40,modo:'porcentaje',estado:'Aprobado',evidencias:[{estado:'Aprobada',nombre:'Soporte ficticio',url:'https://example.invalid/ficticio.pdf'}]}},auditoria:[]});
 const entry=JSON.stringify([{id:'DEMO-FICTICIO-16',status:'Recibida',created:'2020-01-01T00:00:00Z',project:'Proyecto ficticio',sector:'Otro',geometryType:'punto',vertexCount:1,docNames:[],supportTypes:[],history:[]}]);
 await page.addInitScript(({progress,entry})=>{localStorage.setItem('observatorio_amazonas_v11_seguimiento_demo',progress);sessionStorage.setItem('OBS_AMAZONAS_DEMO_V16_SESSION',entry)},{progress,entry});
 await page.goto('/#avances-pod');await expect(page.locator('#obs9-ind-detail')).toContainText('Cálculo de este navegador (no oficial):');
 for(const route of ['certificados','admin','inicio'])await page.goto('/#'+route);
 expect(await page.evaluate(()=>localStorage.getItem('observatorio_amazonas_v11_seguimiento_demo'))).toBe(progress);
 expect(await page.evaluate(()=>sessionStorage.getItem('OBS_AMAZONAS_DEMO_V16_SESSION'))).toBe(entry);
 await expect(page.locator('#obs16-flow')).toBeHidden();await expect(page.locator('#obs17-app')).toBeHidden();
});
