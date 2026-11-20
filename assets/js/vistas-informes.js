

/* Navegación de vistas e inserción de Power BI desde una URL validada. */
(function(){
 'use strict';
 const topics={
  resumen:{label:'RESUMEN GENERAL',title:'Panorama de seguimiento al POD',desc:'Una vista general de cumplimiento, proyectos e inversión. Los valores se incorporarán desde fuentes institucionales verificadas.',items:[['Cumplimiento de metas','Seguimiento por periodo'],['Proyectos e intervenciones','Distribución por sector'],['Gestión financiera','Ejecución y asignaciones']]},
  metas:{label:'METAS E INDICADORES',title:'Cumplimiento de objetivos y metas',desc:'Exploración prevista de metas del POD, sus indicadores, unidades de medida y evolución en el tiempo.',items:[['Metas del POD','Definición y estado'],['Indicadores priorizados','Evolución temporal'],['Responsables y fuentes','Trazabilidad']]},
  proyectos:{label:'PORTAFOLIO TERRITORIAL',title:'Proyectos e intervenciones del POD',desc:'Organización futura del portafolio de proyectos, sectores de intervención, estados y responsables institucionales.',items:[['Proyectos por sector','Clasificación institucional'],['Estado de las iniciativas','Seguimiento por etapa'],['Proyectos por territorio','Distribución espacial']]},
  inversion:{label:'INVERSIÓN PÚBLICA',title:'Seguimiento a recursos e inversión',desc:'Espacio para examinar las asignaciones, compromisos y ejecución presupuestal vinculados al POD, a partir de reportes aprobados.',items:[['Inversión por línea','Clasificación de recursos'],['Ejecución financiera','Comparación por periodo'],['Fuentes de financiación','Origen y responsable']]},
  territorio:{label:'LECTURA TERRITORIAL',title:'Seguimiento por territorio',desc:'Cruces previstos entre indicadores, proyectos y unidades territoriales, con desagregación según la disponibilidad de datos oficiales.',items:[['Unidades territoriales','Cobertura geográfica'],['Comparación territorial','Indicadores desagregados'],['Articulación con Geovisor','Localización de intervenciones']]}
 };
 function initTabs(){
  const panel=document.getElementById('obs8-topic-panel');
  const tabs=Array.from(document.querySelectorAll('[data-obs8-tab]'));
  function select(tab,focus){
   const type=tab.dataset.obs8Tab;
   const t=topics[type];if(!t)return;
   tabs.forEach(x=>{const active=x===tab;x.classList.toggle('is-selected',active);x.setAttribute('aria-selected',String(active));x.tabIndex=active?0:-1;});
   panel.setAttribute('aria-labelledby',tab.id);
   document.getElementById('obs8-topic-label').textContent=t.label;
   document.getElementById('obs8-topic-title').textContent=t.title;
   document.getElementById('obs8-topic-desc').textContent=t.desc;
   const el=document.getElementById('obs8-topic-items');el.replaceChildren();
   t.items.forEach(item=>{const row=document.createElement('div');row.className='obs8-topic-item';const ico=document.createElement('span');ico.className='obs8-topic-check';ico.textContent='✓';const c=document.createElement('div');const strong=document.createElement('strong');strong.textContent=item[0];const small=document.createElement('small');small.textContent=item[1]+' · Por conectar';c.append(strong,small);row.append(ico,c);el.appendChild(row);});
   if(focus)tab.focus();
  }
  tabs.forEach((tab,i)=>{
   tab.addEventListener('click',()=>select(tab,false));
   tab.addEventListener('keydown',e=>{let next=-1;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next>=0){e.preventDefault();select(tabs[next],true);}});
  });
  if(tabs.length)select(tabs[0],false);
 }
 function normalizePowerBIUrl(text){
  let u;try{u=new URL(text.trim());}catch(e){return {error:'Introduce una URL completa que comience por https://app.powerbi.com/.'};}
  if(u.protocol!=='https:'||u.hostname!=='app.powerbi.com'||u.username||u.password||u.port){return {error:'Por seguridad, solo se aceptan enlaces HTTPS del dominio app.powerbi.com.'};}
  if(u.pathname==='/view'&&u.searchParams.has('r')&&u.searchParams.get('r').trim().length>8){return {url:u.href,mode:'Informe publicado para web'};}
  if(u.pathname==='/reportEmbed'&&u.searchParams.has('reportId')&&u.searchParams.get('reportId').trim().length>8){return {url:u.href,mode:'Inserción segura (puede requerir inicio de sesión)'};}
  return {error:'Utiliza el enlace de inserción de Power BI: /view?r=... o /reportEmbed?reportId=...; no sirve la dirección general del panel.'};
 }
 function initPowerBI(){
  const inp=document.getElementById('obs8-bi-url'),btn=document.getElementById('obs8-bi-preview');
  const frame=document.getElementById('obs8-bi-frame'),empty=document.getElementById('obs8-bi-empty');
  const loaded=document.getElementById('obs8-bi-loaded'),status=document.getElementById('obs8-bi-status');
  const links=document.getElementById('obs8-bi-links'),open=document.getElementById('obs8-bi-open'),clear=document.getElementById('obs8-bi-clear');
  function showStatus(msg,kind){status.textContent=msg;status.classList.remove('is-ok','is-error');if(kind)status.classList.add('is-'+kind);}
  function reset(){frame.removeAttribute('src');open.removeAttribute('href');loaded.hidden=true;links.hidden=true;empty.hidden=false;showStatus('Vista previa cerrada. Puedes consultar otro enlace.',null);}
  btn.addEventListener('click',()=>{
   const res=normalizePowerBIUrl(inp.value);
   if(res.error){showStatus(res.error,'error');inp.focus();return;}
   frame.src=res.url;open.href=res.url;
   empty.hidden=true;loaded.hidden=false;links.hidden=false;
   showStatus('Enlace admitido: '+res.mode+'. Si aparece una pantalla de acceso, revisa permisos y licencias.','ok');
  });
  clear.addEventListener('click',reset);
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();btn.click();}});
 }
 if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>{initTabs();initPowerBI();});}
 else{initTabs();initPowerBI();}
})();

