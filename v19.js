/* Observatorio Amazonas V19: geovisor con determinantes ambientales aprobadas para publicación; trámites administrativos demostrativos. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const CATEGORIES=['Base cartográfica','Componente biofísico','Estructura institucional','Estructura funcional y de servicios','Socioeconómico y cultural','Gestión del riesgo','Ordenamiento territorial'];
let tileReaderReady=null;
let catalog=null, citizenCatalog=[], tandaCatalog=[], tanda2Catalog=[], tanda3Catalog=[], tanda4Catalog=[], tanda5Catalog=[], selectedLayer=null, callDraft=[], publicCalls=[];
const layerState=new Map();
let indicatorData=null, indicatorLoading=false;const tableCache=new Map();
const TABLE4=[{id:'estado_servicios_anm',categoria:3,nombre:'Servicios públicos en áreas no municipalizadas'}];
const getLayers=()=>window.obs19Api?.getLayers?.()||[];
function element(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function legalUrl(v){try{const u=new URL(v);return (u.protocol==='https:'&&u.username===''&&u.password==='')?u.href:null;}catch{return null;}}
function clear(el){if(el)el.replaceChildren();}
// Presentación ciudadana: las fuentes y los datos originales permanecen intactos.
const VIEWS53={
 drenaje_sencillo:['Drenaje sencillo','Referencia de ríos y corrientes de agua.','IGAC','2022','No es una ruta navegable certificada ni informa seguridad de navegación.'],
 vias_y_caminos:['Vías y caminos','Referencias de conexiones terrestres.','© colaboradores de OpenStreetMap','Compilación 2022','No garantiza transitabilidad, acceso público ni estado actual.'],
 division_politico_administrativa:['División territorial','Municipios y áreas no municipalizadas de Amazonas.','IGAC','2022','Representación simplificada; no sirve para delimitar un predio ni medir con precisión.'],
 cuencas_hidrograficas:['Cuencas hidrográficas','Áreas por las que el agua drena hacia los ríos.','IDEAM','2022','Algunas se extienden fuera del departamento. No son rondas hídricas.'],
 sistema_nacional_de_areas_protegidas:['Áreas protegidas','Áreas registradas para la conservación.','RUNAP','2021','Los registros pueden corresponder a partes de un mismo parque.'],
 departamento_amazonas:['Límite de Amazonas','Referencia del territorio departamental.','IGAC','2022','No sirve para delimitar un predio.'],
 autoridad_ambiental_car:['Autoridad ambiental regional','Territorio de la autoridad ambiental que incluye Amazonas.','ANLA','2022','Su jurisdicción también se extiende fuera del departamento.'],
 rutas_fluviales:['Rutas fluviales de referencia','Corredores de los ríos Amazonas y Putumayo.','POD','2022','Consulta las condiciones locales antes de navegar.'],
 puerto:['Puertos y embarcaderos','Ubicaciones de referencia para el transporte fluvial.','IGAC','2022','No garantiza acceso público, operación actual ni seguridad de navegación.'],
 equipamientos_publicos:['Equipamientos públicos de referencia','Lugares identificados para consultar servicios y equipamientos.','Gobernación del Amazonas / DANE','2022','La selección no es completa y no acredita acceso público ni funcionamiento actual.'],
 centros_poblados:['Cabeceras y asentamientos principales','Ubicaciones de referencia de centros poblados.','DANE / OCHA Colombia','2010 / 2020; actualización 2022','No es un inventario de comunidades. Las fechas varían y la ubicación es orientativa.'],
 cobertura_uso_tierra_clc:['Cobertura de la tierra · pendiente','Muestra qué cubre la superficie del territorio.','SINCHI','2020 / 2021, por confirmar','Aún no disponible. La cobertura observada no equivale al uso permitido.'],
 usos_pot_municipales:['Usos del suelo municipales · pendiente','Información de los planes de ordenamiento municipales.','Alcaldías de Leticia y Puerto Nariño','Por confirmar','Aún no disponible: falta confirmar el instrumento y su vigencia.'],
 reserva_forestal_ley_2da:['Reservas forestales nacionales','Zonas de reserva forestal que incluyen la Amazonia.','MADS-SIAC','Compilación 2022; referencia 2021','Se extienden fuera del departamento. No certifican restricciones de un predio.'],
 humedales:['Humedales','Zonas de humedal de referencia.','Por confirmar (IAvH / MADS)','Por confirmar','La fuente y la fecha requieren confirmación. No certifica límites ni superficies.'],
 aeropuertos_referencia:['Aeropuertos y pistas','Referencias de infraestructura aérea.','IGAC','2022','Ubicación aproximada. No sirve para localizar accesos, navegar ni confirmar operación actual. No garantiza acceso público.'],
 amenaza_incendios_forestales:['Amenaza por incendios forestales','Cartografía histórica de amenaza.','IDEAM','2010','No informa incendios activos, puntos de calor ni alertas actuales.'],
 amenaza_remocion_masa:['Amenaza por movimientos en masa','Zonas estudiadas por amenaza de deslizamientos.','Servicio Geológico Colombiano','2022, según la ficha de la fuente','Solo cubre las zonas estudiadas. La ausencia de información no significa ausencia de amenaza. No informa alertas actuales.'],
 drenaje_doble_pmtiles:['Ríos y cuerpos de agua','Referencia de las superficies de agua de los ríos principales.','IGAC','2022','No acredita navegabilidad ni límites oficiales.']
};
function view53(def){
 if(def.kind==='rondas')return {title:'Rondas hídricas',what:'Franjas de referencia para la protección de ríos y quebradas.',source:'Corpoamazonia',year:'2022',warning:'Hay diferencias de ubicación entre fuentes. No certifica límites oficiales.'};
 const known=VIEWS53[def.id];if(known)return Object.fromEntries(['title','what','source','year','warning'].map((k,i)=>[k,known[i]]));
 if(def.kind==='determinant'){
  const id=Number(def.id),m=def.metadata||{},v={title:m.nombre||'Información ambiental',what:'Información ambiental de referencia.',source:m.fuenteDeclarada||'Por confirmar',year:m.anioFuente||'Por confirmar',warning:'No sustituye la verificación de la autoridad ambiental.'};
  if(id<=4){v.title=['Río Puré','Cahuinarí','Yaigojé Apaporis','Amacayacu'][id-1];v.what='Área protegida de referencia.'}
  else if(id<=16){const a=id>=9;v.title='Reserva forestal tipo '+(a?'A':'B')+' ('+(a?id-8:id-4)+' de '+(a?8:4)+')';v.what='Zonas de reserva forestal de esta categoría.'}
  else if(id===17){v.title='Humedales';v.what='Zonas de humedal de referencia.'}
  else if(id===18){v.title='Microcuenca Yahuarcaca';v.what='Área de drenaje de la microcuenca Yahuarcaca.'}
  else if(id>=32){v.title='Capacidad de los suelos · clase '+(id===32?'VII':'VIII');v.what='Características y limitaciones de los suelos.'}
  return v;
 }
 return {title:'Archivo agregado al mapa',what:'Información cargada desde tu equipo.',source:'Archivo del usuario',year:'Por confirmar',warning:'Solo se muestra en este navegador; no se publica.'};
}
function intro53(v){return v.what+' Fuente: '+v.source+'. Año: '+v.year+'.'+(v.warning?' '+v.warning:'')}
function sheet53(title){const d=element('details','obs53-technical');d.dataset.fichaTecnica='';const s=element('summary','','Ficha técnica');s.setAttribute('aria-label','Ficha técnica de '+title);d.append(s);return d}
function record53(parent,data){const dl=element('dl','obs53-fields');for(const [key,value] of Object.entries(data||{})){const dt=element('dt','',key),dd=element('dd','',typeof value==='object'?JSON.stringify(value):String(value??'Sin dato'));dl.append(dt,dd)}parent.append(dl)}
function defFor53(e){
 if(e.obs53Definition)return e.obs53Definition;
 if(e.idCitizen==='drenaje_doble_pmtiles')return {id:e.idCitizen,metadata:e.metadata||{},label:e.name,name:e.name,description:e.origin,restriction:e.metadata?.advertencia};
 if(e.idPilot===46&&e.vectorTiles)return rondasDef();
 if(e.idPilot!=null){const m=layersMeta().find(m=>m.objectid===e.idPilot);if(m)return determinant(m)}
 const m=[...citizenCatalog,...tandaCatalog,...tanda2Catalog,...tanda3Catalog,...tanda4Catalog,...tanda5Catalog].find(m=>m.id_capa===e.idCitizen);return m?citizen(m):null;
}
function entryView53(e){return view53(defFor53(e)||{id:e.idCitizen})}
function sheetFor53(def){
 const v=view53(def),d=sheet53(v.title);d.append(element('p','',def.label||def.name),element('p','',def.description||''));
 if(def.restriction)d.append(element('p','',def.restriction));
 record53(d,{Identificador:def.id,Nombre_original:def.name||def.label,Fuente_original:def.source||def.description,Archivo:def.url||'No disponible'});
 if(def.metadata){const p=element('pre','obs53-metadata',JSON.stringify(def.metadata,null,2));d.append(p)}
 const error=element('p','obs53-error');error.dataset.technicalError='';d.append(error);return d;
}
function featuresPanel53(entry,feature){
 const def=defFor53(entry),v=entryView53(entry),box=element('div','obs53-feature'),props=feature?.properties||{};
 const name=props.NOMBRE||props.NOM_CPOB||props.NOMBRE_GEOGRAFICO||props.MpNombre||props.NOM_SZH||props.nombre||props.Nombre;
 box.append(element('h4','',name||v.title),element('p','',intro53(v)));
 const tech=def?sheetFor53(def):sheet53(v.title);record53(tech,{Nombre_de_capa:entry.name,Origen:entry.origin,...props});box.append(tech);return box;
}
function hookPopups53(){
 const map=window.obs19Api?.getMap?.();if(!map||map.obs53Popups)return;map.obs53Popups=true;
 map.on('popupopen',({popup})=>{const root=popup.getElement();if(root.obs53Toggle)return;root.obs53Toggle=true;
  root.addEventListener('toggle',event=>{
   if(!event.target.matches('details[data-ficha-tecnica]')||!popup.isOpen())return;
   popup.update();
   if(popup.options.autoPan===false){const r=root.getBoundingClientRect(),m=map.getContainer().getBoundingClientRect();
    const dx=r.right>m.right-16?r.right-m.right+16:r.left<m.left+16?r.left-m.left-16:0;
    const dy=r.bottom>m.bottom-16?r.bottom-m.bottom+16:r.top<m.top+16?r.top-m.top-16:0;
    if(dx||dy)map.panBy([dx,dy],{animate:false});
   }
  },true);
 });
}
function presentEntries53(){
 hookPopups53();const visible=getLayers().filter(e=>e.visible),tags=document.querySelectorAll('#v7-dynamic-legend .v7-legend-tag');
 visible.forEach((e,i)=>{const v=entryView53(e),tag=tags[i];if(tag){tag.title=v.title;const span=tag.querySelector('span');if(span)span.textContent=v.title}});
 for(const entry of getLayers()){
  if(entry.vectorTiles||!entry.layer?.eachLayer)continue;
  const def=defFor53(entry),key=def?.key||'local';if(entry.obs53Presentation===key)continue;entry.obs53Presentation=key;
  entry.layer.eachLayer(layer=>{
   layer.bindPopup(()=>featuresPanel53(entry,layer.feature),{...layer.getPopup()?.options,maxHeight:layer.getPopup()?.options.maxHeight||220});
   if(!layer.obs53Click){layer.obs53Click=true;layer.on('click',()=>{const target=$('geo-attribute-info');if(target)target.replaceChildren(featuresPanel53(entry,layer.feature))})}
  });
 }
 // Los archivos del usuario mantienen su nombre completo en su propia ficha.
 document.querySelectorAll('#local-layer-list [data-local-layer]').forEach(node=>{
  const e=getLayers().find(e=>String(e.id)===node.dataset.localLayer);if(!e)return;
  const name=node.querySelector('.v7-layer-name');if(name)name.textContent='Archivo agregado al mapa';
  const meta=node.querySelector('.v7-layer-meta');if(meta&&!meta.closest('[data-ficha-tecnica]')){const d=sheet53('archivo agregado');meta.before(d);d.append(meta);record53(d,{Nombre_de_archivo:e.name,Origen:e.origin});}
 });
}
function initText53(){
 document.querySelectorAll('#view-geovisor h3').forEach(h=>{if(h.textContent==='Capas locales de prueba')h.textContent='Capas del Observatorio'});
 const legend=$('local-layer-legend');if(legend){for(const child of [...legend.childNodes])if(child.nodeType===3)child.textContent=' Capas del Observatorio'}
 $('local-layer-list')?.setAttribute('aria-label','Archivos agregados al mapa');$('v7-dynamic-legend')?.setAttribute('aria-label','Leyenda de capas del Observatorio');
 const label=document.querySelector('label[for="geojson-upload"]');if(label){for(const node of label.childNodes)if(node.nodeType===3)node.textContent=' Agregar archivo al mapa'}
 const side=document.querySelector('#view-geovisor .side-info p');if(side){const d=sheet53('estado del visor');side.before(d);d.append(side.cloneNode(true));side.textContent='Prototipo en desarrollo. La información es orientativa y no constituye una certificación oficial.'}
}
window.obs53={view:view53,intro:intro53,sheet:sheet53,record:record53};

function layersMeta(){return catalog?.grupos?.flatMap(g=>g.capas.map(c=>({...c,group:g.titulo})))||[];}
function determinant(meta){
 const label=meta.etiqueta||meta.nombre||('Determinante '+meta.objectid),tiles=!!meta.archivoTeselas;
 const source=(meta.fuenteDeclarada||'Fuente indicada en los atributos')+(meta.anioFuente?' · '+meta.anioFuente:'');
 return {key:'det-'+meta.objectid,kind:'determinant',id:meta.objectid,label,name:'Det. '+meta.objectid+' · '+(tiles?meta.nombre:label)+(tiles?' · '+source:''),available:!!(meta.archivo||meta.archivoTeselas),url:meta.archivoTeselas||meta.archivo,vectorTiles:tiles,
  description:meta.group+' · ID '+meta.objectid+' · '+(meta.archivo||tiles?'Disponible':'Pendiente de preparación web')+(tiles?' · '+source:''),
  source,restriction:meta.advertencia||'',opacity:Math.round((meta.opacidadSugerida??.35)*100),color:tiles?'#176c8b':undefined,metadata:meta};
}
function rondasDef(){
 const m=catalog?.rondasUnificadas;if(!m)return null;
 const d=determinant({...m,objectid:46,etiqueta:m.nombre,nombre:m.nombre,archivoTeselas:m.archivo,fuenteDeclarada:m.fuente,anioFuente:m.anio,opacidadSugerida:.65,group:'Rondas hídricas'});
 return {...d,kind:'rondas',key:'rondas46',name:m.nombre,description:'Corpoamazonia · 2022 · 13 determinantes (19–31) en una sola capa',restriction:m.advertencia};
}
function updateGeoHelp(){
 const tip=document.querySelector('#view-geoportal .obs19-geo-tip');if(!tip)return;
 if(!catalog){tip.textContent='Cargando el estado del catálogo de determinantes…';return}
 const all=layersMeta(),ready=all.filter(c=>c.archivo||c.archivoTeselas),pending=all.filter(c=>!c.archivo&&!c.archivoTeselas);
 const count=new Set(ready.map(c=>c.archivo||c.archivoTeselas)).size;
 tip.textContent='Componente biofísico → Determinantes ambientales: '+ready.length+' de '+all.length+' registros disponibles en '+count+' capas de consulta (las trece rondas comparten una capa). '+pending.length+' pendientes. Se descargan solo al encenderlas. Las cifras no son oficiales.';
}
function citizen(meta){
 const tanda=[2,3,4,5].includes(meta.lote)?meta.lote:meta.categoria?1:0;
 const directorio=tanda?'datos/tanda_'+tanda+'_29/':'datos/piloto_29/';
 return {key:'cit-'+meta.id_capa,kind:'citizen',id:meta.id_capa,label:meta.nombre_publico,name:meta.nombre_publico,available:meta.estado!=='pendiente',vectorTiles:!!meta.vector_tiles,vectorId:meta.id_vector,tanda,url:meta.ruta_relativa?directorio+meta.ruta_relativa:null,
 description:meta.fuente_declarada_encargo+' · '+meta.anio_declarado_encargo+' · '+meta.entidades+' entidades',source:meta.fuente_declarada_encargo+' · '+meta.anio_declarado_encargo,
 restriction:meta.restricciones,opacity:65,metadata:{...meta,fuenteDeclarada:meta.fuente_declarada_encargo+' · '+meta.anio_declarado_encargo},
 color:tanda&&/^#[0-9a-f]{6}$/i.test(meta.color)?meta.color:{division_politico_administrativa:'#a34a06',cuencas_hidrograficas:'#156f99',sistema_nacional_de_areas_protegidas:'#177749'}[meta.id_capa]};}
function activeLayer(def){return getLayers().find(e=>def.kind==='citizen'?e.idCitizen===def.id:e.idPilot===def.id&&e.origin==='Determinantes ambientales · publicación autorizada')}
function layerCard(def){
 const card=element('div','obs20-pilot-card obs32-layer-card');card.dataset.layerKey=def.key;
 if(def.kind==='rondas')card.dataset.rondasLayer='rondas46';else if(def.tanda===5)card.dataset.tanda5Layer=def.id;else if(def.tanda===4)card.dataset.tanda4Layer=def.id;else if(def.tanda===3)card.dataset.tanda3Layer=def.id;else if(def.tanda===2)card.dataset.tanda2Layer=def.id;else if(def.tanda)card.dataset.tandaLayer=def.id;else if(def.kind==='citizen')card.dataset.citizenLayer=def.id;else card.dataset.determinantLayer=String(def.id);
 const view=view53(def),technical=sheetFor53(def);const title=element('h4','obs32-layer-title',view.title);card.append(title,element('p','obs32-layer-description obs53-intro',intro53(view)));
 const control=element('button','obs32-layer-switch');control.type='button';control.setAttribute('role','switch');control.setAttribute('aria-checked','false');
 // Conservar el nombre accesible existente de los parques, sin identificadores.
 control.setAttribute('aria-label','Mostrar u ocultar '+(def.kind==='determinant'&&Number(def.id)<=4?def.label:view.title));control.disabled=!def.available;
 const track=element('span','obs32-switch-track');track.setAttribute('aria-hidden','true');control.append(track,element('span','obs32-switch-state','Apagada'));
 control.addEventListener('click',()=>{const state=layerState.get(def.key);toggleLayer(def,state?.loading?!state.want:!activeLayer(def)?.visible)});
 card.append(control);

 if(Array.isArray(def.metadata?.leyenda)){
  const legend=element('ul','obs19-footnote');legend.setAttribute('aria-label','Leyenda de '+view.title);
  def.metadata.leyenda.forEach(item=>{
   const row=element('li'),symbol=element('span');symbol.textContent='● ';symbol.setAttribute('aria-hidden','true');
   if(/^#[0-9a-f]{6}$/i.test(item.color))symbol.style.color=item.color;
   row.append(symbol,document.createTextNode(item.valor));legend.append(row);
  });card.append(legend);
 }
 if(def.vectorTiles&&!Array.isArray(def.metadata.leyenda)){
  const legend=element('p','obs32-layer-description'),symbol=element('span','','■ ');symbol.style.color=def.color;symbol.setAttribute('aria-hidden','true');
  legend.append(symbol,document.createTextNode('Leyenda: '+(def.kind==='rondas'?'Franjas de protección de ríos y quebradas':def.metadata.leyenda)));card.append(legend);
 }
 if([4,5].includes(def.tanda)&&def.vectorTiles)technical.append(element('p','obs19-footnote','Visible desde zoom 5. El encuadre mantiene ese mínimo; desplaza el mapa para explorar las zonas que queden fuera de la ventana.'));
 if(def.kind==='rondas'){const list=element('ul','obs19-footnote');list.setAttribute('aria-label','Determinantes incluidas en las rondas');layersMeta().filter(c=>c.grupoVisualizacion==='rondas46').forEach(c=>{const row=element('li','','Determinante '+c.objectid+' · '+c.nombre+' · '+c.norma);row.dataset.determinantLayer=String(c.objectid);list.append(row)});technical.append(list);const query=element('button','','Consultar centro del mapa');query.type='button';query.dataset.rondasQuery='';query.disabled=true;query.addEventListener('click',()=>{const map=window.obs19Api?.getMap?.();if(map)map.fire('click',{latlng:map.getCenter()})});card.append(query,element('p','obs19-footnote','Toca un polígono para consultar su determinante; acerca el mapa para las franjas estrechas. Con teclado, mueve el mapa con las flechas y usa Consultar centro del mapa.'))}
 const status=element('p','obs19-footnote');status.id='estado-'+def.key;status.dataset.layerStatus=def.key;status.setAttribute('role','status');
 if(def.kind==='citizen')status.dataset.citizenStatus=def.id;
 control.setAttribute('aria-describedby',status.id);card.append(status);
 const tools=element('div','obs20-pilot-tools'),zoom=element('button','','Zoom a capa ↗');zoom.type='button';zoom.disabled=!def.available;zoom.dataset.layerZoom=def.key;
 zoom.setAttribute('aria-label','Zoom a capa '+view.title);zoom.addEventListener('click',()=>toggleLayer(def,true));tools.append(zoom);
 const opacity=element('label','obs20-range-label');opacity.append(document.createTextNode('Transparencia'));
 const slider=element('input');slider.type='range';slider.min='0';slider.max='100';slider.step='5';slider.disabled=true;
 slider.setAttribute('aria-label',(def.kind==='citizen'?'Transparencia de ':'Transparencia del polígono de ')+view.title);const output=element('output');
 slider.addEventListener('input',()=>{const entry=activeLayer(def);if(!entry)return;entry.opacity=100-Number(slider.value);entry.layer.setStyle({fillOpacity:entry.opacity/100*(entry.geomType==='Puntos'?1:.52)});output.textContent=slider.value+'%';window.obs19Api.redraw()});
 opacity.append(slider,output);tools.append(opacity);card.append(tools,technical);return card;
}
function renderTree(){updateGeoHelp();const tree=$('obs19-thematic-tree');if(!tree)return;clear(tree);
 CATEGORIES.forEach((cat,i)=>{const outer=element('details');outer.open=i===1;outer.append(element('summary','',cat));
  if(i===1){const mid=element('details');mid.open=true;mid.append(element('summary','','Determinantes ambientales · 33 registros'));
   (catalog?.grupos||[]).forEach(g=>{const details=element('details');details.append(element('summary','',g.titulo+' · '+g.capas.filter(c=>!!(c.archivo||c.archivoTeselas)).length+(g.capas.some(c=>c.grupoVisualizacion)?' registros disponibles de ':' disponibles de ')+g.capas.length));
    let rondas=false;g.capas.forEach(c=>{if(c.grupoVisualizacion==='rondas46'){if(!rondas){details.append(layerCard(rondasDef()));rondas=true}}else details.append(layerCard(determinant({...c,group:g.titulo})))});mid.append(details)});
   if(!catalog?.grupos?.length)mid.append(element('p','obs19-empty','El catálogo de determinantes no está disponible. Comprueba la conexión y actualiza la página.'));
   const pending=layersMeta().filter(c=>!c.archivo&&!c.archivoTeselas).length;
   mid.append(element('p','obs19-footnote',pending+' determinantes pendientes de preparación web.'));outer.append(mid);
  }else if(i!==0){outer.append(element('p','obs19-footnote','Aún no hay capas disponibles en esta categoría.'))}
  const mount=element('div');mount.dataset.citizenCategory=String(i);outer.append(mount);
  tree.append(outer);
 });renderCitizenLayers();syncLayerControls();
}
function renderCitizenLayers(){
 [...citizenCatalog,...tandaCatalog,...tanda2Catalog,...tanda3Catalog,...tanda4Catalog,...tanda5Catalog].forEach(meta=>{
  const category=meta.categoria?CATEGORIES.indexOf(meta.categoria):(meta.id_capa==='division_politico_administrativa'?0:1);
  const mount=document.querySelector('[data-citizen-category="'+category+'"]');
  const def=citizen(meta);
  if(mount&&!mount.querySelector('[data-layer-key="'+def.key+'"]'))mount.append(layerCard(def));
  if(mount&&def.tanda)mount.parentElement.querySelector(':scope > .obs19-footnote')?.remove();
 });renderIndicatorsAction();window.obs40Mount?.();syncLayerControls();
}
function renderIndicatorsAction(){
 TABLE4.forEach(t=>{const target=document.querySelector('[data-citizen-category="'+t.categoria+'"]');if(!target)return;let c=$('tabla4-'+t.id);if(!c){c=element('div','obs20-pilot-card obs32-layer-card');c.id='tabla4-'+t.id;c.dataset.tabla4=t.id;c.append(element('h4','obs32-layer-title',t.nombre),element('p','obs19-footnote','Consulta el estado de los servicios públicos por territorio. Fuente: compilación POD Amazonas. Año: por confirmar. Definiciones por confirmar.'));const tech=sheet53(t.nombre);tech.append(element('p','','Datos unidos por código a la División publicada, sin nuevas geometrías. Año, unidad y definiciones por confirmar.'));c.append(tech);const b=element('button','','Consultar '+t.nombre);b.type='button';b.id='consultar4-'+t.id;b.onclick=()=>openMunicipalIndicators({id:t.id});const s=element('p','obs19-footnote');s.id='estado4-'+t.id;s.setAttribute('role','status');c.append(b,s);target.append(c)}c.querySelector('button').disabled=indicatorLoading||!citizenCatalog.some(m=>m.id_capa==='division_politico_administrativa')});
 const mount=document.querySelector('[data-citizen-category="4"]');
 if(!mount)return;
 let card=$('indicadores-municipales');
 if(!card){
  card=element('div','obs20-pilot-card obs32-layer-card');card.id='indicadores-municipales';
  card.append(element('h4','obs32-layer-title','Indicadores municipales'));
  card.append(element('p','obs19-footnote','Consulta servicios públicos, pobreza, salud y educación. Fuente: fuentes citadas en el POD. Año: varía; algunos por confirmar. Revisa la definición de cada indicador.'));
  const button=element('button','ghost-button','Consultar indicadores municipales');button.type='button';button.id='consultar-indicadores';
  button.addEventListener('click',openMunicipalIndicators);
  const status=element('p','obs19-footnote');status.id='estado-indicadores';status.setAttribute('role','status');
  const tech=sheet53('indicadores municipales');tech.append(element('p','','Consulta servicios públicos, pobreza, salud y educación en cada unidad territorial.'));const info=element('pre','obs53-metadata');info.dataset.indicatorMetadata='';tech.append(info);card.append(button,status,tech);mount.append(card);
  mount.parentElement.querySelector(':scope > .obs19-footnote')?.remove();
 }
 $('consultar-indicadores').disabled=indicatorLoading||!citizenCatalog.some(meta=>meta.id_capa==='division_politico_administrativa');
}
async function openMunicipalIndicators(selection){
 const selected=TABLE4.find(t=>t.id===selection?.id),path=selected?'datos/tanda_4_29/tablas/'+selected.id+'.json':'datos/indicadores_29/municipios.json';
 if(indicatorLoading)return;
 indicatorLoading=true;renderIndicatorsAction();
 const button=$(selected?'consultar4-'+selected.id:'consultar-indicadores'),status=$(selected?'estado4-'+selected.id:'estado-indicadores');
 button.disabled=true;status.textContent='Cargando indicadores…';
 try{
  const meta=citizenCatalog.find(row=>row.id_capa==='division_politico_administrativa');
  if(!meta)throw Error('El catálogo de División aún está cargando');
  const def=citizen(meta);
  await toggleLayer(def,true);
  const entry=activeLayer(def);
  if(!entry)throw Error('Activa División político-administrativa y vuelve a intentarlo');
  let data=selected?tableCache.get(selected.id):indicatorData;
  if(!data){
   const response=await fetch(path);
   if(!response.ok)throw Error('Datos de indicadores no disponibles ('+response.status+')');
   data=await response.json();
  }
  if(!Array.isArray(data.municipios)||!Array.isArray(data.indicadores))throw Error('Tabla de indicadores incorrecta');
  if(selected&&(data.geometria_base!=='datos/piloto_29/'+meta.ruta_relativa||data.sha256_geometria_base!==meta.sha256))throw Error('La tabla no corresponde a la División publicada');
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
     const section=element('section');section.dataset.indicatorField=field.campo;section.append(element('strong','',/^(PM|PE)$/.test(field.nombre)?'Indicador adicional · definición por confirmar':field.nombre.split(' · ')[0].replace('SGP','Sistema General de Participaciones')));
     const value=record.valores[field.campo];
     section.append(element('p','','Valor: '+(value===null||value===undefined?'Sin dato':String(value))));
     section.append(element('p','','Año: '+(String(field.anio).startsWith('por confirmar')?'por confirmar':field.anio)+' · Unidad: '+(field.unidad==='categoría textual de la fuente'?'categoría':field.unidad)));
     if(field.producto)section.append(element('p','','Producto: '+field.producto));
     section.append(element('p','','Definición: '+field.definicion.replace('en el mapa DG12','en la fuente')));
     section.append(element('p','','Fuente: '+field.fuente.replace(/,?\s*D[BDG]\d+/g,'').replace(/; metadato cita.*/, '').replace('CNPV 2018','Censo de población 2018')));box.append(section);
    }
    const tech=sheet53('indicadores de '+props.MpNombre);record53(tech,{Codigo_municipal:props.MpCodigo});tech.append(element('pre','obs53-metadata',JSON.stringify(data,null,2)));box.append(tech);return box;
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
  if(selected)tableCache.set(selected.id,data);else indicatorData=data;
  const metaCard=selected?$('tabla4-'+selected.id):$('indicadores-municipales'),sheet=metaCard?.querySelector('[data-ficha-tecnica]');if(sheet){let full=sheet.querySelector('[data-indicator-metadata]');if(!full){full=element('pre','obs53-metadata');full.dataset.indicatorMetadata='';sheet.append(full)}full.textContent=JSON.stringify(data,null,2)}
  status.textContent='Selecciona una unidad del mapa para ver sus indicadores. Las definiciones pendientes están rotuladas «por confirmar».';
 }catch(error){status.textContent='No se pudieron consultar los indicadores: '+String(error.message||error)+'. Puedes reintentar.'}
 finally{indicatorLoading=false;button.disabled=false;renderIndicatorsAction()}
}
function syncLayerControls(){
 const defs=[...layersMeta().filter(c=>!c.grupoVisualizacion).map(determinant),...(rondasDef()?[rondasDef()]:[]),...[...citizenCatalog,...tandaCatalog,...tanda2Catalog,...tanda3Catalog,...tanda4Catalog,...tanda5Catalog].map(citizen)];
 defs.forEach(def=>{
  const card=document.querySelector('[data-layer-key="'+def.key+'"]');if(!card)return;
  const entry=activeLayer(def),state=layerState.get(def.key),loading=!!state?.loading,on=!!entry?.visible;
  const query=card.querySelector('[data-rondas-query]');if(query)query.disabled=!on||loading;
  const control=card.querySelector('[role="switch"]');control.setAttribute('aria-checked',String(on));control.setAttribute('aria-busy',String(loading));
  card.querySelector('.obs32-switch-state').textContent=on?'Encendida':'Apagada';
  card.querySelector('[data-layer-status]').textContent=!def.available?'Pendiente de preparación web.':(state?.error?'No se pudo cargar la capa. Abre la ficha técnica para ver el detalle y vuelve a encenderla para reintentar.':'')||(loading?'Cargando capa… Pulsa el interruptor para cancelar.':on?'Capa visible':'Se descarga solo al activarla.');
  card.querySelector('[data-technical-error]').textContent=state?.error||'';
  const slider=card.querySelector('input[type="range"]');slider.disabled=!on;slider.value=String(100-(entry?.opacity??def.opacity));slider.nextElementSibling.textContent=slider.value+'%';
  if(def.kind==='citizen')document.querySelectorAll('#v7-dynamic-legend .v7-legend-tag').forEach(tag=>{if(tag.title===def.name||tag.title===view53(def).title)tag.classList.add('pilot29-legend')});
 });window.obs40Sync?.();
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
function bindRondasQuery(layer,map,signal){
 let sequence=0,popup=null;
 const click=async event=>{
  const serial=++sequence,zoom=map.getZoom();
  if(document.getElementById('measure-mode')?.classList.contains('active'))return;
  try{
   const hits=await layer.consultarPoligonos(event.latlng);
   if(signal.aborted||serial!==sequence||!map.hasLayer(layer)||zoom!==map.getZoom())return;
   const byId=new Map();hits.forEach(p=>{const id=Number(p.objectid);if(Number.isInteger(id)&&id>=19&&id<=31&&p.Nombre==='Rondas hídricas'&&p.Norma_Asociada==='Resolución 957 de 2018')byId.set(id,p)});
   if(!byId.size){if(popup)map.closePopup(popup);return}
   const box=element('div');box.dataset.rondasConsulta='';box.tabIndex=-1;box.setAttribute('aria-label','Resultado de consulta de rondas');box.append(element('h4','','Rondas hídricas'));
   box.append(element('p','',intro53(view53(rondasDef()))));const technical=sheetFor53(rondasDef());
   [...byId].sort((a,b)=>a[0]-b[0]).forEach(([id,p])=>technical.append(element('p','','Determinante '+id+' · '+p.Nombre+' · '+p.Norma_Asociada)));
   technical.append(element('p','','Corpoamazonia · 2022. 13 rondas disponibles. Consulta de la representación por zoom; no acredita límites oficiales.'));
   box.append(technical);
   // Una ventana nueva evita medidas anteriores; el encuadre sin animación
   // queda resuelto antes de admitir otra consulta o desplegar la ficha.
   const size=map.getSize(),options={maxWidth:Math.min(320,Math.max(120,size.x-100)),maxHeight:Math.min(240,Math.max(80,size.y-120)),autoPan:false,autoPanPadding:[20,20]};
   if(popup)map.closePopup(popup);map.stop();popup=L.popup(options).setLatLng(event.latlng).setContent(box).openOn(map);
   const r=popup.getElement().getBoundingClientRect(),m=map.getContainer().getBoundingClientRect();
   const dx=r.right>m.right-16?r.right-m.right+16:r.left<m.left+16?r.left-m.left-16:0;
   const dy=r.bottom>m.bottom-16?r.bottom-m.bottom+16:r.top<m.top+16?r.top-m.top-16:0;
   if(dx||dy)map.panBy([dx,dy],{animate:false});
   if(!event.originalEvent)box.focus({preventScroll:true});
  }catch(err){if(!signal.aborted){const status=document.querySelector('[data-rondas-layer] [role="status"]');if(status)status.textContent='No se pudo consultar la ronda. Vuelve a tocar el mapa.'}}
 };
 const invalidate=()=>{sequence++};map.on('movestart',invalidate);map.on('click',click);layer.once('remove',()=>{sequence++;map.off('click',click);map.off('movestart',invalidate);if(popup)map.closePopup(popup)});
}
async function addTileDeterminant(def,state,controller){
 if(!(def.kind==='rondas'&&def.url==='datos/rondas_46/rondas.pmtiles'||def.tanda===4&&/^datos\/tanda_4_29\/teselas\/(reserva_forestal_ley_2da|humedales)\.pmtiles$/.test(def.url)||def.tanda===5&&/^datos\/tanda_5_29\/teselas\/(amenaza_incendios_forestales|amenaza_remocion_masa)\.pmtiles$/.test(def.url)))throw Error('Ruta de teselas no autorizada');
 if(!await tileReaderReady||!window.obs40Tiles)throw Error('Lector de teselas no disponible; actualiza la página');
 const spec=def.metadata.teselas;
 if(!spec||!Number.isSafeInteger(spec.bytes)||spec.bytes<127||spec.minzoom!==5||spec.maxzoom!==12||spec.dataLayer!==([4,5].includes(def.tanda)?def.id:'rondas')||!Array.isArray(spec.bbox)||spec.bbox.length!==4)throw Error('Ficha de teselas incorrecta');
 const signal=controller.signal,map=window.obs19Api.getMap();let layer;
 const fail=error=>{
  if(signal.aborted||state.controller!==controller||error.name==='AbortError')return;
  state.error='No se pudo cargar la capa: '+String(error.message||error)+'. Vuelve a encenderla para reintentar.';state.want=false;state.loading=false;controller.abort();
  const current=activeLayer(def);if(current&&current.layer===layer)window.obs19Api.remove(current.id);else layer?.remove();syncLayerControls();
 };
 try{
  layer=await window.obs40Tiles.create({...spec,url:def.url,color:def.color,opacity:def.opacity/100,lineas:true},signal,fail);
  if(signal.aborted||!state.want||state.controller!==controller)return;
  if(getLayers().length>=8)throw Error('Ya se alcanzó el máximo de 8 capas');
  const entry={id:[4,5].includes(def.tanda)?def.vectorId:-4300-def.id,...([4,5].includes(def.tanda)?{idCitizen:def.id}:{idPilot:def.id}),name:def.name,origin:[4,5].includes(def.tanda)?def.source+' · publicación autorizada':'Determinantes ambientales · publicación autorizada',visible:true,opacity:def.opacity,layer,obs53Definition:def,data:null,count:0,geomType:'Teselas vectoriales',color:def.color,vectorTiles:true,metadata:{...def.metadata,fuenteDeclarada:def.source}};
  if(def.kind==='rondas')map.fitBounds(layer.getBounds(),{padding:[16,16],maxZoom:12,animate:false});
  const ready=window.obs40Tiles.ready(layer,map,signal);
  getLayers().push(entry);layer.on('remove',()=>{controller.abort();if(state.controller===controller){state.want=false;state.loading=false;syncLayerControls()}});
  layer.addTo(map);if(def.kind==='rondas')bindRondasQuery(layer,map,signal);window.obs19Api.redraw();await ready;
  if(signal.aborted||state.controller!==controller)return;
  selectedLayer=entry.id;window.obs19Api.redraw();
 }catch(error){fail(error);if(error.name==='AbortError')return;throw error}
}
async function toggleLayer(def,want){
 if(!def.available)return;
 let state=layerState.get(def.key);if(!state){state={want:false};layerState.set(def.key,state)}
 state.want=want;state.error='';const current=activeLayer(def);
 if(!want){state.controller?.abort();state.loading=false;if(current)window.obs19Api.remove(current.id);syncLayerControls();return}
 if(current){
  if([4,5].includes(def.tanda)&&def.vectorTiles){
   const map=window.obs19Api.getMap(),bounds=current.layer.getBounds();
   // El encuadre nacional puede bajar de 5 en móvil y ocultar las teselas.
   // Evitar también que un zoom animado previo termine sobre la capa siguiente.
   map.fitBounds(bounds,{padding:[16,16],maxZoom:12,animate:false});
   if(map.getZoom()<5)map.setView(bounds.getCenter(),5,{animate:false});
  }else window.obs19Api.zoom(current.id);
  syncLayerControls();return;
 }
 if(state.loading)return;
 const controller=new AbortController();state.controller=controller;state.loading=true;syncLayerControls();
 try{
  if(!window.obs19Api?.getMap?.())location.hash='#geovisor';
  await waitForMap(controller.signal);
  if(def.vectorTiles){await addTileDeterminant(def,state,controller);return}
  const valid=def.tanda?/^datos\/tanda_[12345]_29\/capas\/[a-z0-9_]+\.geojson$/:def.kind==='citizen'?/^datos\/piloto_29\/capas\/(01_base_cartografica|02_componente_biofisico)\/[a-z0-9_]+\.geojson$/:/^datos\/determinantes_ambientales\/[A-Z0-9_]+\/determinante_\d{2}\.geojson$/;
  if(!valid.test(def.url))throw Error('Ruta de capa no autorizada');
  let data=state.data;
  if(!data){const response=await fetch(def.url,{signal:controller.signal});if(!response.ok)throw Error('Archivo no disponible ('+response.status+')');data=await response.json()}
  if(controller.signal.aborted||!state.want)return;
  // Conserva el caché del piloto; las determinantes se liberan al quitarlas.
  if(def.kind==='citizen')state.data=data;
  const entry=window.obs19Api.add(def.name,data,def.kind==='citizen'?def.source+(def.tanda?' · publicación autorizada':' · piloto autorizado'):'Determinantes ambientales · publicación autorizada',true);
  if(def.kind==='citizen')entry.idCitizen=def.id;else entry.idPilot=def.id;
  entry.metadata=def.metadata;entry.obs53Definition=def;entry.opacity=def.opacity;if(def.color)entry.color=def.color;
  entry.layer.setStyle({color:entry.color,fillColor:entry.color,fillOpacity:entry.opacity/100*(entry.geomType==='Puntos'?1:.52)});
  if(def.metadata.campo_leyenda&&Array.isArray(def.metadata.leyenda))entry.layer.eachLayer(layer=>{
   const value=layer.feature?.properties?.[def.metadata.campo_leyenda];
   const color=def.metadata.leyenda.find(item=>item.valor===value)?.color;
   if(/^#[0-9a-f]{6}$/i.test(color))layer.setStyle({color,fillColor:color});
  });
  if(def.tanda===3||def.id==='aeropuertos_referencia'){
   const map=window.obs19Api.getMap();map.invalidateSize({pan:false});const size=map.getSize();
   entry.layer.eachLayer(layer=>{
    const props=layer.feature.properties,name=props.NOMBRE||props.NOM_CPOB||props.NOMBRE_GEOGRAFICO;
    layer.bindPopup(()=>{
     return featuresPanel53(entry,layer.feature);
    },{maxHeight:Math.min(320,Math.max(80,size.y-120)),maxWidth:Math.min(320,Math.max(100,size.x-120)),autoPanPaddingTopLeft:[45,10],autoPanPaddingBottomRight:[10,35]});
    const node=layer.getElement();if(node){node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label','Consultar '+name);
     node.addEventListener('focus',()=>{map.closePopup();map.panInside(layer.getLatLng(),{padding:[30,30],animate:false})});
     node.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();layer.openPopup();
      if(def.id==='aeropuertos_referencia'){
       // Leaflet oculta el contenido mientras mide y posiciona la ventana.
       // Esperar su visibilidad evita perder el foco; no robarlo si ya se movió.
       const until=performance.now()+2000,focusInfo=()=>{
        const popup=layer.getPopup(),content=popup?.getElement()?.querySelector('.leaflet-popup-content');
        if(!popup?.isOpen()||!content||document.activeElement!==node)return;
        content.tabIndex=0;content.setAttribute('role','region');content.setAttribute('aria-label','Información y advertencias de '+name);
        if(getComputedStyle(content).visibility==='visible'&&content.getClientRects().length)content.focus({preventScroll:true});
        else if(performance.now()<until)requestAnimationFrame(focusInfo);
       };requestAnimationFrame(focusInfo);
      }
     }};
    }
   });
  }
  selectedLayer=entry.id;window.obs19Api.redraw();
 }catch(error){if(error.name!=='AbortError'&&state.controller===controller){state.want=false;state.error='No se pudo cargar la capa: '+String(error.message||error)+'. Vuelve a encenderla para reintentar.'}}
 finally{if(state.controller===controller){state.loading=false;syncLayerControls()}}
}
function getFeatures(d){if(!d)return[];if(d.type==='FeatureCollection')return Array.isArray(d.features)?d.features:[];return d.type==='Feature'?[d]:[{properties:{},geometry:d}]}
function summariseStats(layer){const feats=getFeatures(layer.data),props=feats.map(f=>f.properties||{});const numeric={};const categoric={};props.forEach(p=>Object.entries(p).forEach(([k,v])=>{if(v==null||v==='')return;if(typeof v==='number'&&Number.isFinite(v)){(numeric[k]??=[]).push(v);}else if(typeof v==='string'&&v.length<80&&!/^(objectid|fid|shape_)/i.test(k)){const c=categoric[k]??={};c[v]=(c[v]||0)+1;}}));const group=Object.entries(categoric).filter(([k,counts])=>Object.keys(counts).length>=2&&Object.keys(counts).length<=12).sort((a,b)=>Object.keys(a[1]).length-Object.keys(b[1]).length)[0];return{feats,props,numeric,group}}
function renderStats(){presentEntries53();syncLayerControls();const overview=$('obs19-stat-overview'),detail=$('obs19-stat-detail');if(!overview||!detail)return;clear(overview);clear(detail);
 const active=getLayers().filter(x=>x.visible);const counts=active.reduce((n,e)=>n+(e.count||0),0);const top=element('div','obs19-metrics');[['Capas visibles',active.length],['Registros cargados',active.some(e=>e.vectorTiles)?'—':counts]].forEach(([lab,val])=>{const d=element('div','obs19-metric');d.append(element('strong','',String(val)),element('small','',lab));top.append(d)});overview.append(top);if(active.some(e=>e.vectorTiles))overview.append(element('p','obs19-footnote','Esta capa se consulta por zonas y no permite contar registros'));
 if(!active.length){detail.append(element('div','obs19-empty','Activa una capa desde el panel izquierdo. Se mostrarán estadísticas según sus atributos.'));return}
 if(!active.some(x=>x.id===selectedLayer))selectedLayer=active[0].id;
 const switches=element('div','obs19-layer-switches');active.forEach(e=>{const b=element('button',selectedLayer===e.id?'active':'',entryView53(e).title);b.type='button';b.onclick=()=>{selectedLayer=e.id;renderStats()};switches.append(b)});detail.append(switches);
 const e=active.find(x=>x.id===selectedLayer),v=entryView53(e),def=defFor53(e);const card=element('div','obs19-stat-card');
 card.append(element('h3','',v.title),element('p','',intro53(v)));
 const technical=def?sheetFor53(def):sheet53(v.title);technical.append(element('p','','Tipo: '+e.geomType+' · '+(e.vectorTiles?'—':getFeatures(e.data).length)+' registros · '+e.origin));
 record53(technical,{Nombre_original:e.name,Fuente:e.metadata?.fuenteDeclarada||e.origin});
 if(e.vectorTiles){technical.append(element('p','',e.metadata?.advertencia||''),element('p','','Visualización por teselas: no reconstruye entidades completas ni permite calcular conteos o superficies.'));card.append(technical);detail.append(card);return}
 const data=summariseStats(e);card.append(element('p','',data.feats.length+' registros disponibles.'));

 const p=data.props[0]||{};let displayed=0;for(const [k,v] of Object.entries(p)){if(v==null||String(v)==='')continue;if(displayed++>=9)break;const r=element('div','obs19-attr');r.append(element('span','',k.replaceAll('_',' ')),element('strong','',String(v).slice(0,180)));technical.append(r)}
 if(!displayed)technical.append(element('p','','No hay atributos textuales disponibles en la capa.'));
 record53(technical,p);card.append(technical);detail.append(card);
 const areaKey=Object.keys(p).find(k=>k.toLowerCase()==='shape_area');const area=areaKey?Number(p[areaKey]):NaN;
 if(Number.isFinite(area)&&area>0){const areaBox=element('div','obs19-stat-card');areaBox.append(element('h3','','Superficie indicada en la fuente'));areaBox.append(element('p','',new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(area/10000)+' hectáreas (valor del atributo Shape_Area, no recalculado ni verificado para publicación).'));technical.append(areaBox)}
 if(data.group){const [key,counts]=data.group;const box=element('div','obs19-stat-card');box.append(element('h3','','Distribución por '+key));const max=Math.max(...Object.values(counts));Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([label,value])=>{const row=element('div','obs19-bar-row');row.append(element('span','',label));const track=element('div','obs19-bar-track');const fill=element('i');fill.style.width=(value/max*100)+'%';track.append(fill);row.append(track,element('strong','',String(value)));box.append(row)});technical.append(box)}
 else{const box=element('div','obs19-stat-card');box.append(element('h3','','Lectura estadística'));box.append(element('p','','Esta capa no contiene suficientes registros o categorías repetidas para un gráfico de distribución confiable. Consulta sus atributos disponibles arriba.'));technical.append(box)}
 const source=element('div','obs19-stat-card');source.append(element('h3','','Fuente y metodología'));source.append(element('p','',e.metadata?.fuenteDeclarada?('Fuente declarada: '+e.metadata.fuenteDeclarada+'. '):'Fuente: capa GeoJSON incorporada al visor. '));source.append(element('p','','Recuentos calculados en el navegador a partir de la capa; no equivalen a cifras aprobadas por la Gobernación.'));technical.append(source)
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
 initText53();updateGeoHelp();
 tileReaderReady=new Promise(resolve=>{const tilesScript=document.createElement('script');tilesScript.src='assets/js/drenaje-pmtiles40.js';tilesScript.onload=()=>resolve(true);tilesScript.onerror=()=>resolve(false);document.head.append(tilesScript)});
 $('geojson-reset')?.addEventListener('click',()=>{for(const state of layerState.values()){state.want=false;state.controller?.abort();state.loading=false}syncLayerControls()});
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
 fetch('datos/piloto_29/catalogo_entrega.json').then(r=>{if(!r.ok)throw Error('Catálogo piloto no disponible');return r.json()}).then(data=>{citizenCatalog=data;renderCitizenLayers()}).catch(()=>{const tree=$('obs19-thematic-tree');tree?.append(element('p','obs19-empty','No se pudo cargar parte del catálogo. Comprueba la conexión y actualiza la página.'))});
 fetch('datos/tanda_1_29/catalogo_entrega.json').then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).then(data=>{tandaCatalog=data;renderCitizenLayers()}).catch(()=>{$('obs19-thematic-tree')?.append(element('p','obs19-empty','No se pudo cargar parte del catálogo. Comprueba la conexión y actualiza la página.'))});
 fetch('datos/tanda_5_29/catalogo_entrega.json').then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).then(data=>{tanda5Catalog=data.map(row=>({...row,lote:5}));renderCitizenLayers()}).catch(()=>{$('obs19-thematic-tree')?.append(element('p','obs19-empty','No se pudo cargar parte del catálogo. Comprueba la conexión y actualiza la página.'))});
 fetch('datos/tanda_4_29/catalogo_entrega.json').then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).then(data=>{tanda4Catalog=data.map(row=>({...row,lote:4}));renderCitizenLayers()}).catch(()=>{$('obs19-thematic-tree')?.append(element('p','obs19-empty','No se pudo cargar parte del catálogo. Comprueba la conexión y actualiza la página.'))});
 fetch('datos/tanda_3_29/catalogo_entrega.json').then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).then(data=>{tanda3Catalog=data.map(row=>({...row,lote:3}));renderCitizenLayers()}).catch(()=>{$('obs19-thematic-tree')?.append(element('p','obs19-empty','No se pudo cargar parte del catálogo. Comprueba la conexión y actualiza la página.'))});
 fetch('datos/tanda_2_29/catalogo_entrega.json').then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).then(data=>{tanda2Catalog=data.map(row=>({...row,lote:2}));renderCitizenLayers()}).catch(()=>{$('obs19-thematic-tree')?.append(element('p','obs19-empty','No se pudo cargar parte del catálogo. Comprueba la conexión y actualiza la página.'))});
 // Categorías del geoportal llevan a sus capas dentro del visor.
 document.querySelectorAll('#categories-grid').forEach(node=>node.addEventListener('click',e=>{if(e.target.closest('[data-open-theme]'))setTimeout(()=>{const t=$('obs19-thematic-tree');t?.querySelectorAll('details').forEach((d,i)=>d.open=i===1)},120)}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
