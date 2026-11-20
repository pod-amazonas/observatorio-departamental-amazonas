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

  test('lector Excel: importa un polígono ficticio con JSZip sin enviar archivos',async({page})=>{
   await page.setViewportSize({width:prefix==='/'?1280:390,height:prefix==='/'?720:844});await page.emulateMedia({reducedMotion:'reduce'});
   const writes=[],errors=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url())});page.on('pageerror',e=>errors.push(e.message));
   await page.goto(prefix+'#certificados');
   expect(await page.evaluate(()=>JSZip.version)).toBe('3.10.1');
   expect(await page.evaluate(()=>{const s=document.querySelector('script[src="assets/js/jszip-3.10.1.js"]');return !!s&&s.parentElement===document.head&&!s.async&&!s.defer&&(!s.type||s.type==='text/javascript')})).toBe(true);
   // Libro mínimo y exclusivamente ficticio, con vértices fuera de orden.
   const bytes=await page.evaluate(async()=>{
    const z=new JSZip(),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/package/2006/relationships';
    z.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    z.file('_rels/.rels',`<Relationships xmlns="${rel}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    z.file('xl/workbook.xml',`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Coordenadas" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    z.file('xl/_rels/workbook.xml.rels',`<Relationships xmlns="${rel}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
    const rows=[[3,-3.99,-70],[1,-4,-70],[2,-4,-69.99]];
    z.file('xl/worksheets/sheet1.xml',`<worksheet xmlns="${ns}"><sheetData><row r="1">${['Orden','Latitud','Longitud'].map((v,i)=>`<c r="${'ABC'[i]}1" t="inlineStr"><is><t>${v}</t></is></c>`).join('')}</row>${rows.map((row,i)=>`<row r="${i+2}">${row.map((v,j)=>`<c r="${'ABC'[j]}${i+2}"><v>${v}</v></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`);
    return Array.from(await z.generateAsync({type:'uint8array',compression:'DEFLATE'}));
   });
   await page.locator('#obs19-location').selectOption('Área no Municipalizada');await page.locator('#cert13-name').fill('PROYECTO FICTICIO XLSX');await page.locator('#cert13-desc').fill('Demostración ficticia del lector de coordenadas.');await page.locator('#cert13-sector').selectOption('Otro');await page.locator('#cert13-next').click();
   await page.locator('[name="obs19-doc-mode"][value="unificado"]').check();for(const tipo of ['unificado','registro','identidad'])await page.locator(`[data-obs19-doc="${tipo}"]`).setInputFiles({name:'soporte-ficticio.pdf',mimeType:'application/pdf',buffer:Buffer.from('FICTICIO')});
   await page.locator('#cert13-next').click();await page.locator('[data-cert14-mode="Polygon"]').click();await page.locator('#cert15-xlsx-file').setInputFiles({name:'triángulo-ficticio.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(bytes)});
   await expect(page.locator('#cert15-xlsx-status')).toContainText('Importación completada: 3 vértices');await expect(page.getByRole('spinbutton',{name:'Latitud de vértice 1',exact:true})).toHaveValue('-4');await expect(page.getByRole('spinbutton',{name:'Longitud de vértice 2',exact:true})).toHaveValue('-69.99');
   const wait=page.waitForEvent('download');await page.locator('#cert14-export-geojson').click();const download=await wait;const data=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
   expect(data.features[0].geometry).toEqual({type:'Polygon',coordinates:[[[-70,-4],[-69.99,-4],[-70,-3.99],[-70,-4]]]});expect(writes).toEqual([]);expect(errors).toEqual([]);
  });

  test('CSS, imágenes y favicon locales cargan y se decodifican',async({page})=>{
   const failures=[];
   page.on('response',r=>{if(new URL(r.url()).hostname==='127.0.0.1'&&r.status()>=400)failures.push(`${r.status()} ${r.url()}`)});
   page.on('requestfailed',r=>{if(new URL(r.url()).hostname==='127.0.0.1')failures.push(`${r.failure()?.errorText} ${r.resourceType()} ${r.url()}`)});
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
    await expect(page.locator('#obs19-thematic-tree [data-determinant-layer]')).toHaveCount(33);
    await expect(page.locator('#pod-total')).toHaveText('33');
   }
   expect(errors).toEqual([]);
  });
 });
}
