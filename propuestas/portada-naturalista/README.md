# Propuesta de portada naturalista

Vista previa independiente para el issue #27 y PR #28. Abrir `/propuestas/portada-naturalista/` desde el servidor (`python3 tests/serve.py`). No sustituye la portada publicada ni se enlaza desde ella.

## Escenarios y movimiento

Cuatro ilustraciones SVG originales e independientes, con paleta verde y luz cálida:

- Ríos: delfines rosados que avanzan por el agua mientras saltan y se sumergen; el recorrido horizontal es independiente del ciclo de salto.
- Selva: guacamayas que recorren el cielo mientras baten las alas, además de otras aves y vegetación.
- Territorio: panorámica de bosque y agua con una maloca y dos casas ribereñas ilustrativas. No representan asentamientos ni comunidades concretas.
- Movilidad: conserva los dos botes que navegan por el río en sentidos contrarios.

Solo la escena visible mantiene animaciones. La categoría cambia automáticamente cada **8 segundos** en orden Ríos → Selva → Territorio → Movilidad → Ríos. Una selección manual reinicia los ocho segundos. La rotación se detiene en pestañas ocultas y vuelve a contar ocho segundos al regresar. Los cambios automáticos no generan anuncios `aria-live`.

Por instrucción explícita de Alejandro, se retira el botón «Pausar paisaje». `prefers-reduced-motion` detiene tanto las animaciones como la rotación, al cargar y al cambiar la preferencia; sigue disponible la selección manual. Incluye respaldo `addListener`.

**Limitación de accesibilidad:** respetar la preferencia del sistema no acredita por sí solo el cumplimiento de [WCAG 2.1, 2.2.2](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html). Queda pendiente resolver un mecanismo accesible para detener el movimiento automático antes de declarar conformidad AA o integrar esta propuesta en una entrega accesible.

## Contenido conservado

La maqueta incluye los seis módulos con sus destinos reales: Geovisor, Geoportal, Avances del POD, Biblioteca Digital, Documentos del POD y Certificados ambientales (simulador). Tres columnas en escritorio y una en móvil. Conserva los logos POD y Amazonas.

La ilustración no es un mapa ni representa límites, ubicaciones comunitarias o lugares reales. Sin consultas a Supabase, capas, fuentes, librerías ni imágenes externas; usa los logos locales existentes. Los enlaces llevan al prototipo.

## Verificación

`tests/portada-propuesta.spec.js` comprueba teclado, recursos, seis módulos y rutas, diseño móvil, rotación en el límite 7999/8000 ms, selección manual, movimiento reducido inicial/dinámico, escenas independientes, sumersión, desplazamiento de delfines y guacamayas, aleteo, viviendas, navegación y ausencia de animaciones en escenas ocultas.

Las siete pruebas de la propuesta pasan tres repeticiones consecutivas: **21 aprobadas**. Ejecutar también `npm test`; el resultado final de la suite y Actions queda en el PR. HTML/SVG + CSS + JS: aproximadamente 49 KB sin comprimir, más los dos logos locales.

## Pendiente de integración

Alejandro revisa esta versión antes de sustituir la portada pública. La integración deberá resolver el cambio solicitado respecto de #22 (retirada del control de pausa), conservar la franja de entidades y repetir las pruebas de foco y contraste sobre los nuevos fondos. No incluye inventario de capas, revisión cartográfica ni aprobación institucional. Sin pruebas en Safari ni dispositivos físicos de gama baja.

Resultado final local: `npm test`, **75 pruebas aprobadas (1,1 min)**. `git diff --check` correcto. Se revisaron las cuatro escenas en escritorio (1280 px) y móvil (390 px).
