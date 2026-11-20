const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const prefix of ['/','/observatorio-departamental-amazonas/']){
 test.describe(`directorio institucional bajo ${prefix}`,()=>{
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

  test('directorio institucional: datos globales y orden de carga conservados',async({page})=>{
   await page.setViewportSize({width:prefix==='/'?1280:390,height:prefix==='/'?720:844});await page.emulateMedia({reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(prefix+'#inicio');
   const state=await page.evaluate(()=>{
    const script=document.getElementById('obs19-data'),next=script.nextElementSibling;
    return {partners:window.OBS19_PARTNERS.length,departments:window.OBS19_DEPENDENCIAS.length,hasPod:window.OBS19_DEPENDENCIAS.some(row=>row[0]==='POD'&&row[1]==='pod@amazonas.gov.co'),classic:!script.async&&!script.defer&&!script.type,order:next.tagName==='SCRIPT'&&new URL(next.src).pathname.endsWith('/v19.js')&&next.defer};
   });
   expect(state).toEqual({partners:16,departments:13,hasPod:true,classic:true,order:true});
   await page.goto(prefix+'#contacto');await expect(page.locator('#view-contacto .obs19-contact[href="mailto:pod@amazonas.gov.co"]')).toBeVisible();expect(errors).toEqual([]);
  });

 });
}
