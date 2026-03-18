# Legacy Data Sources (Regression)

To avoid collisions between legacy flows, operational data is now split into 2 files per browser + environment:

- `legacy-entities-data-{browser}-{env}.json`
- `legacy-base-entities-data-{browser}-{env}.json`

Both are stored in `playwright/.data/`.

Optional isolation suffix:

- `legacy-entities-data-{browser}-{env}-{legacy_run_id}.json`
- `legacy-base-entities-data-{browser}-{env}-{legacy_run_id}.json`

Enable it with `LEGACY_RUN_ID`.

## Writers

- Flow `entities -> contratos -> viajes -> prefactura` writes:
  - `legacy-entities-data-*` from:
    - `transportistas-crear.test.ts`
    - `cliente-crear.test.ts`
    - `conductor-crear.test.ts`
    - `vehiculo-crear.test.ts`

- Flow `base-entities -> contratos -> viajes -> prefactura` writes:
  - `legacy-base-entities-data-*` from:
    - `base-entities.setup.ts`

## Readers (Operational tests)

Contratos/viajes/prefactura/ultimamilla now use a dynamic selector:

- `LEGACY_DATA_SOURCE=entities` -> reads `legacy-entities-data-*`
- `LEGACY_DATA_SOURCE=base` -> reads `legacy-base-entities-data-*`

If not defined, default is `entities`.

## Recommended usage

- Regression based on entities:
  - Set `LEGACY_DATA_SOURCE=entities`
  - Optional: set `LEGACY_RUN_ID=<unique_id>`
  - Run entities seed
  - Run contratos/viajes/prefactura

- Regression based on base setup:
  - Set `LEGACY_DATA_SOURCE=base`
  - Optional: set `LEGACY_RUN_ID=<unique_id>`
  - Run `base-entities.setup.ts`
  - Run contratos/viajes/prefactura

Do not mix sources in the same run.

## CI note

In GitHub Actions, set:

- `LEGACY_DATA_SOURCE: entities` for entity-seeded regression
- `LEGACY_DATA_SOURCE: base` for base-seeded regression
- Optional `LEGACY_RUN_ID: <unique_run_id>` to isolate concurrent/manual runs

## Setup config integration

When `setup-config-data-{browser}-{env}.json` exists, tests can consume seeded config:

- `vehiculo-crear.test.ts` reads `capacidad.nombre` (fallback: `1 a 12 TON`)
- `viajes-planificar.test.ts` reads:
  - `seededTipoOperacion.nombre`
  - `seededTipoServicio.nombre`
  - `unidadNegocio.nombre`
  - `seededCarga.codigo`
  - `ruta.nro` (fallback `ruta.nombre`)
