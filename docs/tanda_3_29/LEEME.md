# Revisión visual y de carga — tanda 3

Capturas del prototipo local con Leaflet 1.9.4; Supabase simulado, OpenStreetMap externo. Dos tamaños: 1280 × 720 y 390 × 844. Solo se cargaron las dos selecciones públicas. El menú conserva estado, transparencia, zoom y aviso de error; las pendientes no descargan geometrías. Enter o Espacio abre la consulta del punto.

La medición usa caché fría, gzip local, 1,6 Mbit/s y 150 ms; mide la capa hasta dibujo, sin esperar las teselas de fondo. La captura se toma después de que aparece OpenStreetMap. Cada registro de red_lenta.json es una corrida individual, no un promedio ni garantía de producción.

| Capa | Menú escritorio | Consulta escritorio | Menú celular | Consulta celular |
|---|---|---|---|---|
| Equipamientos | [Ver](vistas/equipamientos_publicos_menu_1280.png) | [Ver](vistas/equipamientos_publicos_consulta_1280.png) | [Ver](vistas/equipamientos_publicos_menu_390.png) | [Ver](vistas/equipamientos_publicos_consulta_390.png) |
| Centros | [Ver](vistas/centros_poblados_menu_1280.png) | [Ver](vistas/centros_poblados_consulta_1280.png) | [Ver](vistas/centros_poblados_menu_390.png) | [Ver](vistas/centros_poblados_consulta_390.png) |

Las leyendas de las dos capas activas corresponden a sus colores. El mapa conserva los puntos reproyectados sin ajuste manual. No acredita precisión ni operación actual de los lugares. Las ventanas emergentes permiten desplazamiento interno cuando el contenido no cabe en celular.
