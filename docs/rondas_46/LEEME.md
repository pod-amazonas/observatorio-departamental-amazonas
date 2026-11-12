# Verificación de la capa única de rondas

## Estado de verificación

La comparación exacta de geometrías/atributos MVT pasa para las doce determinantes en los ocho niveles de zoom (96 pares). Ocho pruebas unitarias de Python pasan: integridad nativa histórica y regresiones del empaquetador, incluidos colisiones de diccionario, UTF-8, cambio de comandos y offsets de directorio.

La primera ejecución de navegador confirmó dibujo de la capa única, metadatos, carga por rangos, un solo lector compartido, cancelación, error/reintento y una sola plaza del límite de ocho. Se detectaron dos problemas de la prueba que se corrigieron: el texto de ayuda pertenece al Geoportal y el punto interior de una franja de pocos metros no representa necesariamente el píxel de un clic al zoom 12. Las consultas se comprueban con acercamiento 16, usando los mismos comandos MVT del nivel 12, sin generar detalle nuevo. Falta confirmar la ejecución final de estos cambios.

La ejecución final de Chromium y del servidor local está bloqueada por agotarse el plazo de la revisión automática de permisos, incluso después de la autorización expresa de Alejandro. La alternativa de Node sigue sujeta al mismo aislamiento y no puede abrir el puerto local. **No se atribuye este bloqueo a los datos ni se declara que las pruebas finales estén aprobadas.**

## Comprobaciones preparadas y pendientes

- Escritorio 1280×720 y celular 390×844, con toque real emulado en el segundo: un solo interruptor, fuente/año/leyenda, 12 identificadores informativos, transparencia, zoom, apertura/cierre y carga solo al activar.
- Clic o toque interior de cada una de las doce determinantes con números y norma visibles. El punto de hueco debe devolver ninguna coincidencia. Los puntos provienen exclusivamente del MVT público, no de ubicaciones privadas.
- Consulta con teclado desde el centro del mapa; cierre de resultados al apagar; descartado de resultados tardíos si cambia la vista.
- Límite de ocho: las rondas más siete capas adicionales caben; una novena capa se rechaza.
- Error de HTTP 200, reintento, cancelación y prefijo de Pages, con una sola carga del lector vendor.
- Recorrido de foco y regresiones del sitio sin modificar las pruebas ni archivos reservados del PR #22.
- **Pendiente:** ejecutar `npm test` final, revisar consultas y capturas de escritorio/celular, medir activación con 1,6 Mbit/s / 150 ms e inspeccionar el dibujo. No se trasladan a esta capa única los tiempos de los doce archivos anteriores.
- **Pendiente:** enviar el PR y confirmar Actions y Gitleaks en el commit definitivo. No publicar «Listo para revisión de Claude» antes de ambos verdes.

Los archivos completos suman ahora 22.093.851 bytes (844.359 menos), con carga por rangos y mayor tesela comprimida de 365.897 bytes. Esta es una medición del paquete, no un tiempo de carga en red ni de teléfono físico.

[Método y trazabilidad](../../datos/rondas_46/LEEME.md). La ronda 19 permanece pendiente (#44). Los documentos de docs/rondas_43 describen el estado histórico del #45, no esta interfaz actual. Tras fusionar, verificar HTTP 206 de la URL nueva en Pages.
