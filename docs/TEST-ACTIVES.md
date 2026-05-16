# Bermann TMS — Active Tests Status

Este documento contiene el listado actualizado de los tests E2E del sistema Bermann TMS.

### Key

- ✅ **Funcionando**: Pasa consistentemente
- ⚠️ **Flaky**: Pasa intermitentemente
- ❌ **Falla**: Falla consistentemente
- 🏗️ **En Construcción**: En desarrollo

---

### Auth (4 tests)

| Test File | Estado | Observaciones |
|---|---|---|
| `auth/login.test.ts` | ✅ | Estable |
| `auth/logout.test.ts` | ✅ | Estable |
| `auth/login-negative.test.ts` | ✅ | Validado |
| `auth/full-flow.test.ts` | ✅ | Crítico |

### Config Admin (8 tests)

| Test File | Estado | Observaciones |
|---|---|---|
| `00-config/config/unidadnegocio-crear.test.ts` | ✅ | Smoke, 1 vez/sprint |
| `00-config/config/tipo-operacion-crear.test.ts` | ✅ | Smoke, 1 vez/sprint |
| `00-config/config/tipo-servicio-crear.test.ts` | ✅ | Smoke, 1 vez/sprint |
| `00-config/config/tipocarga-crear.test.ts` | ✅ | Smoke, 1 vez/sprint |
| `00-config/config/capacidades-crear.test.ts` | ✅ | Smoke, 1 vez/sprint |
| `00-config/config/ruta-crear.test.ts` | ✅ | Smoke, 1 vez/sprint |
| `00-config/config/carga-setup.test.ts` | ✅ | Smoke, 1 vez/sprint |
| `00-config/config/carga-crear.test.ts` | ✅ | Smoke, 1 vez/sprint |

### Entidades (4 tests)

| Test File | Estado | Observaciones |
|---|---|---|
| `01-entidades/clientes/cliente-crear.test.ts` | ✅ | Estable |
| `01-entidades/conductor/conductor-crear.test.ts` | ✅ | Estable |
| `01-entidades/transport/transportistas-crear.test.ts` | ✅ | Estable |
| `01-entidades/vehiculos/vehiculo-crear.test.ts` | ✅ | Estable |

### Operaciones Legacy (5 tests)

| Test File | Estado | Observaciones |
|---|---|---|
| `02-operaciones/contratos/contrato-crear.test.ts` | ✅ | Tipo Costo |
| `02-operaciones/contratos/contrato2cliente-crear.test.ts` | ✅ | Tipo Venta |
| `02-operaciones/viajes/viajes-planificar.test.ts` | ✅ | Crítico |
| `02-operaciones/viajes/viajes-asignar.test.ts` | ✅ | Atómico |
| `02-operaciones/Monitoreo/viajes-monitoreo.test.ts` | ✅ | Finalizar viaje |

### Suite Setup (3 files)

| Test File | Estado | Observaciones |
|---|---|---|
| `suites/base-entities.setup.ts` | ✅ | Master legacy setup |
| `suites/01-config-master.setup.ts` | ✅ | Config master |
| `suites/02-carga-master.setup.ts` | ✅ | Carga master |

### Atomic E2E (5 tests)

| Test File | Estado | Observaciones |
|---|---|---|
| `suites/prefactura-crear-e2e.test.ts` | ✅ | Requiere viaje FINALIZADO |
| `suites/proforma-crear-e2e.test.ts` | ✅ | Requiere viaje FINALIZADO |
| `suites/finanzas-prefactura-proforma-e2e.test.ts` | ✅ | Flujo completo finanzas |
| `suites/viajes-asignar-e2e.test.ts` | ✅ | E2E atómico asignar |
| `suites/viajes-finalizar-e2e.test.ts` | ✅ | E2E atómico finalizar |

### Última Milla (3 tests)

| Test File | Estado | Observaciones |
|---|---|---|
| `ultimamilla/pedido-crear.test.ts` | ✅ | Creación de pedido |
| `ultimamilla/pedido-asignar.test.ts` | ✅ | Asignación, requiere `ULTIMAMILLA_ENABLE_MUTATION=true` |
| `ultimamilla/pedido-asignar-batch.test.ts` | ✅ | Batch multi-browser |

---

### Resumen

| Métrica | Valor |
|---|---|
| **Total tests** | **20+** |
| **Funcionando** | **100%** |
| **Flaky** | 0 |
| **Módulos** | 9 |
| **Cobertura** | Config → Entidades → Contratos → Viajes → Finanzas → Ultima Milla |

*Última actualización: Mayo 2026*
