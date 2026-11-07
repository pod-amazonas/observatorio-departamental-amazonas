# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico desde v1.0.0.

## [Sin publicar]

### Agregado
- `PRODUCT.md`: contexto del producto (público, propósito, restricciones y principios) para guiar el diseño.
- `CHANGELOG.md`: este registro.

### Seguridad
- `.gitignore` excluye los archivos `.env` y `.env.*` no versionados. `.env.example` sí se versiona y debe contener solo nombres de variables, sin valores secretos. Esto no impide subir claves escritas en otros archivos; gitleaks lo revisa en cada PR.

## Historial previo (sin etiqueta)
- V21: publicación de 20 determinantes ambientales GeoJSON (#2).
- V19: integración de 18 capas ambientales (#1).
- Pruebas Playwright, dependencias en `vendor/`, portada animada y búsqueda de secretos en CI (#3–#21).
