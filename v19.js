/* Observatorio Amazonas V19: geovisor con determinantes ambientales aprobadas para publicación; trámites administrativos demostrativos. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const CATEGORIES=['Base cartográfica','Componente biofísico','Estructura institucional','Estructura funcional y de servicios','Socioeconómico y cultural','Gestión del riesgo','Ordenamiento territorial'];
let catalog=null, selectedLayer=null, callDraft=[], publicCalls=[];
const getLayers=()=>window.obs19Api?.getLayers?.()||[];
function element(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function legalUrl(v){try{const u=new URL(v);return (u.protocol==='https:'&&u.username===''&&u.password==='')?u.href:null;}catch{return null;}}
function clear(el){if(el)el.replaceChildren();}
function pilotStatus(id){return getLayers().find(x=>x.origin==='Determinantes ambientales · publicación autorizada'&&x.idPilot===id);}
function layersMeta(){return catalog?.grupos?.flatMap(g=>g.capas.map(c=>({...c,group:g.titulo})))||[];}
function renderTree(){const tree=$('obs19-thematic-tree');if(!tree)return;clear(tree);
 CATEGORIES.forEach((cat,i)=>{const outer=element('details');outer.open=i===1;const summary=element('summary','',cat);outer.append(summary);
  if(i===1){const mid=element('details');mid.open=true;mid.append(element('summary','','Determinantes ambientales · 33 capas previstas'));
   const sub=element('div');(catalog?.grupos||[]).forEach(g=>{const details=element('details');const summary=element('summary','',g.titulo+' · '+g.capas.filter(c=>!!c.archivo).length+' disponibles de '+g.capas.length);details.append(summary);g.capas.forEach(c=>{const b=element('button','obs19-topic-button',c.etiqueta||c.nombre||('Determinante '+c.objectid));b.type='button';b.disabled=!c.archivo;b.title=c.archivo?'Activar o desactivar esta capa':'Capa aprobada, pendiente de preparar para web';b.addEventListener('click',()=>togglePilot(c.objectid));details.append(b)});sub.append(details)});
   const p=element('p','obs19-footnote','15 determinantes autorizadas están pendientes de preparación técnica para web.');sub.append(p);mid.append(sub);outer.append(mid)
  }else{outer.append(element('p','obs19-footnote','Categoría estructurada. Capas de esta temática pendientes de incorporación técnica.'))}
 tree.append(outer)})}
function renderPilot(){
 const list=$('obs19-pilot-list');if(!list)return;clear(list);
 const layers=layersMeta();
 if(!layers.length){list.append(element('p','obs19-empty','El catálogo de determinantes todavía no está disponible. Actualiza la página o comprueba la conexión.'));return;}
 layers.forEach(meta=>{
  const current=pilotStatus(meta.objectid);
  const card=element('div','obs20-pilot-card');
  const row=element('label','obs19-pilot-row');
  const cb=element('input');cb.type='checkbox';cb.checked=!!current;cb.disabled=!meta.archivo;
  cb.setAttribute('aria-label','Mostrar u ocultar '+(meta.etiqueta||meta.nombre));
  cb.addEventListener('change',()=>togglePilot(meta.objectid,cb.checked));
  const label=element('span');label.append(element('strong','',meta.etiqueta||meta.nombre||'Sin nombre'),element('small','',meta.group+' · ID '+meta.objectid+(meta.archivo?' · disponible':' · pendiente de preparación web')));
  row.append(cb,label);card.append(row);
  const tools=element('div','obs20-pilot-tools');
  const zoom=element('button','','Zoom a capa ↗');zoom.type='button';zoom.disabled=!meta.archivo;
  zoom.title='Acerca el mapa a esta determinante; si estaba apagada, la activa';
  zoom.addEventListener('click',()=>togglePilot(meta.objectid,true));tools.append(zoom);
  const labelOpacity=element('label','obs20-range-label');
  labelOpacity.append(document.createTextNode('Transparencia'));
  const slider=element('input');slider.type='range';slider.min='0';slider.max='100';slider.step='5';
  slider.disabled=!current;
  slider.value=String(current?100-(current.opacity??65):Math.round(100-100*(meta.opacidadSugerida??.35)));
  slider.setAttribute('aria-label','Transparencia del polígono de '+(meta.etiqueta||meta.nombre));
  slider.title=current?'0% sólido; 100% invisible':'Activa la capa para ajustar su transparencia';
  const val=element('output','',slider.value+'%');
  slider.addEventListener('input',()=>{
   const active=pilotStatus(meta.objectid);if(!active)return;
   active.opacity=100-Number(slider.value);
   active.layer?.setStyle?.({fillOpacity:active.opacity/100*(active.geomType==='Puntos'?1:.52)});
   val.textContent=slider.value+'%';window.obs19RenderStats?.();
  });
  labelOpacity.append(slider,val);tools.append(labelOpacity);card.append(tools);list.append(card);
 });
}
async function togglePilot(id,want){const meta=layersMeta().find(x=>x.objectid===id);if(!meta)return;const current=pilotStatus(id);if(want===undefined)want=!current;
 if(current){if(!want){window.obs19Api.remove(current.id);}else{window.obs19Api.zoom(current.id);}renderPilot();renderStats();return;}
 if(!want)return;
 if(!window.obs19Api?.getMap?.()){location.hash='#geovisor';window.setTimeout(()=>togglePilot(id,true),350);return}
 const url=String(meta.archivo||'');if(!url.startsWith('datos/determinantes_ambientales/')||!url.endsWith('.geojson'))return;
 const row=$('obs19-pilot-list');try{const response=await fetch(encodeURI(url));if(!response.ok)throw Error('Archivo no disponible ('+response.status+').');const data=await response.json();const e=window.obs19Api.add('Det. '+id+' · '+(meta.etiqueta||meta.nombre),data,'Determinantes ambientales · publicación autorizada',true);e.idPilot=id;e.metadata=meta;e.opacity=Math.round((meta.opacidadSugerida||0.35)*100);e.layer.setStyle?.({fillOpacity:e.opacity/100*.52});selectedLayer=e.id;window.obs19Api.redraw();renderPilot();renderStats();}catch(err){renderPilot();if(row){const note=element('p','obs19-empty','No se pudo cargar la capa '+id+': '+String(err.message||err)+'. Abre el prototipo por HTTP.');row.prepend(note)}}}
function getFeatures(d){if(!d)return[];if(d.type==='FeatureCollection')return Array.isArray(d.features)?d.features:[];return d.type==='Feature'?[d]:[{properties:{},geometry:d}]}
function summariseStats(layer){const feats=getFeatures(layer.data),props=feats.map(f=>f.properties||{});const numeric={};const categoric={};props.forEach(p=>Object.entries(p).forEach(([k,v])=>{if(v==null||v==='')return;if(typeof v==='number'&&Number.isFinite(v)){(numeric[k]??=[]).push(v);}else if(typeof v==='string'&&v.length<80&&!/^(objectid|fid|shape_)/i.test(k)){const c=categoric[k]??={};c[v]=(c[v]||0)+1;}}));const group=Object.entries(categoric).filter(([k,counts])=>Object.keys(counts).length>=2&&Object.keys(counts).length<=12).sort((a,b)=>Object.keys(a[1]).length-Object.keys(b[1]).length)[0];return{feats,props,numeric,group}}
function renderStats(){const overview=$('obs19-stat-overview'),detail=$('obs19-stat-detail');if(!overview||!detail)return;clear(overview);clear(detail);
 const active=getLayers().filter(x=>x.visible);const counts=active.reduce((n,e)=>n+(e.count||0),0);const top=element('div','obs19-metrics');[['Capas visibles',active.length],['Registros cargados',counts]].forEach(([lab,val])=>{const d=element('div','obs19-metric');d.append(element('strong','',String(val)),element('small','',lab));top.append(d)});overview.append(top);
 if(!active.length){detail.append(element('div','obs19-empty','Activa una capa desde el panel izquierdo. Se mostrarán estadísticas según sus atributos.'));return}
 if(!active.some(x=>x.id===selectedLayer))selectedLayer=active[0].id;
 const switches=element('div','obs19-layer-switches');active.forEach(e=>{const b=element('button',selectedLayer===e.id?'active':'',e.name.length>28?e.name.slice(0,27)+'…':e.name);b.type='button';b.onclick=()=>{selectedLayer=e.id;renderStats()};switches.append(b)});detail.append(switches);
 const e=active.find(x=>x.id===selectedLayer);const data=summariseStats(e);const card=element('div','obs19-stat-card');card.append(element('h3','',e.name),element('p','','Tipo: '+e.geomType+' · '+data.feats.length+' registros · '+e.origin));
 const p=data.props[0]||{};let displayed=0;for(const [k,v] of Object.entries(p)){if(v==null||String(v)==='')continue;if(displayed++>=9)break;const r=element('div','obs19-attr');r.append(element('span','',k.replaceAll('_',' ')),element('strong','',String(v).slice(0,180)));card.append(r)}
 if(!displayed)card.append(element('p','','No hay atributos textuales disponibles en la capa.'));
 detail.append(card);
 const areaKey=Object.keys(p).find(k=>k.toLowerCase()==='shape_area');const area=areaKey?Number(p[areaKey]):NaN;
 if(Number.isFinite(area)&&area>0){const areaBox=element('div','obs19-stat-card');areaBox.append(element('h3','','Superficie indicada en la fuente'));areaBox.append(element('p','',new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(area/10000)+' hectáreas (valor del atributo Shape_Area, no recalculado ni verificado para publicación).'));detail.append(areaBox)}
 if(data.group){const [key,counts]=data.group;const box=element('div','obs19-stat-card');box.append(element('h3','','Distribución por '+key));const max=Math.max(...Object.values(counts));Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([label,value])=>{const row=element('div','obs19-bar-row');row.append(element('span','',label));const track=element('div','obs19-bar-track');const fill=element('i');fill.style.width=(value/max*100)+'%';track.append(fill);row.append(track,element('strong','',String(value)));box.append(row)});detail.append(box)}
 else{const box=element('div','obs19-stat-card');box.append(element('h3','','Lectura estadística'));box.append(element('p','','Esta capa no contiene suficientes registros o categorías repetidas para un gráfico de distribución confiable. Consulta sus atributos disponibles arriba.'));detail.append(box)}
 const source=element('div','obs19-stat-card');source.append(element('h3','','Fuente y metodología'));source.append(element('p','',e.metadata?.fuenteDeclarada?('Fuente declarada: '+e.metadata.fuenteDeclarada+'. '):'Fuente: capa GeoJSON incorporada al visor. '));source.append(element('p','','Recuentos calculados en el navegador a partir de la capa; no equivalen a cifras aprobadas por la Gobernación.'));detail.append(source)
}
window.obs19MapReady=()=>{renderPilot();renderStats()};window.obs19RenderStats=renderStats;window.obs19SelectLayer=id=>{selectedLayer=id;renderStats()};
function initPartnersMarquee(){
 const track=document.querySelector('.obs19-partner-track');
 if(!track||track.dataset.autoplayReady)return;
 track.dataset.autoplayReady='1';
 track.setAttribute('aria-label','Entidades colaboradoras, carrusel automático. Pasa el cursor para detenerlo.');
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const original=[...track.querySelectorAll('.obs19-partner')];if(original.length<2)return;
 original.forEach(card=>{const clone=card.cloneNode(true);clone.setAttribute('aria-hidden','true');
  clone.tabIndex=-1;clone.querySelectorAll('a,button,input,[tabindex]').forEach(el=>el.tabIndex=-1);
  track.append(clone);
 });
 track.classList.add('obs20-marquee');
 let paused=false,inView=true,last=0,manualUntil=0;
 track.addEventListener('pointerenter',()=>paused=true);
 track.addEventListener('pointerleave',()=>paused=false);
 track.addEventListener('focusin',()=>paused=true);
 track.addEventListener('focusout',e=>{if(!track.contains(e.relatedTarget))paused=false});
 track.addEventListener('wheel',()=>manualUntil=performance.now()+5000,{passive:true});
 track.addEventListener('touchstart',()=>manualUntil=performance.now()+6000,{passive:true});
 if('IntersectionObserver' in window){new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??true},{threshold:0.05}).observe(track)}
 function frame(now){const delta=last?Math.min(80,now-last):0;last=now;
  if(!paused&&inView&&document.visibilityState==='visible'&&now>manualUntil){
   const second=track.children[original.length],first=track.children[0];
   const distance=second&&first?second.offsetLeft-first.offsetLeft:0;
   if(distance>0){track.scrollLeft+=delta*.035;
    if(track.scrollLeft>=distance)track.scrollLeft-=distance;
   }
  }
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}
function initLocation(){const sel=$('obs19-location'),msg=$('obs19-location-message');if(!sel||!msg)return;function display(){const val=sel.value;msg.hidden=val===''||val==='Área no Municipalizada';clear(msg);if(val&&val!=='Área no Municipalizada'){
 const p=element('p');p.append(element('strong','','Orientación para '+val+': '));p.append(document.createTextNode('Para consultar la solicitud de certificado de compatibilidad ambiental en esta jurisdicción, dirígete a la Alcaldía de '+val+'. La Ley 388 de 1997 regula competencias de ordenamiento territorial municipal; la competencia concreta de este trámite debe ser confirmada por la entidad responsable. '));const a=element('a','','Consultar Ley 388 de 1997 ↗');a.href='https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=339';a.target='_blank';a.rel='noopener noreferrer';p.append(a);msg.append(p);msg.append(element('p','','En esta demostración la solicitud departamental continúa únicamente para “Área no Municipalizada”.'))
 }else if(val==='Área no Municipalizada'){msg.hidden=false;msg.append(element('p','','Puedes continuar con el formulario de prueba para áreas no municipalizadas. No constituye radicación oficial.'))}}
 sel.addEventListener('change',display);
 function prevent(e){const target=e.target.closest('[data-cert13-step],#cert13-next');if(!target)return;const desired=target.dataset.cert13Step?Number(target.dataset.cert13Step):1;const at0=!document.querySelector('#view-certificados [data-cert13-panel="0"]')?.hidden; if(at0&&desired>0&&(sel.value!== 'Área no Municipalizada')){e.preventDefault();e.stopImmediatePropagation();if(!sel.value){sel.focus();msg.hidden=false;msg.textContent='Selecciona la ubicación del proyecto para continuar.'}else{display();msg.scrollIntoView({behavior:'smooth',block:'center'})}}}
 $('view-certificados').addEventListener('click',prevent,true);display()}
window.obs19GetDocs=function(){
 const mode=document.querySelector('[name="obs19-doc-mode"]:checked')?.value||'individual';
 const credential=document.querySelector('[name="obs19-acreditacion"]:checked')?.value||'registro';
 const keys=mode==='unificado'?['unificado']:['concertacion','suelo','ambiental'];keys.push(credential,'identidad');
 const labels={unificado:'Documento unificado: concertación, suelo y condiciones ambientales',concertacion:'Acta de concertación',suelo:'Certificado de suelo',ambiental:'Certificado de condiciones ambientales',registro:'Registro de autoridad indígena',acta:'Acta de nombramiento o reconocimiento',identidad:'Identidad de la autoridad indígena'};
 const items=keys.map(k=>({key:k, label:labels[k],file:document.querySelector(`[data-obs19-doc="${k}"]`)?.files?.[0]}));
 return {complete:items.every(x=>!!x.file),types:items.filter(x=>x.file).map(x=>x.label),names:items.filter(x=>x.file).map(x=>x.file.name.slice(0,120))};
};
function initDocuments(){const fields=[...document.querySelectorAll('[data-obs19-doc]')];fields.forEach(f=>f.addEventListener('change',()=>{const file=f.files[0];const sm=f.parentElement.querySelector('.obs19-file-status');if(file&&(!/\.(pdf|png|jpe?g)$/i.test(file.name)||file.size>15*1024*1024)){f.value='';sm.textContent='Formato no válido o tamaño mayor de 15 MB';return}sm.textContent=file?'Archivo de demostración: '+file.name:'Ningún archivo de prueba'}));
 document.querySelectorAll('[name="obs19-doc-mode"]').forEach(x=>x.addEventListener('change',()=>{$('obs19-doc-individual').hidden=x.value==='unificado'&&x.checked;$('obs19-doc-unificado').hidden=x.value==='individual'&&x.checked}));
 document.querySelectorAll('[name="obs19-acreditacion"]').forEach(x=>x.addEventListener('change',()=>{$('obs19-registro').hidden=x.value==='acta'&&x.checked;$('obs19-acta').hidden=x.value==='registro'&&x.checked}));
 // Los nombres de archivos seleccionados se muestran exclusivamente en memoria; no se envían.
 const summary=$('cert13-summary');if(summary){const loc=$('obs19-location');loc?.addEventListener('change',()=>{});}
}
function renderCalls(){const publicEl=$('obs19-opportunities'), admin=$('obs19-admin-calls');if(!publicEl)return;clear(publicEl);const calls=[...publicCalls,...callDraft];if(!calls.length)publicEl.append(element('div','obs19-empty','No hay oportunidades verificadas publicadas en el prototipo.'));
 calls.forEach(v=>{const card=element('article','obs19-call-card');const tag=element('span','kicker',v.tipo==='curso'?'CURSO GRATUITO':'CONVOCATORIA');card.append(tag,element('h3','',v.titulo),element('small','',v.entidad+(v.cierre?' · Cierre: '+v.cierre:'')));if(v.descripcion)card.append(element('p','',v.descripcion));const a=element('a','','Consultar oportunidad ↗');a.href=legalUrl(v.url)||'#';a.target='_blank';a.rel='noopener noreferrer';card.append(a);if(callDraft.includes(v))card.append(element('p','obs19-footnote','Vista previa local; no publicada.'));publicEl.append(card)});
 if(!admin)return;clear(admin);callDraft.forEach((v,i)=>{const row=element('div','obs19-admin-row');row.append(element('span','',v.titulo+' · '+v.tipo));const b=element('button','','Quitar');b.type='button';b.onclick=()=>{callDraft.splice(i,1);renderCalls()};row.append(b);admin.append(row)});if(!callDraft.length)admin.append(element('p','obs19-footnote','No se han añadido oportunidades de prueba.'));
}
function initCalls(){const form=$('obs19-call-form'),button=$('obs19-calls-export');form?.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(form);const row=Object.fromEntries(fd.entries());if(!legalUrl(row.url)){alert('Utiliza una URL HTTPS válida.');return}row.tipo=row.tipo==='curso'?'curso':'convocatoria';callDraft.push(row);form.reset();renderCalls()});button?.addEventListener('click',()=>{const content=JSON.stringify(callDraft,null,2);const a=document.createElement('a'),obj=URL.createObjectURL(new Blob([content],{type:'application/json'}));a.href=obj;a.download='convocatorias_para_revision.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(obj),1500)});
 fetch('convocatorias_publicadas.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(Array.isArray(data))publicCalls=data.filter(x=>x&&['curso','convocatoria'].includes(x.tipo)&&typeof x.titulo==='string'&&legalUrl(x.url)).slice(0,100);renderCalls()}).catch(()=>renderCalls());renderCalls()}
function init(){
 // Reajusta Leaflet cuando el contenedor cambia de altura/anchura.
 const geovisorMap=$('visor-map');
 if(geovisorMap && typeof ResizeObserver==='function'){
  let lastSize='';
  const observer=new ResizeObserver(entries=>{
   const box=entries[0]?.contentRect;
   if(!box || box.width<1 || box.height<1) return;
   const size=Math.round(box.width)+'x'+Math.round(box.height);
   if(size===lastSize) return;
   lastSize=size;
   window.obs19Api?.getMap?.()?.invalidateSize({pan:false});
  });
  observer.observe(geovisorMap);
 }
 initLocation();initDocuments();initCalls();initPartnersMarquee();fetch('catalogo_determinantes_para_geovisor.json').then(r=>{if(!r.ok)throw Error('Catálogo no encontrado');return r.json()}).then(data=>{catalog=data;renderTree();renderPilot()}).catch(()=>{catalog={grupos:[]};renderTree();renderPilot()});
 // Categorías del geoportal llevan a sus capas dentro del visor.
 document.querySelectorAll('#categories-grid').forEach(node=>node.addEventListener('click',e=>{if(e.target.closest('[data-open-theme]'))setTimeout(()=>{const t=$('obs19-thematic-tree');t?.querySelectorAll('details').forEach((d,i)=>d.open=i===1)},120)}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
