# Integración del Observatorio

## Consulta pública
- Se conserva `index.html`, el visor, la biblioteca y los módulos originales.
- La sección de avances POD consulta Supabase mediante `pod_reportes_publicos.js`: solo reportes con `estado = publicado`, sus evidencias y el catálogo.
- Si no existen reportes publicados se muestra “No hay reportes publicados para consulta ciudadana”.
- El dashboard histórico es demostrativo; sus porcentajes y simulaciones deben distinguirse de los reportes publicados.

## Administración
- El panel V20 está publicado temporalmente en GitHub Pages hasta la Fase 3. Se accede por la URL directa de `V20_FORMULARIO_BORRADORES/admin_borradores_v20.html`; el enlace administrativo ya no aparece en la página pública.
- El panel ya incluye el botón “Revisar y publicar reporte” y exige escribir PUBLICAR para confirmar. Conserva el guardado de borradores y la comprobación de evidencias.
- La recuperación de contraseña requiere verificar el correo y el flujo completo en el entorno autorizado.

## Publicación del sitio
1. Crear una rama desde `main` y abrir un PR hacia `main`.
2. Ejecutar las pruebas descritas en `README_PUBLICACION.md` y registrar los resultados en el PR.
3. Revisar el cambio y las pruebas de GitHub Actions antes de fusionarlo por el proceso autorizado.
4. Tras el despliegue de GitHub Pages, verificar la consulta pública de reportes. Probar el panel por su URL directa en el entorno de pruebas.

Publicar el sitio es un proceso distinto de publicar reportes en el panel. Esta limpieza no cambia Supabase, sus permisos ni el inicio de sesión.
