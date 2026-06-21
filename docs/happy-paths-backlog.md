# Backlog: Rutas Felices Manuales

Este documento detalla las ideas y tareas planificadas para escalar y mejorar el registro de datos de prueba manuales (`docs/manual-happy-paths.md`).

## Tareas Planificadas

### 1. Protección ante Fallos Parciales (REQ-MHP-001)
- **Problema**: Si la ejecución del sembrado falla antes de completar todas las entidades, el archivo se sobrescribe con campos vacíos (`N/A`), perdiendo los datos útiles anteriores.
- **Solución**: Implementar una validación en `HappyTruthGenerator` para que no sobrescriba el archivo si faltan entidades críticas (como el contrato o el transportista), manteniendo la última versión sana en su lugar.

### 2. Mensaje Amigable para Macrozona (REQ-MHP-003)
- **Problema**: Los contratos de tipo "macrozona" no tienen rutas específicas asignadas en la UI, lo que resulta en una lista vacía en el reporte.
- **Solución**: Si el tipo de contrato es "macrozona", mostrar el texto `"Todas las rutas dentro de la macrozona"` en la celda de Rutas en lugar de dejarla vacía.

### 3. Marcador para Ambientes no Sembrados (REQ-MHP-002)
- **Problema**: Si solo se siembra en un ambiente (ej. QA), la sección de otros ambientes (ej. DEMO) puede eliminarse o quedar desactualizada.
- **Solución**: Dejar un placeholder explícito como `## Ambiente: DEMO (No sembrado en la última corrida)` con la fecha de la última actualización en lugar de simplemente omitir o pisar la sección.

### 4. Integración con Slack / Teams
- **Problema**: Los probadores manuales tienen que ir a abrir el archivo `docs/manual-happy-paths.md` en su IDE o localmente para copiar las credenciales.
- **Solución**: Agregar un webhook para enviar un mensaje con las credenciales del conductor y el resumen del sembrado a un canal de comunicación de QA al finalizar las pruebas con éxito.

### 5. Soporte Multiusuario / Multientidad
- **Problema**: El MVP asume que siempre hay una única entidad de cada tipo.
- **Solución**: Extender la estructura de datos del JSON y el generador de Markdown para listar múltiples conductores y vehículos activos si el sembrado genera más de uno.
