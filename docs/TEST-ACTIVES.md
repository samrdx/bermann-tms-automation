# 🧪 Bermann TMS TMS - Active Tests Status

Este documento contiene el listado actualizado de los tests E2E del sistema Bermann TMS, indicando su estado de salud y estabilidad.

### 🔑 Leyenda de Estados

- ✅ **Funcionando**: El test pasa consistentemente.
- ⚠️ **Flaky**: El test pasa intermitentemente (inestabilidad).
- ❌ **Falla**: El test falla consistentemente.
- 🏗️ **En Construcción**: El test está siendo desarrollado.

---

### 📋 Listado de Tests Activos

| Módulo | Test File | Estado | Última Revisión | Observaciones |
| :--- | :--- | :---: | :---: | :--- |
| **Auth** | `auth/login.test.ts` | ✅ | 2026-02-24 | Estable |
| **Auth** | `auth/logout.test.ts` | ✅ | 2026-02-24 | Estable |
| **Auth** | `auth/login-negative.test.ts` | ✅ | 2026-02-24 | Validado |
| **Auth** | `auth/full-flow.test.ts` | ✅ | 2026-02-24 | Crítico |
| **Entidades** | `cliente-crear.test.ts` | ✅ | 2026-02-24 | Estable |
| **Entidades** | `conductor-crear.test.ts` | ✅ | 2026-02-24 | Estable |
| **Entidades** | `transportistas-crear.test.ts` | ✅ | 2026-02-24 | Estable |
| **Entidades** | `vehiculo-crear.test.ts` | ✅ | 2026-02-24 | Estable |
| **Operaciones** | `contrato-crear.test.ts` | ✅ | 2026-02-24 | Tipo Costo, Estable |
| **Operaciones** | `contrato2cliente-crear.test.ts` | ✅ | 2026-02-24 | Tipo Venta Estable |
| **Operaciones** | `viajes-planificar.test.ts` | ✅ | 2026-02-24 | Crítico, Estable |
| **Operaciones** | `viajes-asignar.test.ts` | ✅ | 2026-02-24 | Atómico, Estable |
| **Operaciones** | `viajes-finalizar.test.ts` | ✅ | 2026-02-24 | Monitoreo / Atómico, Estable |

---

### 📊 Resumen de Estabilidad

- **Funcionando:** 13/13 🟢
- **Flaky:** 0/13 ⚪
- **Fallas:** 0/13 🔴

*Última actualización: 2026-02-24*
