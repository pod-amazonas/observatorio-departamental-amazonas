'use strict';
(() => {
  const hero = document.querySelector('.hero');
  const preferencia = matchMedia('(prefers-reduced-motion: reduce)');
  const aviso = document.querySelector('#aviso-reducido');
  const descripcion = document.querySelector('.descripcion');
  const botones = Array.from(document.querySelectorAll('[data-elegir]'));
  let temporizador = null;

  function mostrar(boton, manual) {
    hero.dataset.escena = boton.dataset.elegir;
    hero.dataset.capa = boton.dataset.elegir;
    document.querySelectorAll('[data-paisaje]').forEach(escena => {
      escena.toggleAttribute('hidden', escena.dataset.paisaje !== boton.dataset.elegir);
    });
    botones.forEach(otro => otro.setAttribute('aria-pressed', String(otro === boton)));
    // Las actualizaciones automáticas no interrumpen la lectura con anuncios.
    descripcion.setAttribute('aria-live', manual ? 'polite' : 'off');
    descripcion.textContent = boton.dataset.descripcion;
  }
  function detener() {
    if (temporizador !== null) clearInterval(temporizador);
    temporizador = null;
  }
  function actualizar() {
    detener();
    hero.dataset.pausa = String(preferencia.matches);
    aviso.hidden = !preferencia.matches;
    if (preferencia.matches || document.hidden) return;
    temporizador = setInterval(() => {
      const actual = botones.findIndex(boton => boton.dataset.elegir === hero.dataset.escena);
      mostrar(botones[(actual + 1) % botones.length], false);
    }, 8000);
  }
  botones.forEach(boton => boton.addEventListener('click', () => {
    mostrar(boton, true);
    actualizar(); // Una elección manual tiene sus propios ocho segundos completos.
  }));
  document.addEventListener('visibilitychange', actualizar);
  if (preferencia.addEventListener) preferencia.addEventListener('change', actualizar);
  else preferencia.addListener(actualizar);
  actualizar();
})();
