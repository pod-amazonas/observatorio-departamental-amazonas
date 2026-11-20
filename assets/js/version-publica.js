/* Etiqueta de publicación compartida por los avisos y títulos del sitio. */
(function(){'use strict';
 const etiqueta='Versión inicial · en actualización permanente';
 window.POD_PUBLICACION=Object.freeze({
  etiqueta,
  titulo(base){document.title=base+' · '+etiqueta;}
 });
 function mostrar(){
  document.querySelectorAll('[data-publicacion]').forEach(el=>{
   el.textContent=el.dataset.publicacion==='corta'?etiqueta.split(' · ')[0]:etiqueta;
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mostrar);else mostrar();
})();
