# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico desde v1.0.0.

## [Sin publicar]

### Cambiado
- Las 20 capas GeoJSON se publican con 6 decimales y JSON compacto: la descarga comprimida baja de 11,9 MB a 6,2 MB (Humedales: de 7,3 MB a 4,1 MB). Corrimiento máximo 8 cm. Los 42 polígonos cuya topología cambiaría al redondear conservan sus coordenadas originales; atributos, CRS, polígonos y anillos sin cambios.
- El indicador de foco de la portada pasa a `#a34a06` y alcanza al menos 5:1 sobre sus fondos (#17).

### Agregado
- `scripts/reducir_precision_geojson.py` (solo capas autorizadas en el catálogo) y `scripts/topologia_geojson.py` (validador topológico exacto, sin dependencias), con pruebas que exigen datos procesados y válidos.
- `PRODUCT.md`: contexto del producto (público, propósito, restricciones y principios) para guiar el diseño.
- `CHANGELOG.md`: este registro.

### Seguridad
- `.gitignore` excluye los archivos `.env` y `.env.*` no versionados. `.env.example` sí se versiona y debe contener solo nombres de variables, sin valores secretos. Esto no impide subir claves escritas en otros archivos; gitleaks lo revisa en cada PR.

## Historial previo (sin etiqueta)
- V21: publicación de 20 determinantes ambientales GeoJSON (#2).
- V19: integración de 18 capas ambientales (#1).
- Pruebas Playwright, dependencias en `vendor/`, portada animada y búsqueda de secretos en CI (#3–#21).
