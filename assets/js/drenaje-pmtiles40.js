/* POC Drenaje_Doble. Dos geometrías corregidas en copias; no apto para conteos ni navegación. */
(function(){'use strict';
const ID=-40, key='drenaje_doble_pmtiles', base=new URL('../../',document.currentScript.src), url=new URL('datos/teselas_40/drenaje_doble.pmtiles',base).href;
let meta=null,loading=false,controller=null,sequence=0,vendorPromise=null,error='';
const entries=()=>window.obs19Api?.getLayers?.()||[];
const active=()=>entries().find(e=>e.id===ID);
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
function vendor(){
 if(window.protomapsL)return Promise.resolve();
 if(!vendorPromise)vendorPromise=new Promise((resolve,reject)=>{const s=el('script');s.src=new URL('vendor/protomaps-leaflet-5.1.0/protomaps-leaflet.js',base).href;
 s.onload=resolve;s.onerror=()=>{s.remove();vendorPromise=null;reject(Error('No se pudo cargar el lector local de teselas'))};document.head.append(s)});
 return vendorPromise;
}
function sync(){
 const card=document.querySelector('[data-pmtiles-layer]');if(!card)return;
 const entry=active(),on=!!entry?.visible,sw=card.querySelector('[role="switch"]');sw.disabled=!meta;sw.setAttribute('aria-checked',String(on));sw.setAttribute('aria-busy',String(loading));sw.querySelector('.obs32-switch-state').textContent=on?'Encendida':'Apagada';
 card.querySelector('[role="status"]').textContent=error||(loading?'Cargando teselas… Pulsa para cancelar.':on?'Drenaje visible. Sin conteos de entidades ni cálculos de superficies.':'Se descarga solo al activarla.');
 const slider=card.querySelector('input');slider.disabled=!on;slider.value=String(100-(entry?.opacity??65));slider.nextElementSibling.textContent=slider.value+'%';card.querySelector('[data-zoom]').disabled=!meta;
}
function mount(){
 const parent=document.querySelector('[data-citizen-category="0"]');if(!parent)return;
 if(!parent.querySelector('[data-pmtiles-layer]')){
  const card=el('div');card.dataset.pmtilesLayer=key;card.className='obs20-pilot-card obs32-layer-card';
  const title=el('h4','Drenaje doble · teselas');title.className='obs32-layer-title';card.append(title);
  card.append(el('p','IGAC 2022 · según ficha POD 013 · 92 entidades; originales conservados.'));
  card.append(el('p','Río Caquetá (484) y Río Putumayo (2165): corrección topológica MakeValid en copias autorizada. No acredita navegabilidad ni límites.'));
  const sw=el('button');sw.type='button';sw.className='obs32-layer-switch';sw.setAttribute('role','switch');sw.setAttribute('aria-checked','false');sw.setAttribute('aria-label','Mostrar u ocultar drenaje doble en teselas');
  const track=el('span');track.className='obs32-switch-track';track.setAttribute('aria-hidden','true');const text=el('span','Apagada');text.className='obs32-switch-state';sw.append(track,text);sw.onclick=()=>toggle(loading?false:!active());card.append(sw);
  const legend=el('p');const symbol=el('span','■ ');symbol.style.color='#156f99';symbol.setAttribute('aria-hidden','true');legend.append(symbol,document.createTextNode('Leyenda: superficies de drenaje doble.'));card.append(legend);
  card.append(el('p','Detalle por zoom 5–12. Al acercar más no aumenta la precisión. Visualización sin consulta individual.'));
  const status=el('p');status.id='estado-pmtiles40';status.setAttribute('role','status');sw.setAttribute('aria-describedby',status.id);card.append(status);
  const tools=el('div');tools.className='obs20-pilot-tools';const zoom=el('button','Centrar Amazonas ↗');zoom.type='button';zoom.dataset.zoom='';zoom.onclick=()=>toggle(true,true);tools.append(zoom);
  const label=el('label','Transparencia');label.className='obs20-range-label';const input=el('input');input.type='range';input.min='0';input.max='100';input.step='5';input.setAttribute('aria-label','Transparencia del drenaje en teselas');const output=el('output');
  input.oninput=()=>{const entry=active();if(entry){entry.opacity=100-Number(input.value);entry.layer.setOpacity(entry.opacity/100);output.textContent=input.value+'%'}};label.append(input,output);tools.append(label);card.append(tools);parent.append(card);
 }
 sync();
}
async function range(offset,length,signal,size,etag){
 if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<1||length>8_000_000)throw Error('Rango de teselas no permitido');
 const end=Math.min(offset+length-1,size-1);
 const response=await fetch(url,{headers:{Range:'bytes='+offset+'-'+end,...(etag?{'If-Match':etag}:{})},signal});
 const expected='bytes '+offset+'-'+end+'/'+size;
 if(response.status!==206){await response.body?.cancel();if(response.status===200)throw Error('El alojamiento no sirve rangos HTTP 206 correctamente. No se descargará el archivo completo.');throw Error('Archivo de teselas no disponible (HTTP '+response.status+')')}
 if(response.headers.get('Content-Range')!==expected){await response.body?.cancel();throw Error('El alojamiento devolvió un rango distinto al solicitado')}
 if(etag&&response.headers.get('ETag')&&response.headers.get('ETag')!==etag){await response.body?.cancel();throw Error('Cambió el archivo de teselas; vuelve a activarlo')}
 const bytes=await response.arrayBuffer();if(bytes.byteLength!==end-offset+1)throw Error('Rango incompleto de teselas');
 return {data:bytes,etag:response.headers.get('ETag')||undefined,cacheControl:response.headers.get('Cache-Control')||undefined,expires:response.headers.get('Expires')||undefined};
}
async function mapReady(signal){
 const until=performance.now()+8000;
 while(!window.obs19Api?.getMap?.()){if(signal.aborted)throw new DOMException('Cancelado','AbortError');if(performance.now()>until)throw Error('No se pudo iniciar el mapa');await new Promise(r=>setTimeout(r,40))}
 return window.obs19Api.getMap();
}
function center(){const b=meta.departamento_bbox;window.obs19Api.getMap().fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[16,16],maxZoom:8,animate:false})}
function remove(){if(active())window.obs19Api.remove(ID)}
async function toggle(want,zoom=false){
 if(!meta)return;
 if(!want){sequence++;controller?.abort();loading=false;remove();error='';sync();return}
 if(active()){if(zoom)center();return}
 if(loading)return;
 const serial=++sequence;controller=new AbortController();const signal=controller.signal;loading=true;error='';sync();let layer=null;
 const fail=err=>{if(serial!==sequence||signal.aborted||err.name==='AbortError')return;error='No se pudo cargar el drenaje: '+String(err.message||err)+'. Puedes reintentar.';sequence++;controller.abort();loading=false;remove();if(layer)layer.remove();sync()};
 try{
  await vendor();if(signal.aborted)return;const map=await mapReady(signal);
  const reader=new protomapsL.PmtilesSource(url,false).p;
  reader.source={getKey:()=>url,getBytes:async(offset,length,incoming,etag)=>{
   const child=new AbortController(),abort=()=>child.abort();signal.addEventListener('abort',abort,{once:true});incoming?.addEventListener('abort',abort,{once:true});if(signal.aborted||incoming?.aborted)abort();
   try{return await range(offset,length,child.signal,meta.bytes,etag)}finally{signal.removeEventListener('abort',abort);incoming?.removeEventListener('abort',abort)}
  }};
  const h=await reader.getHeader();if(h.minZoom!==5||h.maxZoom!==12||h.tileType!==1)throw Error('Cabecera de teselas no compatible');
  if(signal.aborted||serial!==sequence)return;
  if(entries().length>=8)throw Error('Ya se alcanzó el máximo de 8 capas');
  const bounds=L.latLngBounds([[meta.bbox[1],meta.bbox[0]],[meta.bbox[3],meta.bbox[2]]]);
  layer=protomapsL.leafletLayer({url:reader,levelDiff:0,maxDataZoom:12,minZoom:5,maxNativeZoom:12,maxZoom:18,noWrap:true,bounds,opacity:.65,attribution:'',paintRules:[{dataLayer:'drenaje',symbolizer:new protomapsL.PolygonSymbolizer({fill:'#156f99',stroke:'#156f99',width:.7,opacity:.52})}],labelRules:[],tileDelay:1});
  // El lector registra errores, pero su renderizador canvas los consume. Se
  // propagan al estado de la capa para evitar una falsa carga vacía exitosa.
  for(const view of layer.views.values()){
   const source=view.tileCache.source,get=source.get.bind(source);
   source.get=async(...args)=>{try{return await get(...args)}catch(err){fail(err);throw err}};
  }
  layer.getBounds=()=>bounds;
  layer.setStyle=style=>layer.setOpacity(Math.min(1,Math.max(0,(style.fillOpacity??.338)/.52)));
  const entry={id:ID,idCitizen:key,name:meta.nombre+' · IGAC 2022',origin:meta.fuente,visible:true,opacity:65,layer,data:null,count:0,geomType:'Teselas vectoriales',color:'#156f99',vectorTiles:true,metadata:{fuenteDeclarada:meta.fuente,advertencia:meta.advertencia}};
  const ready=map.getZoom()>=5&&map.getBounds().intersects(bounds)?new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);resolve()};const timer=setTimeout(()=>reject(Error('Tiempo de carga de teselas agotado')),20000);layer.once('load',done);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Cancelado','AbortError'))},{once:true})}):Promise.resolve();
  entries().push(entry);layer.on('remove',()=>{if(active()===entry){controller?.abort();loading=false}sync()});
  layer.addTo(map);window.obs19Api.redraw();await ready;
  if(serial!==sequence||signal.aborted)return;
  loading=false;sync();window.obs19Api.redraw();if(zoom)center();
 }catch(err){fail(err)}
}
window.obs40Mount=mount;window.obs40Sync=sync;
window.obs40Cancel=()=>{if(loading||active())toggle(false)};
fetch(new URL('datos/teselas_40/catalogo.json',base)).then(r=>{if(!r.ok)throw Error('Ficha de drenaje no disponible');return r.json()}).then(data=>{if(data.entidades!==92||![484,2165].every(id=>data.ids_seleccionados?.includes(id)&&data.reparados_autorizados?.includes(id))||data.minzoom!==5||data.maxzoom!==12||!Number.isSafeInteger(data.bytes)||data.bytes<127)throw Error('Ficha de drenaje incorrecta');meta=data;mount()}).catch(err=>{error=err.message;mount()});
mount();
document.getElementById('geojson-reset')?.addEventListener('click',()=>{sequence++;controller?.abort();loading=false;error='';sync()});
})();
