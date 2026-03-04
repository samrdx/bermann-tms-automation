# Spec: Asignar Viajes - Soporte Demo

## Feature
Soporte de asignación de viajes en ambiente Demo usando entidades semilladas.

## Scenarios

### SC-01: Asignar viaje exitosamente en Demo
**Given** que existe un viaje `PLANIFICADO` con `nroViaje` en el JSON de Demo  
**And** existe `seededTransportista`, `seededVehiculo`, `seededConductor` en el JSON  
**When** el test `ENV=DEMO viajes-asignar.test.ts` se ejecuta  
**Then** se abre el formulario de edición del viaje  
**And** se asigna el Transportista al viaje  
**And** tras la cascada, se asigna el Vehículo  
**And** se asigna el Conductor  
**And** al guardar, se redirige a `/viajes/asignar`  
**And** el viaje aparece en el grid con estado `ASIGNADO`  

### SC-02: Búsqueda correcta en grid Demo
**Given** que el viaje fue planificado y su `nroViaje` está en el JSON  
**When** se navega a `/viajes/asignar` y se ingresa el `nroViaje` en `#search`  
**And** se hace clic en `a#buscar`  
**Then** el grid filtra y muestra la fila del viaje  

### SC-03: No regresión en QA
**Given** que el test corre con `ENV=QA`  
**When** se ejecuta `viajes-asignar.test.ts`  
**Then** el comportamiento es idéntico al actual (sin cambios observables)  

## Acceptance Criteria

- El test pasa con `Exit code: 0` en Demo
- El JSON se actualiza con `viaje.status = 'ASIGNADO'`
- TypeScript compila sin errores
