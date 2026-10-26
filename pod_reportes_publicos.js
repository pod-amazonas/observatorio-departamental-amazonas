/* Integración pública POD: no modifica datos ni gestiona credenciales. */
(()=>{'use strict';
const base='V20_FORMULARIO_BORRADORES/';
const $=id=>document.getElementById(id);
const host=$('pod-reports-live');if(!host)return;
const message=$('pod-live-status'), list=$('pod-live-list');
const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value==null?'':String(value);return el};
const fmtDate=v=>{if(!v)return 'Sin fecha';const date=new Date(String(v).slice(0,10)+'T12:00:00');return Number.isNaN(+date)?String(v):new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'long',year:'numeric'}).format(date)};
function script(src){return new Promise((resolve,reject)=>{const x=document.createElement('script');x.src=src;x.onload=resolve;x.onerror=()=>reject(Error('No se pudo cargar '+src));document.head.append(x)})}
async function getDb(){if(!window.supabase)await script('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');if(!window.POD_CONFIG)await script(base+'config_supabase.js');const cfg=window.POD_CONFIG;if(!cfg?.url||!cfg?.publishableKey)throw Error('Configuración pública de Supabase incompleta');return window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
async function load(){message.textContent='Consultando los reportes publicados...';list.replaceChildren();try{
 const db=await getDb();const [r,i]=await Promise.all([
 db.from('pod_reportes').select('id,indicador_id,anio,trimestre,avance_acumulado,actividades,observaciones,fecha_corte,fecha_publicacion').eq('estado','publicado').order('anio',{ascending:false}).order('trimestre',{ascending:false}),
 db.from('pod_indicadores').select('id,nombre,apuesta_id')]);
 if(r.error)throw r.error;if(i.error)throw i.error;
 const reports=r.data||[];if(!reports.length){message.textContent='No hay reportes publicados para consulta ciudadana.';return}
 const ids=reports.map(x=>x.id);
 const ev=await db.from('pod_evidencias').select('reporte_id,titulo,url_drive').in('reporte_id',ids);
 if(ev.error)throw ev.error;
 const indicators=new Map((i.data||[]).map(x=>[String(x.id),x]));const evidences=new Map();for(const x of ev.data||[]){if(!evidences.has(x.reporte_id))evidences.set(x.reporte_id,[]);evidences.get(x.reporte_id).push(x)}
 for(const r of reports){const info=indicators.get(String(r.indicador_id));const card=document.createElement('article');card.style.cssText='border-top:1px solid #dae9de;padding:16px 0';const title=text('h3',`${r.indicador_id} · ${info?.nombre||'Indicador POD'}`);title.style.margin='0 0 7px';card.append(title);
 const period=text('p',`Periodo: ${r.anio}, trimestre ${r.trimestre} · Corte: ${fmtDate(r.fecha_corte)} · Publicación: ${fmtDate(r.fecha_publicacion)}`);period.style.cssText='font-size:13px;color:#4d6e5b';card.append(period);
 if(r.avance_acumulado!==null&&r.avance_acumulado!==undefined)card.append(text('p',`Valor acumulado reportado: ${r.avance_acumulado} (unidad y cumplimiento pendientes de interpretación según ficha del indicador)`));
 if(r.actividades)card.append(text('p',`Actividades y resultados: ${r.actividades}`));if(r.observaciones)card.append(text('p',`Observaciones: ${r.observaciones}`));
 const docs=evidences.get(r.id)||[];if(docs.length){const h=text('strong','Evidencias documentales');card.append(h);const ul=document.createElement('ul');for(const d of docs){const li=document.createElement('li');let u;try{u=new URL(d.url_drive)}catch{}if(u?.protocol==='https:'&&['drive.google.com','docs.google.com'].includes(u.hostname)){const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=d.titulo||'Abrir documento';li.append(a)}else li.textContent='Enlace no disponible';ul.append(li)}card.append(ul)}
 list.append(card)}message.textContent=`${reports.length} reporte(s) publicado(s) disponible(s).`;
 }catch(e){message.textContent='No fue posible consultar los reportes publicados: '+(e.message||e)+'. Verifica la conexión y las políticas públicas de lectura de Supabase.'}}
 $('pod-live-refresh')?.addEventListener('click',load);load();
})();
