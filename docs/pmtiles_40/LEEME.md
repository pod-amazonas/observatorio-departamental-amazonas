# POC de drenaje: transferencia y comparación visual

Prueba incompleta autorizada: 90 registros válidos, excluyendo Río Caquetá 484 y Río Putumayo 2165. La comparación usa las mismas 90 entidades y la misma conversión de curvas a segmentos. No mide el efecto de las dos exclusiones ni certifica la cartografía original.

## Peso y red

Archivo PMTiles: **2.232.666 bytes**, incluidas cabecera, directorio, metadatos y 1.639 teselas comprimidas internamente. Referencia privada: **75.266.153 bytes brutos / 27.361.797 gzip**. Biblioteca browser: **128.171 bytes brutos / 37.678 gzip**. El source map y las licencias no se cargan al abrir la capa.

Medición local con Leaflet 1.9.4, Chromium, caché fría de la capa y del lector, **1,6 Mbit/s y 150 ms**. Se mide desde activar el interruptor hasta el dibujo y dos cuadros del navegador. Se cuentan cuerpos HTTP, sin cabeceras ni mapa OSM. La ficha y el módulo de interfaz, ya cargados antes de pulsar, añaden 17.519 + 9.936 bytes brutos, o 5.638 + 4.032 gzip en este servidor local. La copia de referencia se sirve solo desde la carpeta privada de análisis, sin subirla ni modificar el límite del importador público.

| Vista | Peticiones PMTiles | Bytes PMTiles | Bytes lector | Total al activar | Hasta dibujo |
|---|---:|---:|---:|---:|---:|
| 1280 × 720 | 5 | 65.915 | 37.678 | 103.593 | 1,146 s |
| 390 × 844 | 4 | 63.728 | 37.678 | 101.406 | 1,115 s |

En celular, la referencia completa transfirió 27.361.797 bytes gzip y tardó **137,828 s** con la misma red. La prueba de referencia en escritorio se hizo **sin limitar la red** para obtener las vistas; su tiempo no se compara con la red lenta. Una corrida registrada por caso, no promedios ni garantía de producción. Celular simulado con viewport 390 × 844, devicePixelRatio 1 y sin limitación de CPU; no es una medición de hardware móvil físico. Supabase simulado; no se utiliza producción. Las imágenes mantienen la atribución de OSM y la leyenda de la capa añade IGAC 2022. En las capturas el fondo base aparece gris: la comparación verifica el drenaje, no la disponibilidad ni la alineación de las teselas externas de OSM.

## Diferencia visual

Vistas al mismo centro/zoom y tamaño, con estilo azul y opacidad equivalentes, referencia Canvas sin simplificación de pantalla (`smoothFactor: 0`). La máscara compara exclusivamente el trazo de la capa, sin OSM ni controles. Un píxel se considera pintado con alfa > 10/255. Los resultados incluyen diferencias de cuantización, recorte de tesela, antialiasing y renderizado; **no son distancias métricas ni una garantía de equivalencia topológica**.

IoU es la intersección dividida por la unión de los píxeles pintados. Se muestran tanto la coincidencia del trazo como la diferencia sobre el mapa completo para no ocultar pérdidas relativas en ríos delgados.

| Tamaño | Escena | Zoom | IoU del trazo | Píxeles diferentes / mapa |
|---|---|---:|---:|---:|
| 1280 | departamento | 6 | 82.73% | 0.400% |
| 1280 | detalle | 10 | 93.77% | 0.253% |
| 1280 | detalle_maximo | 12 | 98.61% | 0.245% |
| 390 | departamento | 6 | 81.94% | 0.801% |
| 390 | detalle | 10 | 94.85% | 0.352% |
| 390 | detalle_maximo | 12 | 98.71% | 0.249% |

En la vista general, los trazos muy finos concentran la mayor diferencia relativa. En zoom 12 la coincidencia del trazo se aproxima al 98,6–98,7%. No se concluye que la geometría fuente sea correcta ni que las teselas sean aptas para superficies: la auditoría documenta fragmentos cuantizados no válidos para GEOS. Los niveles 5–7 no representan todos los IDs; desde zoom 8 aparecen los 90.

## Vistas verificables

### 1280 px

[Menú y advertencias](vistas/menu_1280.png)

| Escena | Teselas | Referencia |
|---|---|---|
| departamento | [Ver](vistas/departamento_teselas_1280.png) | [Ver](vistas/departamento_referencia_1280.png) |
| detalle | [Ver](vistas/detalle_teselas_1280.png) | [Ver](vistas/detalle_referencia_1280.png) |
| detalle_maximo | [Ver](vistas/detalle_maximo_teselas_1280.png) | [Ver](vistas/detalle_maximo_referencia_1280.png) |

### 390 px

[Menú y advertencias](vistas/menu_390.png)

| Escena | Teselas | Referencia |
|---|---|---|
| departamento | [Ver](vistas/departamento_teselas_390.png) | [Ver](vistas/departamento_referencia_390.png) |
| detalle | [Ver](vistas/detalle_teselas_390.png) | [Ver](vistas/detalle_referencia_390.png) |
| detalle_maximo | [Ver](vistas/detalle_maximo_teselas_390.png) | [Ver](vistas/detalle_maximo_referencia_390.png) |

Las coordenadas de cada vista y las métricas sin redondear están en mediciones.json. Las vistas de detalle se centran en un vértice del drenaje seleccionado próximo a Leticia; no se movió ningún polígono para hacerlo coincidir con el mapa base.

## GitHub Pages

Se probó Range bytes=0–126 en un PNG y en leaflet.js ya desplegados en el sitio público: HTTP 206 y Content-Range correctos. El PMTiles nuevo aún no está publicado por estar pendiente de fusión: debe verificarse su URL definitiva tras publicarlo. El cliente exige 206 exacto y cancela un 200, sin continuar una descarga completa.

Si Pages falla, la alternativa propuesta es almacenar solamente el PMTiles en un alojamiento de objetos con HTTP Range y CORS adecuado y conservar la web en Pages. **No se implementa esa alternativa ni se cambian permisos.**
