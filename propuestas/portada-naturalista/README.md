# Portada original con animación nueva

Vista previa del issue #27 / PR #28: mantiene los CSS, tipografía, colores, textos, logo, distribución, seis módulos y franja de 16 entidades de la portada original. Se descarta la maquetación alternativa. `animacion.css` contiene únicamente estilos del paisaje y movimiento; no define tipografías, tarjetas ni botones.

El fondo SVG tiene cuatro escenarios: Ríos con delfines viajeros que saltan y se sumergen; Selva con guacamayas que recorren el cielo y baten las alas; Territorio con una maloca y dos casas ilustrativas; Movilidad con los dos botes. No representa lugares, límites ni comunidades reales.

Rotación automática cada 8 segundos, selección manual que reinicia el intervalo y movimiento reducido inicial/dinámico que detiene ambos tipos de movimiento. Solo se anima la escena visible. Se mantiene la retirada del botón de pausa solicitada por Alejandro; sigue pendiente un mecanismo alternativo para acreditar WCAG 2.2.2, ya documentado en el PR. No se modifica #22.

La vista previa conserva los recursos externos ya presentes en el sitio original (fuente y logos). No introduce nuevos recursos externos. No incluye los scripts del portal, Supabase ni datos cartográficos; sus enlaces llevan al sitio existente. La franja institucional conserva los enlaces originales. Esta vista previa no es la publicación definitiva.

Servir con `python3 tests/serve.py` y abrir `/propuestas/portada-naturalista/`. Las pruebas comprueban animación, temporizador, movimiento reducido, teclado, seis módulos, entidades y tipografía original. El PR registra el resultado de `npm test` y Actions. Pendiente revisión visual e integración tras coordinar #22; no se fusiona.

Ajuste solicitado por Alejandro: logo POD en esquina superior derecha, de 144 px en escritorio y 88 px en móvil, sin órbitas; se conserva la tipografía y el resto de la estética original. `npm test`: 76 aprobadas (1,2 min). Capturas de cuatro escenas revisadas a 1280 y 390 px.
