'use strict';
(() => {
  const hero = document.querySelector('.hero');
  const preferencia = matchMedia('(prefers-reduced-motion: reduce)');
  const pausa = document.querySelector('.pausa');
  const aviso = document.querySelector('#aviso-reducido');
  const descripcion = document.querySelector('.descripcion');
  let pausaManual = false;
  // Selección manual: sin temporizador que cambie el paisaje mientras se lee.
  document.querySelectorAll('[data-elegir]').forEach(boton => {
    boton.addEventListener('click', () => {
      hero.dataset.escena = boton.dataset.elegir;
      document.querySelectorAll('[data-elegir]').forEach(otro => otro.setAttribute('aria-pressed', String(otro === boton)));
      descripcion.textContent = boton.dataset.descripcion;
    });
  });
  function actualizar() {
    const pausada = pausaManual || preferencia.matches;
    hero.dataset.pausa = String(pausada);
    pausa.querySelector('.texto-pausa').textContent = preferencia.matches ? 'Movimiento reducido' : pausada ? 'Reanudar paisaje' : 'Pausar paisaje';
    pausa.disabled = preferencia.matches;
    aviso.hidden = !preferencia.matches;
    if (preferencia.matches) pausa.setAttribute('aria-describedby', aviso.id);
    else pausa.removeAttribute('aria-describedby');
  }
  pausa.addEventListener('click', () => { pausaManual = !pausaManual; actualizar(); });
  if (preferencia.addEventListener) preferencia.addEventListener('change', actualizar);
  else preferencia.addListener(actualizar);
  actualizar();
})();
