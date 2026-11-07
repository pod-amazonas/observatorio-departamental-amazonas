# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Principal: equipos técnicos y entidades (Secretaría de Planeación y Desarrollo Territorial, Corpoamazonia, planeación municipal, investigadores). Cuando haya que elegir, decide este público.
Secundario: comunidades y ciudadanía que consultan avances y restricciones de su territorio.

## Product Purpose
Prototipo del Observatorio Departamental del Amazonas (Colombia). Su tarea principal es **seguir el avance del Programa de Ordenamiento Departamental (POD)**: reportes publicados, evidencias y documentos. El geovisor de determinantes ambientales da el soporte territorial de ese seguimiento.
Éxito: un técnico encuentra el estado de un componente del POD y su soporte cartográfico y normativo sin pedir ayuda, también desde el celular y con conexión lenta.

## Positioning
Reúne en un solo sitio el seguimiento del POD con las determinantes ambientales del departamento, citando norma, entidad y fuente de cada capa.

## Operating Context
- Vistas: inicio, geovisor, geoportal, biblioteca, documentos POD, avances POD, certificados, secretaría, contacto, admin.
- Reportes públicos desde Supabase (`estado = publicado`). Panel V20 de administración por URL directa.
- Conexiones lentas e intermitentes frecuentes en el departamento; uso en celular en campo.

## Capabilities and Constraints
- Sitio estático en GitHub Pages: HTML, CSS, JavaScript, Leaflet 1.9.4 y Supabase alojados en `vendor/`.
- Es un prototipo: no se presenta como portal oficial sin aprobación de la Gobernación.
- Certificados, solicitudes y evaluaciones cartográficas son simulaciones. El dashboard histórico es demostrativo y debe distinguirse de los reportes publicados.
- Las cifras calculadas en el navegador no son cifras oficiales.
- No se cambian geometrías, áreas, normas ni fuentes sin soporte de la entidad responsable.
- Nunca se publican ni se derivan ubicaciones de pueblos indígenas en aislamiento voluntario.
- 20 GeoJSON publicados (33 entradas en el catálogo; 13 pendientes de preparación web).

## Brand Commitments
- Obligatorios: logo del POD (`assets/img/logo-pod.webp`), escudo del Amazonas (`assets/img/escudo-amazonas.png`) y la paleta verde actual de la interfaz.
- Tono: científico, confiable y cercano a lo amazónico. Interfaz en español.

## Evidence on Hand
- Catálogo de determinantes: `catalogo_determinantes_para_geovisor.json`; capas en `datos/determinantes_ambientales/`.
- Imagen: `assets/img/mapa-amazonas.jpg`.
- No hay reportes, testimonios ni cifras oficiales publicadas que se puedan inventar o simular como reales.

## Product Principles
1. Cada dato muestra su fuente, su norma y su entidad responsable.
2. Lo simulado o demostrativo se ve como tal.
3. Primero funciona con conexión lenta y en celular; después se adorna.
4. Proteger a las comunidades antes que mostrar más información.

## Accessibility & Inclusion
WCAG 2.1 AA: contraste, teclado y leyendas legibles. Paletas del mapa aptas para daltonismo. Respeta `prefers-reduced-motion`.
