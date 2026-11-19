/* Presentación del Geovisor; no modifica capas ni coordenadas. */
(function(){'use strict';
function init(){
 const root=document.querySelector('#view-geovisor .geo-workspace');if(!root)return;
 const sidebar=root.querySelector('.geo-sidebar'),stage=root.querySelector('.map-stage'),stats=root.querySelector('.obs19-stat-panel');
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e};
 root.classList.add('geo-public58');sidebar.id='geo-layers58';
 const legacySend=document.getElementById('cert16-summary-send');if(legacySend){legacySend.disabled=true;legacySend.textContent='Disponible próximamente'}
 const bar=make('div');bar.className='geo-controls58';
 const layers=make('button','Ocultar capas');layers.type='button';layers.id='geo-layers-toggle58';layers.setAttribute('aria-controls',sidebar.id);layers.setAttribute('aria-expanded','true');
 const full=make('button','Pantalla completa');full.type='button';full.id='geo-fullscreen58';full.setAttribute('aria-pressed','false');
 const help=make('details');help.className='geo-help58';help.append(make('summary','Ayuda'));
 help.append(make('p','Enciende una capa para verla. Toca el mapa para consultar. Las cifras calculadas en el navegador no son oficiales.'));
 bar.append(layers,full,help);root.prepend(bar);
 const statsFold=make('details');statsFold.id='geo-stats58';statsFold.append(make('summary','Estadísticas por capa'));stats.before(statsFold);statsFold.append(stats);
 // La leyenda sigue disponible, con sus colores y nombres, sin quitar espacio al mapa.
 const legend=stage.querySelector('.map-legend'),legendFold=make('details');legendFold.className='geo-legend58';legendFold.append(make('summary','Leyenda y mediciones'));legend.before(legendFold);legendFold.append(legend);
 const tools=make('details');tools.className='geo-tools58';tools.append(make('summary','Herramientas del mapa'));stage.prepend(tools);for(const selector of ['.map-toolbar','.map-interaction-bar'])tools.append(stage.querySelector(selector));
 const upload=sidebar.querySelector('label[for="geojson-upload"]'),filesFold=make('details');filesFold.className='geo-files58';filesFold.append(make('summary','Archivos de tu equipo'));
 const first=upload.previousElementSibling,last=sidebar.querySelector('.side-info');first.before(filesFold);
 let node=first;while(node&&node!==last){const next=node.nextSibling;filesFold.append(node);node=next}
 sidebar.querySelector('.panel-title').after(document.getElementById('geojson-reset'));
 // Guardar las indicaciones completas en la ayuda; en pantalla queda una frase.
 const instructions=sidebar.querySelector('.geo-side-muted');if(instructions){help.append(make('p',instructions.textContent));instructions.textContent='Abre una temática y enciende sus capas.'}
 const heading=document.querySelector('#view-geovisor .page-heading p');heading.textContent='Explora las capas del territorio.';
 let frame=0;const resize=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>window.obs19Api?.getMap?.()?.invalidateSize({pan:false}))};
 layers.addEventListener('click',()=>{const open=layers.getAttribute('aria-expanded')!=='true';layers.setAttribute('aria-expanded',String(open));layers.textContent=open?'Ocultar capas':'Mostrar capas';sidebar.hidden=!open;root.classList.toggle('layers-closed58',!open);resize()});
 root.addEventListener('toggle',resize,true);window.addEventListener('resize',resize);
 if(window.ResizeObserver)new ResizeObserver(resize).observe(root.querySelector('#visor-map'));
 let expanded=false,savedOverflow='',savedScroll=0,savedLayers=null,inert=[];
 function setExpanded(on){
  if(expanded===on)return;expanded=on;root.classList.toggle('is-expanded58',on);full.textContent=on?'Salir de pantalla completa':'Pantalla completa';full.setAttribute('aria-pressed',String(on));
  if(on){savedLayers=layers.getAttribute('aria-expanded');if(matchMedia('(max-width:760px)').matches&&savedLayers==='true')layers.click();savedOverflow=document.body.style.overflow;savedScroll=scrollY;document.body.style.overflow='hidden';
   for(let child=root,parent=child.parentElement;parent;child=parent,parent=parent.parentElement)for(const sibling of parent.children)if(sibling!==child){inert.push([sibling,sibling.inert]);sibling.inert=true}
  }else{document.body.style.overflow=savedOverflow;for(const [e,value]of inert)e.inert=value;inert=[];if(savedLayers!==null&&layers.getAttribute('aria-expanded')!==savedLayers)layers.click();savedLayers=null;window.scrollTo(0,savedScroll);full.focus({preventScroll:true})}
  resize();
 }
 async function leave(){if(document.fullscreenElement===root)try{await document.exitFullscreen()}catch{}setExpanded(false)}
 full.addEventListener('click',async()=>{if(expanded)return leave();setExpanded(true);try{if(root.requestFullscreen)await root.requestFullscreen()}catch{/* Respaldo dentro de la ventana para navegadores sin permiso o API. */}resize()});
 document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement===root){if(!expanded||location.hash!=='#geovisor')leave()}else if(expanded)setExpanded(false);resize()});
 root.addEventListener('keydown',e=>{if(!expanded)return;if(e.key==='Escape'){e.preventDefault();leave();return}if(e.key!=='Tab')return;
  const controls=[...root.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(e=>!e.disabled&&e.tabIndex>=0&&e.checkVisibility({visibilityProperty:true}));
  const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
 });
 window.addEventListener('hashchange',()=>{if(location.hash!=='#geovisor'&&expanded)leave()});
 resize();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
