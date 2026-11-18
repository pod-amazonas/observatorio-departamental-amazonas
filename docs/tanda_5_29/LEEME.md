# Tanda 5: vistas y conexión lenta

Verificación en Chromium de Playwright 1.56.1, a 1280×720 y 390×844 (pantalla táctil emulada, no teléfono físico). Supabase/configuración se sustituyen por respuestas simuladas; no se consulta producción. Las capturas usan OpenStreetMap real. Las mediciones aíslan el coste de las capas con mapa base simulado.

## Medición

Red simulada de 1,6 Mbit/s y 150 ms de latencia; caché HTTP desactivada y contexto nuevo por muestra. Cada medición empieza al activar, después de cargar la página e inicializar el mapa; no es el tiempo completo de apertura del sitio. Vista departamental de referencia: centro −1,5 / −71,5, zoom 6. Se comprueba estado encendido/carga terminada y dibujo real. No se emula CPU de teléfono; se ejecutó en un Mac con otras pruebas en curso. No se garantizan estos tiempos en GitHub Pages.

Tres ejecuciones por capa y tamaño; se informa la mediana. Son cuerpos transferidos, sin cabeceras, HTML ni otros recursos ya cargados. El servidor de medición usa gzip para JS/JSON. El lector compartido frío suma 37.678 bytes; una vez cargado, las capas siguientes lo reutilizan. Los PMTiles tienen compresión interna y se leen por rangos, no completos.

| Capa | Ancho | Muestras | Mediana (s) | Bytes de capa | Bytes de lector frío | Rangos de capa |
|---|---:|---:|---:|---:|---:|---:|
| Incendios | 1280 | 3 | 0.890 | 25470 | 37678 | 4 |
| Remoción en masa | 1280 | 3 | 1.015 | 47921 | 37678 | 4 |
| Incendios | 390 | 3 | 0.885 | 25470 | 37678 | 4 |
| Remoción en masa | 390 | 3 | 1.015 | 47921 | 37678 | 4 |

`rendimiento.json` conserva las doce observaciones. Los archivos completos pesan 396.075 bytes (incendios) y 1.484.739 bytes (remoción); las referencias GeoJSON fieles superarían 1 MB y permanecen privadas.

## Comparación visual

Se capturan las teselas y luego, en la misma vista, se sustituye su lienzo por la copia fiel GeoJSON privada. Se usan los mismos colores de clasificación y una opacidad semejante. La comparación es visual a zoom 6: coinciden ubicación y forma general, con bordes de distinto detalle por generalización/cuantización y diferencias de antialiasing entre SVG y lienzo. No se afirma igualdad geométrica de fragmentos MVT ni se publican las referencias. La conservación exacta de las geometrías nativas se prueba aparte por WKB/SHA-256.

| Capa | Escritorio | Celular |
|---|---|---|
| Incendios | [Teselas](vistas/amenaza_incendios_forestales_mapa_1280.png) · [Referencia fiel](vistas/amenaza_incendios_forestales_referencia_1280.png) · [Menú](vistas/amenaza_incendios_forestales_menu_1280.png) | [Teselas](vistas/amenaza_incendios_forestales_mapa_390.png) · [Referencia fiel](vistas/amenaza_incendios_forestales_referencia_390.png) · [Menú](vistas/amenaza_incendios_forestales_menu_390.png) |
| Remoción en masa | [Teselas](vistas/amenaza_remocion_masa_mapa_1280.png) · [Referencia fiel](vistas/amenaza_remocion_masa_referencia_1280.png) · [Menú](vistas/amenaza_remocion_masa_menu_1280.png) | [Teselas](vistas/amenaza_remocion_masa_mapa_390.png) · [Referencia fiel](vistas/amenaza_remocion_masa_referencia_390.png) · [Menú](vistas/amenaza_remocion_masa_menu_390.png) |

El menú de incendios muestra 2010 y que no informa incendios activos ni alertas actuales. Remoción muestra la fecha declarada en su ficha, el alcance limitado a las zonas estudiadas y que ausencia de polígonos no significa ausencia de amenaza. Las leyendas incluyen únicamente las clases presentes en los atributos originales.

## Comprobaciones automáticas

`tests/tanda5.spec.js` valida el paquete con Python estándar y SHA-256, 140 geometrías nativas válidas/sin reparación, campos autorizados, fechas, categorías y pendientes. Verifica carga al activar, teclado, transparencia, zoom mínimo visible y apagado en ambos tamaños. Lee el píxel del lienzo en cuatro puntos interiores para comprobar que cada clase coincide con su leyenda, y consulta la misma tesela para contrastar FID y valor; no se limita a inspeccionar atributos de estilo.

Los puntos de prueba corresponden exclusivamente a las dos capas de amenazas autorizadas, lejos de sus bordes; no representan asentamientos ni se obtienen de Territorios Colectivos. Se comprueban además HTTP 200 incorrecto frente a rangos esperados, reintento/limpieza y rechazo de colores no seguros. Las pruebas de foco e interruptores existentes incorporan las dos nuevas entradas. La suite completa y sus resultados de Actions/Gitleaks se registran en el PR.

Las cinco fuentes que no cumplen aún los requisitos de metadatos o sensibilidad no tienen capas ni accesos nuevos; sus motivos y condiciones para retomarlas están en `datos/tanda_5_29/pendientes.json` y #29.

Para estabilizar la regresión de puntos de la tanda 3 se espera que termine el paneo natural de Leaflet antes de evaluar sus límites. Se conserva íntegro el predicado de visibilidad (mapa, ventana y cabecera), sin desplazar foco/scroll ni añadir tolerancias. Las pruebas de puntos y tanda 5 pasaron cinco repeticiones: 45 ejecuciones aprobadas en 57,2 s.
