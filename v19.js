/* Observatorio Amazonas V19: geovisor con determinantes ambientales aprobadas para publicación; trámites administrativos demostrativos. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const CATEGORIES=['Base cartográfica','Componente biofísico','Estructura institucional','Estructura funcional y de servicios','Socioeconómico y cultural','Gestión del riesgo','Ordenamiento territorial'];
let catalog=null, citizenCatalog=[], tandaCatalog=[], selectedLayer=null, callDraft=[], publicCalls=[];
const layerState=new Map();
let indicatorData=null, indicatorLoading=false;
const getLayers=()=>window.obs19Api?.getLayers?.()||[];
function element(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function legalUrl(v){try{const u=new URL(v);return (u.protocol==='https:'&&u.username===''&&u.password==='')?u.href:null;}catch{return null;}}
function clear(el){if(el)el.replaceChildren();}
function layersMeta(){return catalog?.grupos?.flatMap(g=>g.capas.map(c=>({...c,group:g.titulo})))||[];}
function determinant(meta){
 const label=meta.etiqueta||meta.nombre||('Determinante '+meta.objectid);
 return {key:'det-'+meta.objectid,kind:'determinant',id:meta.objectid,label,name:'Det. '+meta.objectid+' · '+label,available:!!meta.archivo,url:meta.archivo,
  description:meta.group+' · ID '+meta.objectid+' · '+(meta.archivo?'Disponible':'Pendiente de preparación web'),
  source:meta.fuenteDeclarada||'Fuente indicada en los atributos',restriction:'',opacity:Math.round((meta.opacidadSugerida??.35)*100),metadata:meta};
}
function citizen(meta){
 const tanda=Boolean(meta.categoria);
 return {key:'cit-'+meta.id_capa,kind:'citizen',id:meta.id_capa,label:meta.nombre_publico,name:meta.nombre_publico,available:true,tanda,url:(tanda?'datos/tanda_1_29/':'datos/piloto_29/')+meta.ruta_relativa,
 description:meta.fuente_declarada_encargo+' · '+meta.anio_declarado_encargo+' · '+meta.entidades+' entidades',source:meta.fuente_declarada_encargo+' · '+meta.anio_declarado_encargo,
 restriction:meta.restricciones,opacity:65,metadata:{...meta,fuenteDeclarada:meta.fuente_declarada_encargo+' · '+meta.anio_declarado_encargo},
 color:tanda&&/^#[0-9a-f]{6}$/i.test(meta.color)?meta.color:{division_politico_administrativa:'#a34a06',cuencas_hidrograficas:'#156f99',sistema_nacional_de_areas_protegidas:'#177749'}[meta.id_capa]};}
function activeLayer(def){return getLayers().find(e=>def.kind==='citizen'?e.idCitizen===def.id:e.idPilot===def.id&&e.origin==='Determinantes ambientales · publicación autorizada')}
function layerCard(def){
 const card=element('div','obs20-pilot-card obs32-layer-card');card.dataset.layerKey=def.key;
 if(def.tanda)card.dataset.tandaLayer=def.id;else if(def.kind==='citizen')card.dataset.citizenLayer=def.id;else card.dataset.determinantLayer=String(def.id);
 const title=element('h4','obs32-layer-title',def.label);card.append(title,element('p','obs32-layer-description',def.description));
 const control=element('button','obs32-layer-switch');control.type='button';control.setAttribute('role','switch');control.setAttribute('aria-checked','false');
 control.setAttribute('aria-label','Mostrar u ocultar '+def.label);control.disabled=!def.available;
 const track=element('span','obs32-switch-track');track.setAttribute('aria-hidden','true');control.append(track,element('span','obs32-switch-state','Apagada'));
 control.addEventListener('click',()=>{const state=layerState.get(def.key);toggleLayer(def,state?.loading?!state.want:!activeLayer(def)?.visible)});
 card.append(control);
 if(def.restriction)card.append(element('p','obs19-footnote',def.restriction));
 const status=element('p','obs19-footnote');status.id='estado-'+def.key;status.dataset.layerStatus=def.key;status.setAttribute('role','status');
 if(def.kind==='citizen')status.dataset.citizenStatus=def.id;
 control.setAttribute('aria-describedby',status.id);card.append(status);
 const tools=element('div','obs20-pilot-tools'),zoom=element('button','','Zoom a capa ↗');zoom.type='button';zoom.disabled=!def.available;zoom.dataset.layerZoom=def.key;
 zoom.setAttribute('aria-label','Zoom a capa '+def.label);zoom.addEventListener('click',()=>toggleLayer(def,true));tools.append(zoom);
 const opacity=element('label','obs20-range-label');opacity.append(document.createTextNode('Transparencia'));
 const slider=element('input');slider.type='range';slider.min='0';slider.max='100';slider.step='5';slider.disabled=true;
 slider.setAttribute('aria-label',(def.kind==='citizen'?'Transparencia de ':'Transparencia del polígono de ')+def.label);const output=element('output');
 slider.addEventListener('input',()=>{const entry=activeLayer(def);if(!entry)return;entry.opacity=100-Number(slider.value);entry.layer.setStyle({fillOpacity:entry.opacity/100*(entry.geomType==='Puntos'?1:.52)});output.textContent=slider.value+'%';window.obs19Api.redraw()});
 opacity.append(slider,output);tools.append(opacity);card.append(tools);return card;
}
function renderTree(){const tree=$('obs19-thematic-tree');if(!tree)return;clear(tree);
 CATEGORIES.forEach((cat,i)=>{const outer=element('details');outer.open=i===1;outer.append(element('summary','',cat));
  if(i===1){const mid=element('details');mid.open=true;mid.append(element('summary','','Determinantes ambientales · 33 capas previstas'));
   (catalog?.grupos||[]).forEach(g=>{const details=element('details');details.append(element('summary','',g.titulo+' · '+g.capas.filter(c=>!!c.archivo).length+' disponibles de '+g.capas.length));
    g.capas.forEach(c=>details.append(layerCard(determinant({...c,group:g.titulo}))));mid.append(details)});
   if(!catalog?.grupos?.length)mid.append(element('p','obs19-empty','El catálogo de determinantes no está disponible. Comprueba la conexión y actualiza la página.'));
   const pending=layersMeta().filter(c=>!c.archivo).length;
   mid.append(element('p','obs19-footnote',pending+' determinantes pendientes de preparación web.'));outer.append(mid);
  }else if(i!==0){outer.append(element('p','obs19-footnote','Categoría estructurada. Capas de esta temática pendientes de incorporación técnica.'))}
  const mount=element('div');mount.dataset.citizenCategory=String(i);outer.append(mount);
  tree.append(outer);
 });renderCitizenLayers();syncLayerControls();
}
function renderCitizenLayers(){
 [...citizenCatalog,...tandaCatalog].forEach(meta=>{
  const category=meta.categoria?CATEGORIES.indexOf(meta.categoria):(meta.id_capa==='division_politico_administrativa'?0:1);
  const mount=document.querySelector('[data-citizen-category="'+category+'"]');
  const def=citizen(meta);
  if(mount&&!mount.querySelector('[data-layer-key="'+def.key+'"]'))mount.append(layerCard(def));
  if(mount&&def.tanda)mount.parentElement.querySelector(':scope > .obs19-footnote')?.remove();
 });renderIndicatorsAction();syncLayerControls();
}
function renderIndicatorsAction(){
 const mount=document.querySelector('[data-citizen-category="4"]');
 if(!mount)return;
 let card=$('indicadores-municipales');
 if(!card){
  card=element('div','obs20-pilot-card obs32-layer-card');card.id='indicadores-municipales';
  card.append(element('h4','obs32-layer-title','Indicadores municipales'));
  card.append(element('p','obs19-footnote','Consulta servicios públicos, pobreza, salud y educación en cada unidad territorial.'));
  const button=element('button','ghost-button','Consultar indicadores municipales');button.type='button';button.id='consultar-indicadores';
  button.addEventListener('click',openMunicipalIndicators);
  const status=element('p','obs19-footnote');status.id='estado-indicadores';status.setAttribute('role','status');
  card.append(button,status);mount.append(card);
  mount.parentElement.querySelector(':scope > .obs19-footnote')?.remove();
 }
 $('consultar-indicadores').disabled=indicatorLoading||!citizenCatalog.some(meta=>meta.id_capa==='division_politico_administrativa');
}
async function openMunicipalIndicators(){
 if(indicatorLoading)return;
 indicatorLoading=true;
 const button=$('consultar-indicadores'),status=$('estado-indicadores');
 button.disabled=true;status.textContent='Cargando indicadores…';
 try{
  const meta=citizenCatalog.find(row=>row.id_capa==='division_politico_administrativa');
  if(!meta)throw Error('El catálogo de División aún está cargando');
  const def=citizen(meta);
  await toggleLayer(def,true);
  const entry=activeLayer(def);
  if(!entry)throw Error('Activa División político-administrativa y vuelve a intentarlo');
  let data=indicatorData;
  if(!data){
   const response=await fetch('datos/indicadores_29/municipios.json');
   if(!response.ok)throw Error('Datos de indicadores no disponibles ('+response.status+')');
   data=await response.json();
  }
  if(!Array.isArray(data.municipios)||!Array.isArray(data.indicadores))throw Error('Tabla de indicadores incorrecta');
  const byCode=new Map();
  for(const row of data.municipios){
   if(typeof row.codigo!=='string'||byCode.has(row.codigo)||!row.valores)throw Error('Código municipal incorrecto o duplicado');
   byCode.set(row.codigo,row);
  }
  const features=getFeatures(entry.data);
  if(byCode.size!==features.length||features.some(feature=>!byCode.has(String(feature.properties?.MpCodigo))))throw Error('Los códigos no coinciden con División');
  if(activeLayer(def)!==entry)throw Error('La capa se apagó durante la consulta; vuelve a activarla');
  const map=window.obs19Api.getMap();
  map.invalidateSize({pan:false});
  const mapSize=map.getSize();
  const popupOptions={maxHeight:Math.min(320,Math.max(80,mapSize.y-120)),maxWidth:Math.min(320,Math.max(100,mapSize.x-120)),autoPanPaddingTopLeft:[45,10],autoPanPaddingBottomRight:[10,35]};
  entry.layer.eachLayer(layer=>{
   const props=layer.feature.properties;
   const record=byCode.get(String(props.MpCodigo));
   layer.bindPopup(()=>{
    const box=element('div');box.dataset.indicatorCode=String(props.MpCodigo);
    box.append(element('h3','',props.MpNombre),element('p','','División político-administrativa · representación simplificada'));
    for(const field of data.indicadores){
     const section=element('section');section.append(element('strong','',field.nombre));
     const value=record.valores[field.campo];
     section.append(element('p','','Valor: '+(value===null||value===undefined?'Sin dato':String(value))));
     section.append(element('p','','Año: '+field.anio+' · Unidad: '+field.unidad));
     section.append(element('p','','Definición: '+field.definicion));
     section.append(element('p','','Fuente: '+field.fuente));box.append(section);
    }
    return box;
   },popupOptions);
   const node=layer.getElement();
   if(node){
    node.setAttribute('tabindex','0');node.setAttribute('role','button');
    node.setAttribute('aria-label','Indicadores de '+props.MpNombre);
    node.onkeydown=event=>{
     if(event.key==='Enter'||event.key===' '){event.preventDefault();layer.openPopup()}
    };
   }
  });
  indicatorData=data;
  status.textContent='Selecciona una unidad del mapa para ver sus indicadores. Las definiciones pendientes están rotuladas «por confirmar».';
 }catch(error){status.textContent='No se pudieron consultar los indicadores: '+String(error.message||error)+'. Puedes reintentar.'}
 finally{indicatorLoading=false;button.disabled=false}
}
function syncLayerControls(){
 const defs=[...layersMeta().map(determinant),...[...citizenCatalog,...tandaCatalog].map(citizen)];
 defs.forEach(def=>{
  const card=document.querySelector('[data-layer-key="'+def.key+'"]');if(!card)return;
  const entry=activeLayer(def),state=layerState.get(def.key),loading=!!state?.loading,on=!!entry?.visible;
  const control=card.querySelector('[role="switch"]');control.setAttribute('aria-checked',String(on));control.setAttribute('aria-busy',String(loading));
  card.querySelector('.obs32-switch-state').textContent=on?'Encendida':'Apagada';
  card.querySelector('[data-layer-status]').textContent=!def.available?'Pendiente de preparación web.':state?.error||(loading?'Cargando capa… Pulsa el interruptor para cancelar.':on?'Capa visible · '+def.source:'Se descarga solo al activarla.');
  const slider=card.querySelector('input[type="range"]');slider.disabled=!on;slider.value=String(100-(entry?.opacity??def.opacity));slider.nextElementSibling.textContent=slider.value+'%';
  if(def.kind==='citizen')document.querySelectorAll('#v7-dynamic-legend .v7-legend-tag').forEach(tag=>{if(tag.title===def.name)tag.classList.add('pilot29-legend')});
 });
}
async function waitForMap(signal){
 const deadline=performance.now()+8000;
 while(!window.obs19Api?.getMap?.()){
  if(signal.aborted)throw new DOMException('Carga cancelada','AbortError');
  if(performance.now()>deadline)throw Error('No se pudo iniciar el mapa');
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 if(signal.aborted)throw new DOMException('Carga cancelada','AbortError');
}
async function toggleLayer(def,want){
 if(!def.available)return;
 let state=layerState.get(def.key);if(!state){state={want:false};layerState.set(def.key,state)}
 state.want=want;state.error='';const current=activeLayer(def);
 if(!want){state.controller?.abort();state.loading=false;if(current)window.obs19Api.remove(current.id);syncLayerControls();return}
 if(current){window.obs19Api.zoom(current.id);syncLayerControls();return}
 if(state.loading)return;
 const controller=new AbortController();state.controller=controller;state.loading=true;syncLayerControls();
 try{
  if(!window.obs19Api?.getMap?.())location.hash='#geovisor';
  await waitForMap(controller.signal);
  const valid=def.tanda?/^datos\/tanda_1_29\/capas\/[a-z0-9_]+\.geojson$/:def.kind==='citizen'?/^datos\/piloto_29\/capas\/(01_base_cartografica|02_componente_biofisico)\/[a-z0-9_]+\.geojson$/:/^datos\/determinantes_ambientales\/[A-Z0-9_]+\/determinante_\d{2}\.geojson$/;
  if(!valid.test(def.url))throw Error('Ruta de capa no autorizada');
  let data=state.data;
  if(!data){const response=await fetch(def.url,{signal:controller.signal});if(!response.ok)throw Error('Archivo no disponible ('+response.status+')');data=await response.json()}
  if(controller.signal.aborted||!state.want)return;
  // Conserva el caché del piloto; las determinantes se liberan al quitarlas.
  if(def.kind==='citizen')state.data=data;
  const entry=window.obs19Api.add(def.name,data,def.kind==='citizen'?def.source+(def.tanda?' · publicación autorizada':' · piloto autorizado'):'Determinantes ambientales · publicación autorizada',true);
  if(def.kind==='citizen')entry.idCitizen=def.id;else entry.idPilot=def.id;
  entry.metadata=def.metadata;entry.opacity=def.opacity;if(def.color)entry.color=def.color;
  entry.layer.setStyle({color:entry.color,fillColor:entry.color,fillOpacity:entry.opacity/100*.52});selectedLayer=entry.id;window.obs19Api.redraw();
 }catch(error){if(error.name!=='AbortError'&&state.controller===controller){state.want=false;state.error='No se pudo cargar la capa: '+String(error.message||error)+'. Vuelve a encenderla para reintentar.'}}
 finally{if(state.controller===controller){state.loading=false;syncLayerControls()}}
}
function getFeatures(d){if(!d)return[];if(d.type==='FeatureCollection')return Array.isArray(d.features)?d.features:[];return d.type==='Feature'?[d]:[{properties:{},geometry:d}]}
function summariseStats(layer){const feats=getFeatures(layer.data),props=feats.map(f=>f.properties||{});const numeric={};const categoric={};props.forEach(p=>Object.entries(p).forEach(([k,v])=>{if(v==null||v==='')return;if(typeof v==='number'&&Number.isFinite(v)){(numeric[k]??=[]).push(v);}else if(typeof v==='string'&&v.length<80&&!/^(objectid|fid|shape_)/i.test(k)){const c=categoric[k]??={};c[v]=(c[v]||0)+1;}}));const group=Object.entries(categoric).filter(([k,counts])=>Object.keys(counts).length>=2&&Object.keys(counts).length<=12).sort((a,b)=>Object.keys(a[1]).length-Object.keys(b[1]).length)[0];return{feats,props,numeric,group}}
function renderStats(){syncLayerControls();const overview=$('obs19-stat-overview'),detail=$('obs19-stat-detail');if(!overview||!detail)return;clear(overview);clear(detail);
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
window.obs19MapReady=()=>{syncLayerControls();renderStats()};window.obs19RenderStats=renderStats;window.obs19SelectLayer=id=>{selectedLayer=id;renderStats()};
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
 initLocation();initDocuments();initCalls();initPartnersMarquee();fetch('catalogo_determinantes_para_geovisor.json').then(r=>{if(!r.ok)throw Error('Catálogo no encontrado');return r.json()}).then(data=>{catalog=data;renderTree()}).catch(()=>{catalog={grupos:[]};renderTree()});
 fetch('datos/piloto_29/catalogo_entrega.json').then(r=>{if(!r.ok)throw Error('Catálogo piloto no disponible');return r.json()}).then(data=>{citizenCatalog=data;renderCitizenLayers()}).catch(()=>{const tree=$('obs19-thematic-tree');tree?.append(element('p','obs19-empty','No se pudo cargar el catálogo del piloto. Comprueba la conexión y actualiza la página.'))});
 fetch('datos/tanda_1_29/catalogo_entrega.json').then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).then(data=>{tandaCatalog=data;renderCitizenLayers()}).catch(()=>{$('obs19-thematic-tree')?.append(element('p','obs19-empty','No se pudo cargar el catálogo de la tanda 1.'))});
 // Categorías del geoportal llevan a sus capas dentro del visor.
 document.querySelectorAll('#categories-grid').forEach(node=>node.addEventListener('click',e=>{if(e.target.closest('[data-open-theme]'))setTimeout(()=>{const t=$('obs19-thematic-tree');t?.querySelectorAll('details').forEach((d,i)=>d.open=i===1)},120)}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
