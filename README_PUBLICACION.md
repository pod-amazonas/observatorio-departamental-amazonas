# Observatorio Departamental del Amazonas — demostración

Prototipo navegable del Observatorio Departamental del Amazonas, en desarrollo.

## Alcance de esta publicación
- Incluye la portada con el logo del Programa de Ordenamiento Departamental del Amazonas.
- Permite consultar las pantallas y herramientas de **demostración** del Observatorio.
- El panel V20 integra autenticación y reportes con Supabase; las solicitudes de certificados no realizan radicación oficial.
- Las funciones de solicitud, aprobación o evaluación cartográfica son simulaciones.
- En las simulaciones, no introducir expedientes reales, contraseñas ni datos personales.

## Publicación con GitHub Pages
1. Crear una rama nueva desde `main` y realizar un cambio acotado.
2. Ejecutar `npm ci`, `npx playwright install --no-shell chromium` y `npm test`.
3. Abrir un PR hacia `main` con el alcance, los resultados de las pruebas y los riesgos pendientes.
4. Esperar la revisión y las pruebas de GitHub Actions (`Pruebas del sitio`); corregir cualquier fallo antes de la fusión autorizada.
5. Tras la fusión, comprobar el despliegue de GitHub Pages y verificar las vistas públicas. No cargar archivos manualmente en `main`.

El panel V20 está publicado temporalmente en GitHub Pages hasta la Fase 3 y se accede mediante su URL directa. Incluye autenticación y gestión de reportes con Supabase; las simulaciones históricas del portal siguen siendo demostrativas.

Este repositorio es un prototipo para revisión técnica. La plataforma institucional definitiva requerirá hosting, servidor de aplicación, base de datos, autenticación, servicios cartográficos y políticas de seguridad.
