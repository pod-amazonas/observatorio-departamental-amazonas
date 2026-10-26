# Integración del Observatorio — 26 octubre 2026

## Cambios reales
- Se conserva `index.html`, el visor, biblioteca y módulos originales.
- Se añade al espacio de avances POD una sección de consulta real a Supabase mediante `pod_reportes_publicos.js`.
- Solo se consulta `pod_reportes` con `estado = publicado`; se consultan las evidencias y el catálogo.
- Se enlaza al panel de borradores V20 ya publicado, sin exponer permisos de escritura nuevos.
- Se actualizan avisos que seguían diciendo “prueba local” en las páginas del panel.

## Importante
- NO se añadió un botón de publicar todavía. Hacerlo sin verificar la política de actualización y la confirmación explícita del usuario podría publicar información real por accidente.
- El dashboard histórico demostrativo sigue en el portal; sus porcentajes y simulaciones no deben confundirse con la sección real de reportes publicados.
- La nueva sección mostrará “No hay reportes publicados” si ninguno está aprobado, lo cual es correcto.
- La recuperación de contraseña todavía requiere una prueba completa del correo y flujo de cambio.

## Publicación
1. Guarda copia del ZIP original.
2. Extrae este ZIP y sube **el contenido** de `observatorio-departamental-amazonas-main/` a la raíz de la rama `main`, reemplazando los archivos del mismo nombre. Evita subir la carpeta contenedora.
3. Comprueba que GitHub Pages despliegue el commit.
4. Abre el portal, navega al módulo de avances POD y comprueba el estado de la nueva sección.
5. Comprueba que el enlace de acceso administrativo abre el formulario existente.
6. No modifiques Supabase ni publiques borradores hasta el siguiente paso de publicación controlada.

## Próximo bloque
Revisar políticas RLS para actualización `estado = publicado`, restricciones de BD y definir confirmación + registro de quién/cuándo publicó, manteniendo el flujo de borrador. Tras aprobar ese cambio se añade acción de publicar y se prueba con un registro autorizado.
