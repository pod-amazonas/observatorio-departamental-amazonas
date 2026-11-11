# POC de drenaje: transferencia y comparación visual

Incluye las **92 entidades** seleccionadas por intersección con Amazonas. Caquetá 484 y Putumayo 2165 se corrigieron solo en copias mediante MakeValid, según la opción B de Alejandro en #41. Los 92 originales permanecen intactos. Método, áreas, vértices y prueba de desplazamiento 0 m están en [la documentación de datos](../../datos/teselas_40/LEEME.md) y [reparaciones.json](../../datos/teselas_40/reparaciones.json).

La referencia compara las mismas 92 entidades, incluidas las dos copias reparadas. En las otras 90 se conserva la linealización anterior de curvas. No certifica la cartografía original ni compara exactamente curvas analíticas.

## Peso y red

Archivo PMTiles: **2.847.111 bytes**, con **2.135 teselas** comprimidas internamente. Referencia privada: **81.493.852 bytes brutos / 29.820.647 gzip**. Biblioteca browser: **128.171 bytes brutos / 37.678 gzip**. El source map y las licencias no se cargan al abrir la capa.

Medición local con Leaflet 1.9.4, Chromium, caché fría de capa y lector, **1,6 Mbit/s y 150 ms**. Desde activar el interruptor hasta el dibujo y dos cuadros del navegador. Se cuentan cuerpos HTTP, sin cabeceras ni mapa OSM. Ficha y módulo de interfaz, cargados antes de pulsar: 27.410 + 10.065 bytes brutos / 9.627 + 4.111 gzip en el servidor de medición. La referencia se sirve solo desde una carpeta privada de análisis, sin subirla ni modificar el límite del importador público.

| Vista | Peticiones PMTiles | Bytes PMTiles | Bytes lector | Total al activar | Hasta dibujo |
|---|---:|---:|---:|---:|---:|
| 1280 × 720 | 6 | 80.868 | 37.678 | 118.546 | 1,214 s |
| 390 × 844 | 5 | 78.681 | 37.678 | 116.359 | 1,195 s |

En celular, la referencia completa transfirió 29.820.647 bytes gzip y tardó **150,516 s** con la misma red. La referencia en escritorio se cargó **sin limitar red** para obtener las vistas; su tiempo no se compara con la red lenta. Una corrida registrada por caso, no promedios ni garantía de producción. Celular simulado con viewport 390 × 844, DPR 1 y sin limitar CPU; no es una medición de hardware móvil físico. Supabase simulado; no se utiliza producción. En las capturas finales se espera la carga del fondo OSM y se mantiene su atribución. La máscara numérica no incluye ese fondo ni constituye una validación de alineación contra él.

## Diferencia visual

Mismo centro, zoom, tamaño y estilo azul/opacidad; referencia Canvas sin simplificación de pantalla (`smoothFactor: 0`). **En la comparación privada se fija el alto del mapa al que tiene con teselas activas**, para evitar que el cambio de altura de la leyenda al apagar la capa desplace el centro en píxeles. Se exige igualdad de centro, zoom y dimensiones antes de comparar. Este ajuste no modifica el sitio público ni los tiempos de red, medidos previamente con el diseño real.

La máscara compara exclusivamente el trazo de la capa, sin OSM ni controles; píxel pintado si alfa > 10/255. Incluye diferencias de cuantización, recorte de tesela, antialiasing y renderizado; **no son distancias métricas ni una garantía topológica**. IoU es la intersección dividida por la unión de píxeles pintados; se muestra también la diferencia sobre el mapa completo para no ocultar pérdidas relativas en ríos delgados.

| Tamaño | Escena | Zoom | IoU del trazo | Píxeles diferentes / mapa |
|---|---|---:|---:|---:|
| 1280 | departamento | 6 | 83,23% | 0,558% |
| 1280 | detalle | 10 | 93,79% | 0,252% |
| 1280 | detalle_maximo | 12 | 98,64% | 0,244% |
| 390 | departamento | 6 | 82,95% | 1,165% |
| 390 | detalle | 10 | 94,86% | 0,365% |
| 390 | detalle_maximo | 12 | 98,72% | 0,270% |

En vista general, los trazos finos concentran la mayor diferencia relativa; en zoom 12 la coincidencia del trazo se aproxima al 98,6–98,7%. No se concluye que la cartografía fuente sea correcta ni que las teselas sirvan para superficies: la auditoría documenta fragmentos cuantizados no válidos para GEOS. Los niveles 5–7 no representan todos los IDs; desde zoom 8 aparecen los 92. **Caquetá y Putumayo sí figuran en todos los niveles 5–12.**

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
