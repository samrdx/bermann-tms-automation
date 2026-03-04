# Tasks: Asignar Viajes - Soporte Demo

## Checklist

- [x] T1: Agregar guard `isDemo` en `viajes-asignar.test.ts`
- [x] T2: En `viajes-planificar.test.ts`, guardar `viaje.id` (internal grid ID) en el JSON al ejecutar en Demo
- [x] T3: Usar `viaje.id` como `searchId` en `viajes-asignar.test.ts` para la búsqueda en Demo
- [x] T4: Adaptar Phase 9 para usar `#search` + `a#buscar` con fallback a Enter
- [x] T5: Verificar estado `ASIGNADO` en la fila del grid post-save
- [x] T6: Agregar scripts `test:demo:legacy:planificar`, `test:demo:legacy:asignar`, `test:demo:legacy:viajes` en `package.json`
- [x] T7: Ejecutar `test:demo:legacy:planificar` → Exit code 0 ✅
- [x] T8: Ejecutar `test:demo:legacy:asignar` → Exit code 0 ✅
- [x] T9: JSON actualizado con `viaje.status = ASIGNADO` ✅
