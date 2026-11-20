
/* Demostración de Certificados: geometrías en el navegador, sin validez oficial. */
(function(){
 'use strict';
 let current=0,map=null,geoLayer=null,vertexLayer=null,mode='Point',vertices=[],draftRows=[{lat:'',lon:''}];
 const $=id=>document.getElementById(id);
 const panels=[...document.querySelectorAll('#view-certificados [data-cert13-panel]')];
 const tabs=[...document.querySelectorAll('#view-certificados [data-cert13-step]')];
 const clean=v=>String(v==null?'':v).trim();
 function alertStep(msg){const el=$('cert13-validation');el.hidden=false;el.textContent=msg;}
 function clearAlert(){const el=$('cert13-validation');el.hidden=true;el.textContent='';}
 function coord(){let a=clean($('cert13-lat').value),b=clean($('cert13-lon').value);if(a===''||b==='')return null;let lat=Number(a),lon=Number(b);if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -90||lat>90||lon< -180||lon>180)return null;return [lat,lon];}
 function same(a,b){return Math.abs(a[0]-b[0])<1e-10&&Math.abs(a[1]-b[1])<1e-10;}
 function minRows(){return mode==='Point'?1:mode==='LineString'?2:3;}
 function blankRows(n){return Array.from({length:n},()=>({lat:'',lon:''}));}
 function setDraftFromVertices(){draftRows=vertices.map(([la,lo])=>({lat:String(la),lon:String(lo)}));while(draftRows.length<minRows())draftRows.push({lat:'',lon:''});}
 function parseInput(v,min,max){if(String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max?n:null;}
 function syncFromDraft(){vertices=[];for(const row of draftRows){const la=parseInput(row.lat,-90,90),lo=parseInput(row.lon,-180,180);if(la!==null&&lo!==null)vertices.push([la,lo]);}const first=vertices[0];$('cert13-lat').value=first?String(first[0]):'';$('cert13-lon').value=first?String(first[1]):'';}
 function draftComplete(){return draftRows.length>=minRows()&&draftRows.every(row=>parseInput(row.lat,-90,90)!==null&&parseInput(row.lon,-180,180)!==null);}
 function hasValidGeometry(){if(!draftComplete()||vertices.length!==draftRows.length)return false;if(mode==='Point')return vertices.length===1;
  if(mode==='LineString')return vertices.length>=2 && vertices.some(v=>!same(v,vertices[0]));
  if(vertices.length<3)return false;
  const pts=[...new Set(vertices.map(v=>v.map(c=>c.toFixed(9)).join(',')))];
  if(pts.length<3)return false;
  return Math.abs(planarSignedArea(vertices))>1e-12&&!cert15HasCrossing(vertices);
 }
 function planarSignedArea(a){let s=0;for(let i=0;i<a.length;i++){let p=a[i],q=a[(i+1)%a.length];s+=p[1]*q[0]-q[1]*p[0]}return s/2;}
 function haversine(p,q){const r=6371008.8,t=Math.PI/180,dlat=(q[0]-p[0])*t,dlon=(q[1]-p[1])*t;const h=Math.sin(dlat/2)**2+Math.cos(p[0]*t)*Math.cos(q[0]*t)*Math.sin(dlon/2)**2;return 2*r*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
 function lineLength(p,closed=false){let sum=0;for(let i=1;i<p.length;i++)sum+=haversine(p[i-1],p[i]);if(closed&&p.length>2)sum+=haversine(p[p.length-1],p[0]);return sum;}
 function approxArea(p){if(p.length<3)return 0;let mlat=p.reduce((s,v)=>s+v[0],0)/p.length;let cos=Math.cos(mlat*Math.PI/180),fac=111195;let s=0;for(let i=0;i<p.length;i++){let a=p[i],b=p[(i+1)%p.length];s+=(a[1]*cos*fac)*(b[0]*fac)-(b[1]*cos*fac)*(a[0]*fac);}return Math.abs(s)/2/10000;}
 function geometry(){if(!hasValidGeometry())return null;const pairs=vertices.map(([la,lo])=>[lo,la]);return mode==='Point'?{type:'Point',coordinates:pairs[0]}:mode==='LineString'?{type:'LineString',coordinates:pairs}:{type:'Polygon',coordinates:[[...pairs,pairs[0]]]};}
 function measurement(){if(mode==='Point')return vertices.length===1?'Ubicación puntual registrada.':'Falta registrar el punto.';
  if(mode==='LineString')return vertices.length>=2?'Longitud orientativa: '+(lineLength(vertices)/1000).toLocaleString('es-CO',{maximumFractionDigits:2})+' km':'Agrega al menos 2 vértices para trazar una línea.';
  return hasValidGeometry()?'Superficie orientativa: '+approxArea(vertices).toLocaleString('es-CO',{maximumFractionDigits:3})+' ha · Perímetro: '+(lineLength(vertices,true)/1000).toLocaleString('es-CO',{maximumFractionDigits:2})+' km · Cierre automático':`Agrega al menos 3 vértices distintos para cerrar el polígono (${vertices.length} registrados).`;
 }
 function describeMode(){return mode==='Point'?'Punto':mode==='LineString'?'Línea':'Polígono';}
 function updateGeometryPreview(){
  syncFromDraft();
  const valid=hasValidGeometry(), count=vertices.length;
  $('cert14-counter').textContent=count+' de '+draftRows.length+' pares completos · mínimo '+minRows();
  $('cert14-geometry-status').textContent=valid?'Geometría válida para prueba':draftRows.some(r=>r.lat||r.lon)?'Revisa las coordenadas pendientes':'Pendiente de coordenadas';
  $('cert14-measures').textContent=measurement();
  $('cert14-undo').disabled=!(draftRows.length>minRows()||draftRows.some(r=>r.lat||r.lon));
  $('cert14-clear').disabled=!draftRows.some(r=>r.lat||r.lon)&&draftRows.length===minRows();
  if(map){if(geoLayer){map.removeLayer(geoLayer);geoLayer=null;}if(vertexLayer){map.removeLayer(vertexLayer);vertexLayer=null;}
   vertexLayer=L.layerGroup().addTo(map);
   vertices.forEach((v,i)=>L.circleMarker(v,{radius:6,fillColor:'#ef8839',color:'#ffffff',weight:2,fillOpacity:1}).bindTooltip('Punto '+(i+1),{direction:'top'}).addTo(vertexLayer));
   if(mode==='Point'&&vertices.length){geoLayer=L.circleMarker(vertices[0],{radius:11,fillColor:'#ef8839',color:'#1b6f43',weight:3,fillOpacity:.45}).addTo(map);}
   if(mode==='LineString'&&vertices.length>=2){geoLayer=L.polyline(vertices,{color:'#226ac2',weight:4,opacity:.85}).addTo(map);}
   if(mode==='Polygon'&&vertices.length>=2){geoLayer=valid?L.polygon(vertices,{color:'#24734c',fillColor:'#50a777',fillOpacity:.25,weight:3}).addTo(map):L.polyline(vertices,{color:'#24734c',weight:3,dashArray:'5 5'}).addTo(map);}
  }
 }
 function render(){
  const req=minRows();while(draftRows.length<req)draftRows.push({lat:'',lon:''});
  $('cert14-geometry-title').textContent=mode==='Point'?'Ubicación puntual':mode==='LineString'?'Trazado de línea':'Delimitación del polígono';
  $('cert18-fields-heading').textContent=mode==='Point'?'Coordenadas del punto':mode==='LineString'?'Coordenadas de los puntos de la línea':'Coordenadas de los vértices del polígono';
  $('cert14-instruction').textContent=mode==='Point'?'Registra una latitud y una longitud. Solo se utiliza un punto.':mode==='LineString'?'Registra dos pares de coordenadas como mínimo; añade más puntos para representar cambios de dirección.':'Registra como mínimo tres vértices en orden alrededor del área, o importa la lista desde Excel. El polígono se cierra automáticamente.';
  $('cert13-locate').hidden=mode==='Point';
  $('cert13-locate').textContent=mode==='LineString'?'Agregar otro punto':'Agregar otro vértice';
  $('cert14-undo').textContent=mode==='Polygon'?'Quitar último vértice':'Quitar último punto';
  const list=$('cert14-vertices');list.replaceChildren();
  draftRows.forEach((record,i)=>{
   const row=document.createElement('div');row.className='cert18-row';
   const head=document.createElement('div');head.className='cert18-row-header';const title=document.createElement('strong');
   title.textContent=mode==='Point'?'Punto único':mode==='Polygon'?'Vértice '+(i+1):'Punto '+(i+1);head.append(title);
   if(draftRows.length>req){const rm=document.createElement('button');rm.type='button';rm.className='cert18-remove';rm.textContent='Quitar';rm.setAttribute('aria-label','Quitar coordenadas del '+(mode==='Polygon'?'vértice ':'punto ')+(i+1));rm.addEventListener('click',()=>{draftRows.splice(i,1);render();});head.append(rm);}
   row.append(head);
   for(const [axis,label,min,max,hint] of [['lat','Latitud',-90,90,'-4.215678'],['lon','Longitud',-180,180,'-69.940123']]){
    const lbl=document.createElement('label');lbl.className='cert18-pair';const span=document.createElement('span');span.textContent=label+' (decimal) *';const inp=document.createElement('input');inp.type='number';inp.step='any';inp.min=String(min);inp.max=String(max);inp.inputMode='decimal';inp.placeholder='Ej. '+hint;inp.value=record[axis];inp.setAttribute('aria-label',label+' de '+(mode==='Point'?'punto único':mode==='Polygon'?'vértice '+(i+1):'punto '+(i+1)));
    inp.addEventListener('input',()=>{record[axis]=inp.value;const n=parseInput(inp.value,min,max);inp.setAttribute('aria-invalid',String(inp.value.trim()!==''&&n===null));clearAlert();updateGeometryPreview();});lbl.append(span,inp);row.append(lbl);
   }
   list.append(row);
  });
  updateGeometryPreview();
 }
 function addVertex(p,source){
  const row={lat:p[0].toFixed(6),lon:p[1].toFixed(6)};
  if(mode==='Point')draftRows=[row];
  else{const empty=draftRows.findIndex(x=>x.lat===''&&x.lon==='');if(empty>=0)draftRows[empty]=row;else {if(draftRows.length>=300){alertStep('Para esta prueba se permiten máximo 300 vértices.');return;}draftRows.push(row);}}
  clearAlert();render();$('cert13-map-feedback').textContent=(mode==='Point'?'Punto seleccionado':'Coordenada agregada')+' desde '+source+' · '+row.lat+', '+row.lon;
 }
 function setMode(next){if(!['Point','LineString','Polygon'].includes(next)||next===mode)return;
  if(draftRows.some(r=>r.lat||r.lon)&&!window.confirm('Al cambiar el tipo de geometría se borrarán las coordenadas registradas. ¿Quieres continuar?'))return;
  mode=next;draftRows=blankRows(minRows());vertices=[];$('cert15-excel').hidden=mode!=='Polygon';
  document.querySelectorAll('#view-certificados [data-cert14-mode]').forEach(b=>{const on=b.dataset.cert14Mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('cert13-map-feedback').textContent='Puedes escribir las coordenadas o hacer clic sobre el mapa para completar cada punto.';render();clearAlert();
 }
 function focusGeometry(){if(!map||!vertices.length)return;if(vertices.length===1)map.setView(vertices[0],Math.max(11,map.getZoom()));else map.fitBounds(L.latLngBounds(vertices).pad(.25),{maxZoom:14});}
 function initMap(){const el=$('cert13-map');if(!el)return;if(!window.L){$('cert13-map-feedback').textContent='El mapa necesita internet. Puedes registrar las coordenadas manualmente.';return;}
  if(!map){map=L.map(el,{scrollWheelZoom:false}).setView([-3.88,-70.3],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);map.on('click',e=>addVertex([Number(e.latlng.lat.toFixed(6)),Number(e.latlng.lng.toFixed(6))],'el mapa'));}
  setTimeout(()=>{map.invalidateSize();render();if(vertices.length)focusGeometry();},100);
 }
 function validate(which){if(which===0){let checks=[['cert13-name','Escribe el nombre del proyecto.'],['cert13-desc','Describe el proyecto.'],['cert13-sector','Selecciona el sector del proyecto.']];for(const [id,msg] of checks){if(!clean($(id).value)){alertStep(msg);$(id).focus();return false;}}let a=$('cert13-area').value;if(a!==''&&(!Number.isFinite(Number(a))||Number(a)<0)){alertStep('El área de intervención debe ser mayor o igual que cero.');return false;}}
  if(which===1){const info=window.obs19GetDocs?.();if(!info||!info.complete){alertStep('Selecciona los documentos ficticios de prueba previstos para esta etapa. No cargues datos personales reales.');return false;}}
  if(which===2&&!hasValidGeometry()){alertStep(mode==='Point'?'Agrega una ubicación válida.':mode==='LineString'?'Agrega dos vértices diferentes para la línea.':'Agrega al menos tres vértices distintos que formen un polígono con área.');return false;}
  return true;}
 function summary(){let first=vertices[0];const rows=[['Proyecto',clean($('cert13-name').value)||'Sin diligenciar'],['Descripción',clean($('cert13-desc').value)||'Sin diligenciar'],['Sector',clean($('cert13-sector').value)||'Sin diligenciar'],['Entidad responsable',clean($('cert13-entity').value)||'No indicada'],['Solicitante (prueba)',clean($('cert13-applicant').value)||'No indicado'],['Área declarada por solicitante',clean($('cert13-area').value)?clean($('cert13-area').value)+' ha':'No indicada'],['Tipo de geometría',describeMode()],['Número de vértices',String(vertices.length)],['Primera coordenada',first?first.map(v=>v.toFixed(6)).join(', '):'Sin diligenciar'],['Medición espacial',measurement()],['Soportes señalados',window.obs19GetDocs?.().types.length+' soportes seleccionados (demostración)'],['Archivos locales',window.obs19GetDocs?.().names.length+' seleccionados localmente, no enviados'],['Validación espacial','Sin realizar · sin determinantes oficiales'],['Radicación y emisión','No realizada · solo vista de prueba']];let dl=$('cert13-summary');dl.replaceChildren();rows.forEach(([k,v])=>{let a=document.createElement('dt'),b=document.createElement('dd');a.textContent=k;b.textContent=v;dl.append(a,b);});}

 // Puente de solo lectura para la gestión local archivada.
 window.obs16GetDraft=function(){
  const required=['cert13-name','cert13-desc','cert13-sector'];
  if(required.some(id=>!clean($(id).value)))return {error:'Completa nombre, descripción y sector en la etapa 1.'};
  if(!hasValidGeometry())return {error:'Completa una geometría válida en la etapa 3 (punto, línea o polígono).'};
  return {project:clean($('cert13-name').value).slice(0,130), sector:clean($('cert13-sector').value).slice(0,90),
   entity:clean($('cert13-entity').value).slice(0,130), geometry:geometry(), geometryType:describeMode(), vertexCount:vertices.length,
   docNames:(window.obs19GetDocs?.().names||[]).slice(0,8),
   supportTypes:(window.obs19GetDocs?.().types||[])};
 };
 function show(next,enforce=true){next=Math.max(0,Math.min(panels.length-1,next));if(enforce&&next>current){for(let j=current;j<next;j++)if(!validate(j))return;}current=next;clearAlert();panels.forEach((p,i)=>p.hidden=i!==current);tabs.forEach((t,i)=>{t.classList.toggle('current',i===current);t.removeAttribute('aria-current');if(i===current)t.setAttribute('aria-current','step');});$('cert13-progress').textContent='Etapa '+(current+1)+' de '+panels.length;$('cert13-back').disabled=current===0;$('cert13-next').hidden=current===panels.length-1;if(current===2)initMap();if(current===4)summary();}
 function downloadFile(text,mime,filename){const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}
 function downloadGeoJSON(){let g=geometry();if(!g){alertStep('Completa primero una geometría válida antes de descargar GeoJSON.');return;}clearAlert();const fc={type:'FeatureCollection',features:[{type:'Feature',properties:{nombre:clean($('cert13-name').value)||'Proyecto de prueba',tipo_geometria:mode,advertencia:'NO OFICIAL. Delimitación de demostración sin evaluación ambiental.'},geometry:g}]};downloadFile(JSON.stringify(fc,null,2),'application/geo+json;charset=utf-8','GEOMETRIA_PROYECTO_NO_OFICIAL.geojson');}
 async function importGeoJSON(file){if(!file)return;if(file.size>15*1024*1024){alertStep('GeoJSON demasiado grande (máximo 15 MB).');return;}
  try{const obj=JSON.parse(await file.text());let feature=obj.type==='FeatureCollection'?obj.features?.[0]:obj.type==='Feature'?obj:{geometry:obj};let g=feature?.geometry;if(!g||!['Point','LineString','Polygon'].includes(g.type))throw Error('Solo se admite una geometría Point, LineString o Polygon por archivo.');let coords=g.type==='Point'?[g.coordinates]:g.type==='LineString'?g.coordinates:g.coordinates?.[0];if(!Array.isArray(coords)||coords.length>301)throw Error('Número de vértices no admitido.');if(g.type==='Polygon'&&coords.length>1&&coords[0][0]===coords.at(-1)[0]&&coords[0][1]===coords.at(-1)[1])coords=coords.slice(0,-1);let pts=coords.map(x=>{if(!Array.isArray(x)||x.length<2)throw Error('Coordenadas incompletas.');let lo=Number(x[0]),la=Number(x[1]);if(!Number.isFinite(la)||!Number.isFinite(lo)||la>90||la< -90||lo>180||lo< -180)throw Error('Hay coordenadas fuera de rango.');return[la,lo]});if(g.type==='Point'&&pts.length!==1)throw Error('Punto inválido');if(g.type==='Polygon'&&pts.length<3)throw Error('Un polígono necesita al menos tres vértices.');if(g.type==='LineString'&&pts.length<2)throw Error('Una línea necesita al menos dos vértices.');mode=g.type;vertices=pts;setDraftFromVertices();$('cert15-excel').hidden=mode!=='Polygon';document.querySelectorAll('#view-certificados [data-cert14-mode]').forEach(b=>{let on=b.dataset.cert14Mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});render();if(!hasValidGeometry()){alertStep('El archivo no contiene una geometría válida.');return;}clearAlert();$('cert13-map-feedback').textContent='GeoJSON importado desde este dispositivo, sin enviarlo a un servidor.';initMap();focusGeometry();}
  catch(err){alertStep('No se pudo importar: '+(err.message||'archivo inválido'));}
 }
 function exportText(){summary();const lines=['OBSERVATORIO DEPARTAMENTAL DEL AMAZONAS','RESUMEN DE SOLICITUD DE PRUEBA · NO OFICIAL','NO ES CERTIFICADO NI COMPROBANTE DE RADICACIÓN',''];$('cert13-summary').querySelectorAll('dt').forEach(dt=>lines.push(dt.textContent+': '+dt.nextElementSibling.textContent));lines.push('','VÉRTICES (latitud; longitud)');vertices.forEach((v,i)=>lines.push((i+1)+'. '+v.join('; ')));if(mode==='Polygon'&&vertices.length)lines.push('Cierre del polígono: '+vertices[0].join('; ')+' (automático)');lines.push('','NO SE REALIZARON CRUCES CARTOGRÁFICOS NI EVALUACIÓN AMBIENTAL.');downloadFile(lines.join('\n'),'text/plain;charset=utf-8','RESUMEN_AMBIENTAL_DE_PRUEBA_NO_OFICIAL.txt');}

 // Importación de XLSX desde el dispositivo; no se envía a ningún servidor.
 const cert15TemplateB64='UEsDBBQAAAAIAPCcUF1P3c/64gAAALwBAAAPAAAAeGwvd29ya2Jvb2sueG1stdHBTsMwDAbgV4l8p+mqdu2qZTvAZVfeIE3cNVpjV3EGfXzEQBvixIWb5V+yPv3eH9c4qzdMEpgMbIoSFJJjH+hs4JrHpw6Oh/3av3O6DMwXtcaZpF8NTDkvvdbiJoxWCl6Q1jiPnKLNUnA6a1kSWi8TYo6zrspyq6MNBJ/3blu5T4psRAPPzMkjWW8F1C04eQMbUKkP3sCr9R22bePbuqzrBjv45qS/cHgcg8MXdteIlL88CWebA5NMYRFQ+jfoRJLT1bnAhD9J1Z00+F3T7Yaurcq29n77DyT9qEs/PnH4AFBLAwQUAAAACADwnFBdt+nWhgECAABQDAAADQAAAHhsL3N0eWxlcy54bWzll19v2yAQwL8K4n2xcZp1ikqqNaqlvfSlfdgrsbGDdIAFpCP79JPB/9opW1ots7T5hbsz9/P5OMz55tZLQM/cWKEVxWSRYsRVoUuhaooPrvrwCd9ubvzauiPwxz3nDnkJyq49xXvnmnWS2GLPJbML3XDlJVTaSObsQps6sY3hrLStm4QkS9OPiWRC4ZaoDjKXzqJCH5SjmEyMKA5fSoqzNMUoIre65BSnizRcGCWbm2TAtM6VViNviXtTCP87emZAMSHBz68VkzyatsyAcLrn9R79uIvzfwIUGrRBpt5RnHfXRdDkanW3vD4P3QkxGQJgSMZVTIYAaMeGOceNygUA6uSnY8MpVlrxgdhN/q1TbdiRZKs3+1kNooxx1dsTb5y88P9D/Jzk1/f3v+Z3QsjkTpuSmyGXGR6NcVVGORlmh3XkAI/tvvlavSpzX01KPBS4GkQB0IkR1SmRPkX2j5jSV+/F+2p8ztsBZAJgTQPHh4PccZOHfRtuB2uu1VQTAKN2F2BBPzeE7NQ7XDgE8r+EEPTPIGol+Vi8rDe054YTRfs5Krhy3PRV6qv3rCCZP33/XAgXX8HlTBvgVAiXXsGuH5k3D2cF8RdrOTvjXJkphHlOpnS+b/I3w5on7iNq3Mxd7zBpG0Ib8aovGeyo7TQpfmhjhJfdwbQLsUEd/w02PwBQSwMEFAAAAAgA8JxQXfpcAVkDAwAA2g0AABMAAAB4bC90aGVtZS90aGVtZTEueG1svVfbcpswFPwVRu8NN3PzhGQSx24f0mmnyQ/IIECNEB5Jjp2/7yBuAozjNHbsB0tiz9lF57DC17f7nGiviHFc0BCYVwbQEI2KGNM0BFuRfPPB7c01nIsM5UijMEchWGRQfP/9DLR9TiifwxBkQmzmus6jDOWQXxUbRPc5SQqWQ8GvCpbqMYM7TNOc6JZhuHoOMQVt3iVBOaKClwsRYU/RAbLyWvxilj/8jS8I014hCcEO07jYPaO9ABqBXCwIC4EhP0DTb671NoqIiWAlcCU/TWAdEb9YMpCl6zbSWFr+zOwYJIKIMXDpl98uo0TAKEK0lqOCTcc1fKsBK6hqeCB74Jn2IEBhsMcMgXtvzfoBElUNZ+MbXQXLB6cfIFHV0BkF3BnWfWD3AySqGrqjgNnyzrOW/QCJygimL2O46/m+28BbTFKQHwfxgesa3kOD72C60mpVAip6jfcrSXCEZN/l8G/BVgUVsspQYKqJtw1KYFQ2KCR4zbD2iNNMSB44R/AdQMSPAvQBZ47puwKOUB8hbek6Bl3dDLk1uZh8JBNMyJN4I+iRS3G8IDheYULkREa1pdhkC8Iawh4wZbAb8zpVyrVNwUNggMlc0kEwFdWa6zVPPZyTbf6ziOumN1s7gHMORXfBcBSfaBnkLOWqhhJ3sg7PntDR0Q112CfqkHdyshDf/LCQ4KgQXSkPwVSD5SnhzGq75REkKC4LVifolfUsJQ5mU3dkfXZrTygxz2CMmrzGlJKpZuu68AxFVqR4/mElQTAhpNyqSxRZH9sBof2Ztiv5vebu/sssNoyLB8izCicvtecrVWgCw/kCGqvcmcvR6MM9REmCIjGx0k0fuaizHLz8WXQ5KbYCsacs3mlrsmV/YBwCxzMdA2gx5qIpgBZj1rXP+P2iW4dkk8HayXsPbYWX45ZTESvlDKX357Xidbo6y3H1ftTAtabs1pt+Ei9wPgbKuaT4R+B/1FMrqzz3sanqUOVNGq09Ic++kNF2Xfl1hjps2dJjm9cxORv8gWpWbv4BUEsDBBQAAAAIAPCcUF0NHrnoZQAAAHMAAAAUAAAAeGwvc2hhcmVkU3RyaW5ncy54bWwFwVEKwyAMANCrSP5n3D7GkNqeRdq0CiYWkw2Pv/eWbXJzPxpauyR4+gCOZO9HlSvB187HB7Z1mVHV3OQmGmeCYnZHRN0LcVbfb5LJ7eyDs6nv40K9B+VDC5Fxw1cIb+RcBRyuf1BLAwQUAAAACADwnFBdaJYQifgBAAA5BgAAGAAAAHhsL3dvcmtzaGVldHMvc2hlZXQxLnhtbJ2Va2+bMBSG/4p1vpeLgV6iOFWXadqkTqs6afvsggGrYCP7JGH79ZNNLu3qdMk+4YPf1+d5DZj57dh3ZC2MlVoxSKMEiFClrqRqGKywvriG28V8nG20ebatEEjGvlN2NjJoEYdZHNuyFT23kR6EGvuu1qbnaCNtmtgORvDK2/oupklyGfdcKnAL+rs/pNjYVxVxjZ60fnbFl4pB4tUDV4L8+j50EhmkQFAP96LGpeg6BncUCC9RrsUDV4LBk0bUvZsHYpGjYFAb/VsoIPFiHr/o9ro6kHzyIR4MqUTNVx0+6s1nIZvWNS/8KuOs1J03lLojvXSbB6Tno79uZIUtgzQH0sqqEsrlIOXKou5/bucOy0x2urXTvZ3SM+zZ1p6dYY8PKXzsjxy5K4zeEONFLjG92pn3e+CfSek0dykQyyAHggwsGj+zXnwzlVBu/fXUZa//ENbfc5S4qkKO5RGHVs0bS+zZX0Sg2wj5exGob3DtG0wv53qRBuEnZZq8kl7kEU2ToGEZNlzeRDfFX4436Nkp6FkAnQbRs3PRs6PoefEP9PwU9DyAngXR86PoRRg9/3/04hT0IoCeB9En5RnoYcN7L8zuBNt9vANvxFduGqks6USNDJLoCoiZYvgx6sGPCiDTWbmrWsErYVyVAam1xn0xnRb7v8DiD1BLAwQUAAAACADwnFBdtjZPOTIEAAAbDAAAGAAAAHhsL3dvcmtzaGVldHMvc2hlZXQyLnhtbK2WzW4bNxDHX2WwpwRw9C1bciIHiq24AvQFy0HO4+VIYsqPBcldSz71VPTSS9AX8LEHvUCvehM/SUHKkl11FalAT1zuznDnR878OR8+zqWAjIzlWrWicqEUAalYM66mrSh1k3eN6OPFh/n5vTY/2xmRg7kUyp7PW9HMueS8WLTxjCTagk5IzaWYaCPR2YI206JNDCELblIUK6XSaVEiV5FfMLz9HIxHBhhNMBXuRt//RHw6c62oXI+g6A1jLezzCJL7ICOQOA/jPWdu1ooq9QhmnDFSragUQZxap+XX9bfyyzJr98qze2Xr3iwfci++hBHivkKHfmL0PZhg5EOuNDbOW4iAGnubdjkC24qqEbhWZJ0JX7KLUa89uO32em14+uUPuBwOb646g/ZVewxXnR6Mhr3V79fDwdBHkK3j2K74KX/F4Z0lk6HThmu4ogSNQ0nKoQBGAtoSH7RC+48ViwHlFVF1TVQt/YioGv5fruwE0O2Phje37cFtJzfqZ6/ajldPW6hBkiqnLTAC+kYyERqsVvC5e3nbvewOx7AAq/1LbjJSkKBBSBVCYlK6w/dgU+u4W/21IKEtxFqBS/2oDSOFDG3hx9i1Y7Br+dhjbh1J9LEbmpAhFXPM3YHanh1Ax13KYAFCq2l4JAVTgyzsSMwlCrLw9XrcqMGbzmh8fV6rVk7fHmCqH8NUz2ca+n3LZajnM4wJUscFf8DN4XAD/iyy1Z/G8ZisZxIIluI07BBwxXiMDE8AhSFGTHs5EJCQWS0lOaMPAJ4eA3iaD/i857mIp/mI17sHQsoZgqffvjdLsIBm6b1HfFVpoLzKCV+DBIqm6HiGB5jOjmE628P0nD25UGf/Farc8FTlxv+C1TgGq5GPNTJcktkmUi5dI59uoMFQwh1aD5CEhTSggAlXKM59Ps7IGJTc6yTE3E+CqRar5VQrDZg6LVePjsdBTOkAaPMY0GY+6Bf18t9cyuYeSorJch+/lhrkaqm41FB9VXqMW8eDwC5AaUhSYgSxSR/QWAKr7wyBXS1BcisPVV25dAyit8pjvEQz9VIpAE0841k+6Mb73yojKI65Vgij7Qk9/fod2uxbqhwa6Mxj8vfda+0PFiT4lICsIyjMhZ0foiwfRVnem7IZxpxhfi1u3HbxOqHOEqOddjzRJ0FAGfpzswSCvILqeFN64SgtAalstUQFXltNxpk2dOi68wEfQVfZozOrpeQuvxA3Prto/dXjPGRlqfQqLxebLPAnNkPrEOrQ/3Qo+qOaFG+Ve7U54/uIcGfnI1T3JB/fbSp8Oq0eldfHcF9ZeNNvXw/a78bdm+v2GIrw5bb/9gQY3ZHxhs6gsqFR9nWXGMr4j1SluNN1JjilPpopVxYETVwrKhXOIjBr+PDsdBKe6hHcaee03MxmhIyMn1UjmGjttpN1m7vt8y/+BlBLAwQUAAAAAADwnFBd3bQp4SgBAAAoAQAACwAAAF9yZWxzLy5yZWxz77u/PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48UmVsYXRpb25zaGlwcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9yZWxhdGlvbnNoaXBzIj48UmVsYXRpb25zaGlwIFR5cGU9Imh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9vZmZpY2VEb2N1bWVudC8yMDA2L3JlbGF0aW9uc2hpcHMvb2ZmaWNlRG9jdW1lbnQiIFRhcmdldD0iL3hsL3dvcmtib29rLnhtbCIgSWQ9IlI1OGZhYzhmYzhlYWU0MzUwIiAvPjwvUmVsYXRpb25zaGlwcz5QSwMEFAAAAAgA8JxQXUTJuTkjAQAAkQMAABoAAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc7XTPW7DIBwF8Ksg9hrHxoCjOFm6dE1zAWz+/lD4sIC0ztk69Ei9QtW0quyqQxYvDA/p6ceT+Hh73x0mo9EL+DA4W+FNkmIEtnFqsF2FL7F9EPiw3x1Byzg4G/phDGgy2oYK9zGOW0JC04ORIXEj2Mno1nkjY0ic78gom7PsgGRpyoifd+BlJzpdR7in0bXt0MCjay4GbPynmIR41RAwOknfQawwmfRPlkxGY/SkKnzMKJWC53nN8oKWjGNEVgPFHgwsPbfo+9zMVJwWkqua5i2TlAmxpir00oN6jn6w3d+15lcznpC8lBRKytqUUq7W5L06fw49QFzSfuOvBwDE+XpSCeC8UJymlBaw6np38rIZr1ZlIcpa8CzlVCl245HFx9p/AlBLAwQUAAAACADwnFBdoTvPThsBAADcAwAAEwAAAFtDb250ZW50X1R5cGVzXS54bWy1k0FOwzAQRa8SeYtit10ghJJ2AWwBCS5gOZPEqj22PJOSno0FR+IKqC6qACFFVduNZzN+7//FfL5/VKvRu2IDiWzAWszlTBSAJjQWu1oM3JY3YrWsXrcRqBi9Q6pFzxxvlSLTg9ckQwQcvWtD8ppJhtSpqM1ad6AWs9m1MgEZkEveMcSyuodWD46Lh5EB99rRO1Hc7fd2qlroGJ01mm1AtcHmj6QMbWsNNMEMHpAlxQS6oR6AvZN5Sq8tXmWw+teZwNFx0u9WMoHLO9TbSAfF0wZSsg0Uzzrxo/ZQCzU6Rbx1QPLMDTN0Ss09eNi/85MDZMxk2V4naF44WezO3vkneyrIW0jr/JFUHqf3/x3mwD82yOLiQVS+1eUXUEsBAhQDFAAAAAgA8JxQXU/dz/riAAAAvAEAAA8AAAAAAAAAAAAAAKSBAAAAAHhsL3dvcmtib29rLnhtbFBLAQIUAxQAAAAIAPCcUF236daGAQIAAFAMAAANAAAAAAAAAAAAAACkgQ8BAAB4bC9zdHlsZXMueG1sUEsBAhQDFAAAAAgA8JxQXfpcAVkDAwAA2g0AABMAAAAAAAAAAAAAAKSBOwMAAHhsL3RoZW1lL3RoZW1lMS54bWxQSwECFAMUAAAACADwnFBdDR656GUAAABzAAAAFAAAAAAAAAAAAAAApIFvBgAAeGwvc2hhcmVkU3RyaW5ncy54bWxQSwECFAMUAAAACADwnFBdaJYQifgBAAA5BgAAGAAAAAAAAAAAAAAApIEGBwAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1sUEsBAhQDFAAAAAgA8JxQXbY2TzkyBAAAGwwAABgAAAAAAAAAAAAAAKSBNAkAAHhsL3dvcmtzaGVldHMvc2hlZXQyLnhtbFBLAQIUAxQAAAAAAPCcUF3dtCnhKAEAACgBAAALAAAAAAAAAAAAAACkgZwNAABfcmVscy8ucmVsc1BLAQIUAxQAAAAIAPCcUF1Eybk5IwEAAJEDAAAaAAAAAAAAAAAAAACkge0OAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc1BLAQIUAxQAAAAIAPCcUF2hO89OGwEAANwDAAATAAAAAAAAAAAAAACkgUgQAABbQ29udGVudF9UeXBlc10ueG1sUEsFBgAAAAAJAAkASQIAAJQRAAAAAA==';
 const xmlChildren=(node,name)=>Array.from(node?.children||[]).filter(n=>n.localName===name);
 const xmlDesc=(node,name)=>Array.from(node?.getElementsByTagName('*')||[]).filter(n=>n.localName===name);
 const firstXml=(node,name)=>xmlDesc(node,name)[0]||null;
 function parseXml(text,label){const d=new DOMParser().parseFromString(text,'application/xml');if(d.querySelector('parsererror'))throw new Error('El Excel contiene XML no válido ('+label+').');return d;}
 function cert15Status(message,error=false){const el=$('cert15-xlsx-status');el.textContent=message;el.classList.toggle('error',error);el.classList.toggle('success',!error&&message.startsWith('Importación completada'));}
 function cert15Number(value){let s=String(value==null?'':value).trim().replace(/\s+/g,'').replace(/−/g,'-');
  if(!s)return NaN;
  if(s.includes(',')&&!s.includes('.'))s=s.replace(',','.');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))return NaN;
  return Number(s);
 }
 function cert15Norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();}
 function cert15SheetPath(target){
  if(target.startsWith('/'))return target.replace(/^\/+/, '');
  let bits=['xl'];for(const v of target.split('/')){if(v==='..')bits.pop();else if(v!=='.'&&v)bits.push(v)}return bits.join('/');
 }
 async function cert15ReadWorkbook(file){
  if(!window.JSZip)throw new Error('No se encuentra el lector Excel integrado. Abre la última versión de la página.');
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  const total=Object.values(zip.files).reduce((sum,f)=>sum+(f._data?.uncompressedSize||0),0);
  if(total>25*1024*1024)throw new Error('El archivo Excel descomprimido es demasiado grande para esta prueba (máximo 25 MB).');
  const wbFile=zip.file('xl/workbook.xml');
  if(!wbFile)throw new Error('El archivo no parece ser un libro Excel .xlsx válido.');
  const wbXml=parseXml(await wbFile.async('string'),'libro');
  const sheetNodes=xmlDesc(wbXml,'sheet');
  if(!sheetNodes.length)throw new Error('El Excel no tiene hojas de trabajo.');
  const mainSheet=sheetNodes.find(s=>cert15Norm(s.getAttribute('name'))==='coordenadas')||sheetNodes[0];
  const relId=mainSheet.getAttribute('r:id')||mainSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const relFile=zip.file('xl/_rels/workbook.xml.rels');let path='xl/worksheets/sheet1.xml';
  if(relFile){const relXml=parseXml(await relFile.async('string'),'relaciones');const match=xmlDesc(relXml,'Relationship').find(n=>n.getAttribute('Id')===relId);if(match)path=cert15SheetPath(match.getAttribute('Target')||'');}
  const sheetFile=zip.file(path);
  if(!sheetFile)throw new Error('No fue posible encontrar la hoja de coordenadas del Excel.');
  let shared=[];
  if(zip.file('xl/sharedStrings.xml')){
   const sx=parseXml(await zip.file('xl/sharedStrings.xml').async('string'),'textos');
   shared=xmlDesc(sx,'si').map(si=>xmlDesc(si,'t').map(t=>t.textContent).join(''));
  }
  const doc=parseXml(await sheetFile.async('string'),'coordenadas');const rows=[];
  const rowNodes=xmlDesc(doc,'sheetData').flatMap(n=>xmlChildren(n,'row'));
  if(rowNodes.length>2500)throw new Error('El archivo contiene demasiadas filas. Utiliza un Excel con máximo 300 vértices.');
  for(const row of rowNodes){const vals={};let fallbackColumn=0;
   for(const cell of xmlChildren(row,'c')){
    const cref=cell.getAttribute('r')||'';let letters=(cref.match(/^[A-Z]+/i)||[])[0];
    if(!letters){letters=String.fromCharCode(65+fallbackColumn)}
    fallbackColumn++;
    const kind=cell.getAttribute('t');const v=firstXml(cell,'v');let value=v?v.textContent:'';
    if(kind==='s')value=shared[Number(value)]||'';
    else if(kind==='inlineStr')value=xmlDesc(cell,'t').map(x=>x.textContent).join('');
    vals[letters.toUpperCase()]=value;
   }
   if(Object.values(vals).some(v=>String(v).trim()!==''))rows.push({number:Number(row.getAttribute('r'))||rows.length+1,values:vals});
  }
  if(!rows.length)throw new Error('No se encontraron coordenadas en el archivo.');
  const header=rows.find((row,idx)=>idx<20&&Object.values(row.values).some(v=>cert15Norm(v)==='latitud'||cert15Norm(v)==='latitude'||cert15Norm(v)==='lat'));
  if(!header)throw new Error('No se encontró la columna Latitud. Utiliza los encabezados Orden, Latitud, Longitud de la plantilla.');
  const headerFields=Object.entries(header.values);
  const latCol=headerFields.find(([col,v])=>['latitud','latitude','lat','latituddecimal','latitude_decimal'].includes(cert15Norm(v)))?.[0];
  const lonCol=headerFields.find(([col,v])=>['longitud','longitude','lon','long','longituddecimal'].includes(cert15Norm(v)))?.[0];
  const orderCol=headerFields.find(([col,v])=>['orden','ordenvertice','ndepunto','numerodepunto','numero','n','secuencia','vertice','idvertice'].includes(cert15Norm(v)))?.[0];
  if(!latCol||!lonCol)throw new Error('El Excel debe tener las columnas Latitud y Longitud (grados decimales).');
  const data=rows.filter(row=>row.number>header.number&&([latCol,lonCol,orderCol].some(col=>col&&String(row.values[col]||'').trim()!=='')));
  if(data.length>301)throw new Error('Hay más de 300 vértices. Reduce la cantidad de filas.');
  const problems=[];const points=[];
  for(const row of data){
   let lat=cert15Number(row.values[latCol]),lon=cert15Number(row.values[lonCol]);
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){problems.push('Fila '+row.number+': Latitud o Longitud vacía, no numérica o fuera del rango WGS84.');continue;}
   let seq=orderCol?cert15Number(row.values[orderCol]):row.number;
   if(!Number.isFinite(seq)){problems.push('Fila '+row.number+': el campo Orden debe ser numérico.');continue;}
   points.push({point:[lat,lon],order:seq,row:row.number});
  }
  if(problems.length)throw new Error(problems.slice(0,4).join(' ') +(problems.length>4?' Hay más errores.':''));
  if(orderCol){const seen=new Set();for(const p of points){if(seen.has(p.order))throw new Error('La columna Orden contiene números repetidos.');seen.add(p.order);}points.sort((a,b)=>a.order-b.order);}
  let pts=points.map(x=>x.point);
  if(pts.length>3&&same(pts[0],pts[pts.length-1]))pts=pts.slice(0,-1);
  if(pts.length>300)throw new Error('El archivo supera el máximo de 300 vértices.');
  if(pts.length<3)throw new Error('El polígono necesita al menos 3 vértices distintos.');
  if(new Set(pts.map(p=>p.map(v=>v.toFixed(9)).join(','))).size!==pts.length)throw new Error('Se detectaron coordenadas repetidas. Revisa los vértices del polígono.');
  if(Math.abs(planarSignedArea(pts))<1e-12)throw new Error('Los vértices no delimitan un área: verifica el orden de las coordenadas.');
  if(cert15HasCrossing(pts))throw new Error('El polígono se cruza sobre sí mismo. Revisa la secuencia de vértices en la columna Orden.');
  return {pts,sheet:mainSheet.getAttribute('name')||'Hoja1',ordered:!!orderCol};
 }
 function cert15HasCrossing(pts){
  // planar intersection in longitude/latitude, sufficient for a local WGS84 sketch.
  const ccw=(a,b,c)=>(b[1]-a[1])*(c[0]-a[0])-(b[0]-a[0])*(c[1]-a[1]);
  const between=(a,b,c)=>c>=Math.min(a,b)-1e-10&&c<=Math.max(a,b)+1e-10;
  const on=(a,b,p)=>Math.abs(ccw(a,b,p))<1e-10&&between(a[0],b[0],p[0])&&between(a[1],b[1],p[1]);
  const crosses=(a,b,c,d)=>{
   const s1=ccw(a,b,c),s2=ccw(a,b,d),s3=ccw(c,d,a),s4=ccw(c,d,b);
   if(s1*s2<0&&s3*s4<0)return true;
   return (Math.abs(s1)<1e-10&&on(a,b,c))||(Math.abs(s2)<1e-10&&on(a,b,d))||(Math.abs(s3)<1e-10&&on(c,d,a))||(Math.abs(s4)<1e-10&&on(c,d,b));
  };
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
   if(j===i+1||(i===0&&j===pts.length-1))continue;
   if(crosses(pts[i],pts[(i+1)%pts.length],pts[j],pts[(j+1)%pts.length]))return true;
  }return false;
 }
 async function cert15UploadXlsx(file){if(!file)return;
  if(mode!=='Polygon'){cert15Status('Selecciona Polígono antes de importar un Excel.',true);return;}
  if(!/\.xlsx$/i.test(file.name)){cert15Status('Este lector admite Excel .xlsx. Si es .xls, guarda una copia como .xlsx.',true);return;}
  if(file.size>5*1024*1024){cert15Status('El archivo supera los 5 MB permitidos. Reduce su tamaño.',true);return;}
  cert15Status('Leyendo '+file.name+' en tu navegador…');
  try{const result=await cert15ReadWorkbook(file);
   if(vertices.length&&!window.confirm('El Excel sustituirá los '+vertices.length+' vértices actuales. ¿Quieres continuar?')){cert15Status('Importación cancelada: se conservaron los vértices anteriores.');return;}
   vertices=result.pts;setDraftFromVertices();
   $('cert13-lat').value=vertices[0][0].toFixed(6);$('cert13-lon').value=vertices[0][1].toFixed(6);
   render();clearAlert();initMap();focusGeometry();
   const msg='Importación completada: '+vertices.length+' vértices de «'+file.name+'» (hoja «'+result.sheet+'»). Polígono dibujado. '+(result.ordered?'Se respetó la columna Orden.':'Se respetó el orden de las filas.');
   cert15Status(msg);$('cert13-map-feedback').textContent=msg;
  }catch(err){cert15Status('No se pudo cargar el Excel: '+(err.message||'formato incorrecto'),true);}
 }
 function cert15DownloadTemplate(){
  const raw=atob(cert15TemplateB64);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download='PLANTILLA_COORDENADAS_POLIGONO_AMAZONAS.xlsx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
 }

 function init(){if(!panels.length)return;$('cert13-back').addEventListener('click',()=>show(current-1,false));$('cert13-next').addEventListener('click',()=>show(current+1,true));tabs.forEach(t=>t.addEventListener('click',()=>show(Number(t.dataset.cert13Step),true)));document.querySelectorAll('#view-certificados [data-cert14-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.cert14Mode)));
  $('cert13-locate').addEventListener('click',()=>{if(mode==='Point')return;if(draftRows.length>=300){alertStep('Máximo 300 vértices.');return;}draftRows.push({lat:'',lon:''});render();const rows=document.querySelectorAll('#cert14-vertices .cert18-row');rows[rows.length-1]?.querySelector('input')?.focus();});$('cert14-undo').addEventListener('click',()=>{if(draftRows.length>minRows())draftRows.pop();else draftRows[draftRows.length-1]={lat:'',lon:''};render();});$('cert14-clear').addEventListener('click',()=>{draftRows=blankRows(minRows());vertices=[];render();clearAlert();});$('cert14-fit').addEventListener('click',focusGeometry);$('cert14-export-geojson').addEventListener('click',downloadGeoJSON);$('cert14-import-geojson').addEventListener('change',async e=>{await importGeoJSON(e.target.files[0]);e.target.value='';});
  $('cert13-files').addEventListener('change',e=>{const f=[...e.target.files];if(f.length>5){alertStep('Máximo 5 archivos.');e.target.value='';$('cert13-file-status').textContent='Sin archivos seleccionados.';return;}if(f.some(x=>x.size>15*1024*1024||!/\.(pdf|png|jpe?g)$/i.test(x.name))){alertStep('Selecciona PDF, JPG o PNG de hasta 15 MB cada uno.');e.target.value='';return;}clearAlert();$('cert13-file-status').textContent=f.length?f.length+' archivo(s) seleccionado(s), no enviado(s).':'No se han seleccionado archivos.';});$('cert13-export').addEventListener('click',exportText);$('cert15-xlsx-file').addEventListener('change',async e=>{const f=e.target.files[0];await cert15UploadXlsx(f);e.target.value='';});$('cert15-xlsx-template').addEventListener('click',()=>{const a=document.createElement('a');a.href='plantilla_coordenadas_pod.xlsx';a.download='PLANTILLA_COORDENADAS_POD.xlsx';document.body.appendChild(a);a.click();a.remove();});
  render();show(0,false);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

