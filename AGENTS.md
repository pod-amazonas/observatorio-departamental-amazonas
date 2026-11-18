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
- Nunca publiques, proceses para la web ni derives ubicaciones de pueblos indígenas en aislamiento voluntario, incluida la capa `Pueblos_Indigenas_Aislamiento_Voluntario`. Esto también cubre atributos, mapas y centroides de otras capas que permitan localizarlos.

## Regla del equipo POD (18 de noviembre de 2026)
- Aplica a todas las tandas: no modificar, trasladar, recortar ni simplificar las geometrías de las entidades aunque se detecten diferencias o errores. Documentar las observaciones sin corregirlas. Decisión: #29, comentario 6984763632.
- Se mantienen las reparaciones técnicas ya publicadas de Caquetá, Putumayo, cuatro rondas y Humedales. Nuevas reparaciones solo si se prueban exactamente 0 m de desplazamiento, 0 m² de diferencia y los mismos vértices, con documentación; en otro caso detenerse.
- Se mantienen las selecciones autorizadas de entidades completas que intersectan el departamento y la simplificación previamente aprobada de la División.
- Determinante 19: usar exclusivamente Determinantes_Ambientales_CAR, OBJECTID 19, sin ajustes. La diferencia de unos 53 m con Rondas_Hidricas FID 1 es una observación técnica, no una orden de moverla (#44, comentario 6984702769).

## Interfaz
- Interfaz en español. Accesibilidad objetivo: WCAG 2.1 AA.
- Debe funcionar con teclado, en celular y con conexiones lentas.
