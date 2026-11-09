/* Portada: selección manual y movimiento finito, sin alternancia automática. */
(function () {
  'use strict';
  var portada = document.querySelector('.portada');
  if (!portada) return;
  var chips = Array.prototype.slice.call(portada.querySelectorAll('.portada-chip[data-capa]'));
  var texto = portada.querySelector('.portada-capa-texto');
  var preferencia = window.matchMedia('(prefers-reduced-motion: reduce)');
  var temporizador = null;

  function detener() {
    if (temporizador !== null) clearTimeout(temporizador);
    temporizador = null;
    // finish también hace determinista el límite al suspenderse una pestaña
    // o al usar un reloj simulado: ningún efecto queda corriendo tras 5 s.
    portada.getAnimations({subtree:true}).forEach(function (a) {
      if (a.playState === 'running' || a.pending) a.finish();
    });
  }
  function animar() {
    detener();
    portada.removeAttribute('data-movimiento');
    // Retirar y volver a aplicar el selector reinicia incluso la misma escena.
    void portada.offsetWidth;
    if (preferencia.matches) return;
    portada.setAttribute('data-movimiento', 'activo');
    temporizador = setTimeout(detener, 5000);
  }
  function mostrar(capa, manual) {
    portada.dataset.capa = capa;
    portada.querySelectorAll('[data-paisaje]').forEach(function (escena) {
      escena.toggleAttribute('hidden', escena.dataset.paisaje !== capa);
    });
    chips.forEach(function (chip) {
      var activa = chip.dataset.capa === capa;
      chip.setAttribute('aria-pressed', String(activa));
      if (activa) texto.textContent = chip.dataset.texto;
    });
    texto.setAttribute('aria-live', manual ? 'polite' : 'off');
    animar();
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { mostrar(chip.dataset.capa, true); });
  });
  function cambiarPreferencia() {
    detener();
    portada.removeAttribute('data-movimiento');
    // Desactivar movimiento reducido no inicia otra reproducción automática.
  }
  if (preferencia.addEventListener) preferencia.addEventListener('change', cambiarPreferencia);
  else preferencia.addListener(cambiarPreferencia);
  mostrar(portada.dataset.capa || 'rios', false);
})();
