# Tanda 4: escritorio, celular y conexión lenta

Comprobación local de la integración en Chromium (Playwright 1.56.1), con tamaños 1280×720 y 390×844; el segundo emula pantalla táctil, no es un teléfono físico. Supabase y su configuración se sustituyen por un entorno simulado. No se consulta producción. Las capturas de capas usan OpenStreetMap real; las mediciones aíslan las capas con teselas base simuladas.

## Método y resultados

Activación tras abrir la página y esperar la inicialización del mapa. Red simulada: 1,6 Mbit/s de descarga y 150 ms de latencia, caché HTTP desactivada, contexto nuevo por ejecución y lector de teselas frío. Vista de referencia: centro −1,5 / −71,5 y zoom 6, sin encuadrar el país entero para las reservas nacionales. Se mide hasta estado encendido/carga terminada y dibujo comprobado; no el tiempo completo de apertura del sitio. Son observaciones de un Mac con otras pruebas ejecutándose, sin emulación de CPU de teléfono ni garantía de latencia en GitHub Pages.

Las columnas «capa» y «lector» son cuerpos transferidos, sin contar cabeceras, HTML ni recursos que ya estaban cargados. PMTiles usa rangos comprimidos internos, sin descargar el archivo completo. El servidor de medición comprime JS/JSON con gzip, pero sirve el GeoJSON de la División sin compresión: los indicadores incluyen 1.920.848 bytes de la base existente en su primera consulta, una condición conservadora respecto a un alojamiento que la comprima. No se modifica esa geometría ni el alojamiento para mejorar esta cifra.

Para las capas se hacen tres ejecuciones por tamaño; se informa la mediana. Para cada tabla se hace una consulta fría por tamaño. `rendimiento.json` conserva las 20 observaciones, tamaños y solicitudes.

| Consulta | Ancho | Ejecuciones | Tiempo (s) | Bytes capa/tabla | Bytes lector/base |
|---|---:|---:|---:|---:|---:|
| Reservas forestales | 1280 | 3 | 0.987 | 39.227 | 37.678 |
| Humedales | 1280 | 3 | 1.062 | 58.541 | 37.678 |
| Aeropuertos | 1280 | 3 | 0.234 | 1.722 | 0 |
| Servicios públicos | 1280 | 1 | 10.012 | 1.087 | 1.920.848 |
| Reservas forestales | 390 | 3 | 0.966 | 38.540 | 37.678 |
| Humedales | 390 | 3 | 1.067 | 58.541 | 37.678 |
| Aeropuertos | 390 | 3 | 0.233 | 1.722 | 0 |
| Servicios públicos | 390 | 1 | 10.055 | 1.087 | 1.920.848 |

La tabla categórica de servicios descarga 1.087 bytes comprimidos además de la base. Su primera consulta ronda 10 s bajo esta red al cargar la División sin compresión; al repetirla se reutiliza la misma capa sin volver a descargarla ni duplicarla. Esto se comprueba en la suite; las cifras de arriba corresponden deliberadamente a contextos fríos independientes.

## Revisión visual

Las capturas `*_mapa_*` muestran las teselas y `*_referencia_*` la copia fiel GeoJSON privada, renderizada solo en el navegador de análisis sobre la misma vista. Se usa color y opacidad semejantes; el contorno SVG y el lienzo MVT tienen antialiasing distinto. La comparación es visual a zoom 6, no una prueba de igualdad geométrica de fragmentos. Coinciden la ubicación y la forma general; la cuantización y generalización por zoom afectan los detalles de bordes. La referencia completa no se publica. Los hashes nativos y la conservación previa a teselar se verifican por separado en el paquete de datos.

| Contenido | Escritorio | Celular |
|---|---|---|
| Reservas en teselas | [Mapa](vistas/reserva_forestal_ley_2da_mapa_1280.png) · [Copia fiel](vistas/reserva_forestal_ley_2da_referencia_1280.png) | [Mapa](vistas/reserva_forestal_ley_2da_mapa_390.png) · [Copia fiel](vistas/reserva_forestal_ley_2da_referencia_390.png) |
| Humedales en teselas | [Mapa](vistas/humedales_mapa_1280.png) · [Copia fiel](vistas/humedales_referencia_1280.png) | [Mapa](vistas/humedales_mapa_390.png) · [Copia fiel](vistas/humedales_referencia_390.png) |
| Aeropuertos: advertencia | [Consulta](vistas/aeropuertos_aviso_1280.png) | [Consulta](vistas/aeropuertos_aviso_390.png) |
| Estado de servicios | [Consulta](vistas/estado_servicios_anm_consulta_1280.png) | [Consulta](vistas/estado_servicios_anm_consulta_390.png) |

Las capturas `*_menu_*` muestran fuente, año, leyenda, interruptor y avisos. No se ha corregido la discrepancia de 0,9–5,7 km de los aeropuertos: la copia fiel se publica con autorización y aviso, y #48 continúa abierto. La ventana móvil tiene desplazamiento para leer el aviso completo. La atribución de Humedales y las definiciones de indicadores pendientes siguen «por confirmar».

## Pruebas automáticas

`tests/tanda4.spec.js` valida SHA-256, auditoría de todos los MVT, reparación exacta de Humedales y campos permitidos; prueba activación al solicitar, dibujo real, transparencia, zoom y apagado en ambos tamaños. Verifica las coordenadas de los ocho puntos contra la entrega, el aviso, la consulta con teclado y el desplazamiento de su ventana. La tabla de servicios comprueba unión por código, categorías originales, metadatos, una sola geometría base, caché y ausencia de descargas anticipadas. Se verifica que las dos producciones aplazadas no tengan archivos, accesos ni endpoints disponibles. También se comprueban rangos HTTP incorrectos, reintentos, código ajeno y HTML mostrado como texto, sin ejecutarse.

Las regresiones existentes conservan sus aserciones: el recorrido de foco espera los nuevos controles antes de contarlos y las pruebas de interruptores incorporan las nuevas capas. El resultado final de `npm test`, Actions y Gitleaks se registra en el PR.

El recorrido de capas y foco se repitió diez veces por tamaño: 20 ejecuciones aprobadas en 46,5 s tras el ajuste de encuadre sin animación y zoom mínimo 5. Incluye cambiar desde las dos capas de teselas antes de consultar Aeropuerto; el foco espera visibilidad real de Leaflet y no se traslada si la persona ya cambió de control.

Producción agrícola y pecuaria se retiraron por la opción B de Alejandro en el PR #49. Se eliminan sus capturas y cuatro observaciones de rendimiento; las veinte restantes corresponden a las capas y a servicios públicos que continúan en la entrega. La confirmación de año y unidad queda pendiente en #29.
