/* Portada: alterna las capas del fondo y permite elegirlas. */
(function () {
  'use strict';
  var portada = document.querySelector('.portada');
  if (!portada) return;
  var chips = Array.prototype.slice.call(portada.querySelectorAll('.portada-chip[data-capa]'));
  var texto = portada.querySelector('.portada-capa-texto');
  var orden = chips.map(function (chip) { return chip.dataset.capa; });
  var temporizador = null;
  var pausa = portada.querySelector('.portada-pausa');
  var aviso = portada.querySelector('#portada-movimiento-reducido');
  var preferencia = window.matchMedia('(prefers-reduced-motion: reduce)');
  var pausaManual = false;

  function mostrar(capa) {
    portada.dataset.capa = capa;
    chips.forEach(function (chip) {
      var activa = chip.dataset.capa === capa;
      chip.setAttribute('aria-pressed', activa ? 'true' : 'false');
      if (activa) texto.textContent = chip.dataset.texto;
    });
  }
  function detener() {
    if (temporizador) clearInterval(temporizador);
    temporizador = null;
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      detener();
      texto.setAttribute('aria-live', 'polite');
      mostrar(chip.dataset.capa);
    });
  });

  function actualizarMovimiento() {
    detener();
    var pausada = pausaManual || preferencia.matches;
    portada.dataset.animacionPausada = String(pausada);
    pausa.textContent = pausada ? 'Reanudar animación' : 'Pausar animación';
    pausa.disabled = preferencia.matches;
    aviso.hidden = !preferencia.matches;
    if (preferencia.matches) pausa.setAttribute('aria-describedby', aviso.id);
    else pausa.removeAttribute('aria-describedby');
    if (pausada) return;
    temporizador = setInterval(function () {
      if (document.hidden || portada.offsetParent === null) return;
      var siguiente = (orden.indexOf(portada.dataset.capa) + 1) % orden.length;
      mostrar(orden[siguiente]);
    }, 4600);
  }
  pausa.addEventListener('click', function () {
    pausaManual = !pausaManual;
    actualizarMovimiento();
  });
  preferencia.addEventListener('change', actualizarMovimiento);
  actualizarMovimiento();
})();
