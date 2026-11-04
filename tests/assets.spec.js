const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const views={
 inicio:'Observatorio Departamental del Amazonas',
 geovisor:'Geovisor del Amazonas',
 geoportal:'Información territorial por temática',
 'avances-pod':'Seguimiento al cumplimiento del POD',
 certificados:'Certificado de compatibilidad ambiental',
 biblioteca:'Biblioteca Digital',
 'documentos-pod':'Documentos del POD',
 secretaria:'Información para la planeación territorial',
 contacto:'Contacto',
 admin:'Panel institucional colaborativo'
};

test('index sin imágenes base64 ni bloques de estilo incrustados',()=>{
 const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
 expect(source).not.toMatch(/data:image\//i);
 expect(source).not.toMatch(/<style\b/i);
});

for(const prefix of ['/','/observatorio-departamental-amazonas/']){
 test.describe(`recursos extraídos bajo ${prefix}`,()=>{
  test.beforeEach(async({page})=>{
   await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='127.0.0.1'){
     if(u.pathname.endsWith('/config_supabase.js'))return route.fulfill({contentType:'application/javascript',body:'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'});
     if(prefix!=='/'&&u.pathname.startsWith(prefix)){
      const file=path.join(root,decodeURIComponent(u.pathname.slice(prefix.length))||'index.html');
      if(!fs.existsSync(file))return route.fulfill({status:404,body:'No encontrado'});
      return route.fulfill({path:file});
     }
     return route.continue();
    }
    if(u.hostname==='test.invalid')return route.fulfill({json:[]});
    return route.fulfill({status:200,body:'',contentType:'text/plain'});
   });
  });

  test('CSS, imágenes y favicon locales cargan y se decodifican',async({page})=>{
   const failures=[];
   page.on('response',r=>{if(new URL(r.url()).hostname==='127.0.0.1'&&r.status()>=400)failures.push(`${r.status()} ${r.url()}`)});
   page.on('requestfailed',r=>{if(new URL(r.url()).hostname==='127.0.0.1')failures.push(r.url())});
   await page.goto(prefix);
   const styles=await page.locator('link[rel="stylesheet"]').evaluateAll(links=>links.map(l=>({href:l.getAttribute('href'),loaded:!!l.sheet})));
   expect(styles.filter(s=>s.href.startsWith('assets/css/')).length).toBeGreaterThan(0);
   expect(styles.every(s=>s.loaded)).toBe(true);
   const images=new Set(await page.locator('img[src],link[rel="icon"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')||n.getAttribute('href')).filter(src=>!/^https?:\/\//.test(src))));
   for(const style of styles){
    const response=await page.evaluate(async url=>{const r=await fetch(url);return {status:r.status,css:await r.text()}},prefix+style.href);
    expect(response.status,style.href).toBe(200);
    const css=response.css;
    for(const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)){
     const url=new URL(match[1],new URL(prefix+style.href,'http://127.0.0.1:8765'));
     if(url.hostname==='127.0.0.1'&&/\.(?:png|jpe?g|svg|gif|webp|ico|avif)$/i.test(url.pathname))images.add(url.pathname);
    }
   }
   expect(images.size).toBeGreaterThan(0);
   for(const src of images){
    const url=src.startsWith('/')?src:prefix+src;
    // Usa el navegador para comprobar también subrutas atendidas por route.fulfill.
    const result=await page.evaluate(async url=>{
     const response=await fetch(url);
     const img=new Image();img.src=url;
     try{await img.decode();return {status:response.status,decoded:img.naturalWidth>0}}catch{return {status:response.status,decoded:false}}
    },url);
    expect(result,{message:url}).toEqual({status:200,decoded:true});
   }
   expect(failures).toEqual([]);
  });

  test('las diez vistas conservan sus encabezados y no generan errores JavaScript',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.goto(prefix);
   await page.waitForLoadState('networkidle');
   for(const [view,heading] of Object.entries(views)){
    await page.evaluate(view=>{location.hash=view},view);
    const section=page.locator('#view-'+view);
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading',{name:heading,exact:true})).toBeVisible();
    await expect(page.locator('#obs19-pilot-list .obs20-pilot-card')).toHaveCount(33);
    await expect(page.locator('#pod-total')).toHaveText('33');
   }
   expect(errors).toEqual([]);
  });
 });
}
