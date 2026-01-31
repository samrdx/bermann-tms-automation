# E2E Tests (Producción)

Tests funcionales completos que se ejecutan en CI/CD.

## Estructura
```
e2e/
├── auth/         # Autenticación (login, logout)
├── contratos/    # Módulo de contratos
└── viajes/       # Módulo de viajes (planificar, asignar)
```

## Ejecutar
```bash
# Todos los tests E2E
npm run test:all

# Por módulo
npm run test:login
npm run test:contratos:crear
npm run test:viajes:planificar
npm run test:viajes:asignar
```

## Convenciones

- Nombre: `modulo-accion.test.ts`
- Estructura: 5 fases (Setup, Login, Navigate, Action, Verify)
- Logging: Winston (no console.log)
- Screenshots: Cada fase
- Pass rate objetivo: 100%