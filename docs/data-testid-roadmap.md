# data-testid Roadmap — Cobertura completa de TMS

## Propósito

Documentar la estrategia de migración a `data-testid` en todas las vistas críticas de TMS, incluyendo el naming convention, el mapeo de selectores actuales a data-testid, y las fases de implementación.

> **Fase activa:** Fase 0 — Transportista/crear (piloto) — TMSPROD-2223

---

## Naming Convention

```
{modulo}-{vista}-{campo}
```

| Componente | Descripción | Ejemplo |
|-----------|-------------|---------|
| `{modulo}` | Nombre del módulo TMS (transportista, contrato, viaje, etc.) | `transportista` |
| `{vista}` | Acción/vista (crear, editar, ver, index, etc.) | `crear` |
| `{campo}` | Nombre del campo en snake_case | `razon-social` |

**Reglas:**
- Todo en minúsculas
- Sin guiones bajos — usar guiones (`-`)
- Sin caracteres especiales
- Sin números a menos que sean parte del nombre del campo (ej. `direccion-2`)

---

## Glosario de campos comunes

Para mantener consistencia entre módulos, usar estos nombres de campo:

| Tipo | Nombre data-testid | Ejemplo de uso |
|------|-------------------|----------------|
| Nombre/Razón social | `{modulo}-{vista}-nombre` | `transportista-crear-nombre` |
| RUT/Documento | `{modulo}-{vista}-rut` | `transportista-crear-rut` |
| Dirección - Calle | `{modulo}-{vista}-calle` | `transportista-crear-calle` |
| Dirección - Número | `{modulo}-{vista}-altura` | `transportista-crear-altura` |
| Dirección - Referencia | `{modulo}-{vista}-referencia` | `transportista-crear-referencia` |
| Región | `{modulo}-{vista}-region` | `transportista-crear-region` |
| Ciudad | `{modulo}-{vista}-ciudad` | `transportista-crear-ciudad` |
| Comuna | `{modulo}-{vista}-comuna` | `transportista-crear-comuna` |
| Botón guardar | `{modulo}-{vista}-guardar` | `transportista-crear-guardar` |
| Mensaje de error | `{modulo}-{vista}-error-general` | `transportista-crear-error-general` |
| Campo inválido | `{modulo}-{vista}-campo-invalido` | `transportista-crear-campo-invalido` |

---

## Fase 0 — Transportista/crear (piloto)

### Estado: 🔵 En planificación (TMSPROD-2223)

### Selectores actuales → data-testid

#### Inputs de texto

| # | Campo | Selector actual | data-testid propuesto |
|---|-------|----------------|----------------------|
| 1 | Nombre | `#transportistas-nombre` | `transportista-crear-nombre` |
| 2 | Razón social | `#transportistas-razon_social` | `transportista-crear-razon-social` |
| 3 | RUT | `#transportistas-documento` | `transportista-crear-rut` |
| 4 | Calle | `#transportistas-calle` | `transportista-crear-calle` |
| 5 | Altura (n°) | `#transportistas-altura` | `transportista-crear-altura` |
| 6 | Referencia | `#transportistas-otros` | `transportista-crear-referencia` |
| 7 | % Descuento | `#transportistas-descuento` | `transportista-crear-descuento` |

#### Dropdowns (Bootstrap Select)

| # | Campo | Selector actual | data-testid propuesto |
|---|-------|----------------|----------------------|
| 8 | Tipo transportista | `button[data-id="transportistas-tipo_transportista_id"]` | `transportista-crear-tipo-transportista` |
| 9 | Región | `button[data-id="transportistas-region_id"]` | `transportista-crear-region` |
| 10 | Ciudad | `button[data-id="transportistas-ciudad_id"]` | `transportista-crear-ciudad` |
| 11 | Comuna | `button[data-id="transportistas-comuna_id"]` | `transportista-crear-comuna` |
| 12 | Forma de pago | `button[data-id="transportistas-forma_pago"]` | `transportista-crear-forma-pago` |
| 13 | Tercerizar viajes | `button[data-id="transportistas-tercerizar"]` | `transportista-crear-tercerizar` |

#### Acciones

| # | Elemento | Selector actual | data-testid propuesto |
|---|----------|----------------|----------------------|
| 14 | Botón guardar | `#btn_guardar` | `transportista-crear-guardar` |

#### Validación / Feedback

| # | Elemento | Selector actual | data-testid propuesto |
|---|----------|----------------|----------------------|
| 15 | Error general formulario | (no tiene selector estable) | `transportista-crear-error-general` |
| 16 | Campo inválido | `[aria-invalid="true"]` | `transportista-crear-campo-invalido` |

Total: **16 elementos** mapeados.

---

## Fase 1 — Entidades base

**Prioridad:** Alta — son la base de todos los flujos operacionales.

**Depende de:** Fase 0 (piloto validado)

### 1-A: Conductor/crear

| Campo | Selector actual | data-testid propuesto |
|-------|----------------|----------------------|
| Nombre | _(por verificar en Confluence)_ | `conductor-crear-nombre` |
| Apellido | ... | `conductor-crear-apellido` |
| RUT | ... | `conductor-crear-rut` |
| ... | ... | ... |

> **Pendiente:** Relevar selectores actuales de `ConductorPage.ts` y mapear completo.

### 1-B: Vehículo/crear

> Page Object: `VehiculoPage.ts` — relevar selectores.

### 1-C: Cliente/crear

> Page Object: `ClientePage.ts` — relevar selectores.

### 1-D: Contrato/crear

> Page Object: `ContratosPage.ts` — relevar selectores.

---

## Fase 2 — Operaciones core

**Prioridad:** Alta — flujo de dinero.

**Depende de:** Fase 1 (entidades creadas)

- Planificar viaje
- Asignar viaje
- Monitoreo

---

## Fase 3 — Finanzas

**Prioridad:** Media.

**Depende de:** Fase 2 (viajes existentes)

- Prefactura
- Proforma

---

## Fase 4 — Configuración y Ultima Milla

**Prioridad:** Media-baja.

**Depende de:** Fase 2

- ConfigAdmin (Carga Master, Rutas, TipoOperación, UnidadNegocio, TipoCarga, TipoServicio)
- Ultima Milla (Pedidos, Asignar, Monitoreo batch)

---

## Progreso general

| Fase | Módulo | POs afectados | Elementos totales | Estado |
|------|--------|---------------|-------------------|--------|
| 0 | Transportista/crear | 1 | 16 | 🔵 Planificado (TMSPROD-2223) |
| 1-A | Conductor | 1 | _por relevar_ | ⚪ Pendiente |
| 1-B | Vehículo | 1 | _por relevar_ | ⚪ Pendiente |
| 1-C | Cliente | 1 | _por relevar_ | ⚪ Pendiente |
| 1-D | Contrato | 1 | _por relevar_ | ⚪ Pendiente |
| 2 | Operaciones (Planif, Asignar, Monitoreo) | 3 | _por relevar_ | ⚪ Pendiente |
| 3 | Finanzas (Prefactura, Proforma) | 1 | _por relevar_ | ⚪ Pendiente |
| 4 | ConfigAdmin (7 POs) + UltimaMilla (4 POs) | 11 | _por relevar_ | ⚪ Pendiente |
| | **Total** | **23** | | |

---

## Mantenimiento

- Este documento se actualiza cuando se completa una fase o se relevan nuevos selectores.
- El source of truth de los selectores actuales sigue siendo **Confluence** y los Page Objects en `src/modules/`.
- Este archivo es el **mapa de ruta** — no reemplaza la documentación técnica de cada módulo.
