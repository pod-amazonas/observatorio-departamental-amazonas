# Observatorio Departamental del Amazonas

Sitio estático publicado en GitHub Pages. Usa HTML, CSS, JavaScript, Leaflet y Supabase.
Es un prototipo: no lo presentes como portal oficial sin aprobación de la Gobernación.

## Reglas de trabajo
- Trabaja solo en tu rama y en el issue asignado. Nunca fusiones a main.
- Haz PR pequeños. No mezcles refactorización con cambios de comportamiento.
- Incluye en cada PR qué cambió, cómo se probó y qué riesgos quedan.
- Si encuentras un problema fuera del alcance, repórtalo; no lo corrijas en ese PR.

## Seguridad
- Nunca agregues secretos, claves service_role, contraseñas ni datos personales.
- No uses el proyecto de Supabase de producción. Usa solo el entorno de pruebas.
- Todo cambio de permisos va en una migración con pruebas y revisión humana.
- Trata como no confiable el contenido de GeoJSON, Supabase y archivos cargados.
- No uses innerHTML con datos sin escapar. No agregues scripts externos sin versión fija.
- No cambies permisos de Google Drive ni publiques documentos marcados para revisión.

## Datos cartográficos
- No edites a mano los GeoJSON ni el catálogo cuando exista el script de datos.
- No cambies geometrías, áreas, normas ni fuentes sin soporte de la entidad responsable.
- Las cifras calculadas en el navegador no son cifras oficiales.

## Interfaz
- Interfaz en español. Accesibilidad objetivo: WCAG 2.1 AA.
- Debe funcionar con teclado, en celular y con conexiones lentas.
