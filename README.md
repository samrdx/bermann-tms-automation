# 🚀 Bermann TMS - QA Automation Framework

Framework de automatización para testing del sistema TMS de Bermann utilizando Playwright, Stagehand y IA.

## 📋 Descripción

Este proyecto automatiza los flujos críticos del sistema TMS (Transport Management System) de Bermann, el producto más importante de la empresa.

**Ambiente QA:** https://moveontruckqa.bermanntms.cl

## 🛠️ Tecnologías

- **Playwright** - Automatización de navegadores
- **Stagehand AI** - Automatización inteligente con IA
- **TypeScript** - Tipado estático
- **Winston** - Sistema de logging profesional
- **Gemini API** - Inteligencia artificial

## 📁 Estructura del Proyecto
```
qa-automation-framework/
├── src/
│   ├── core/           # Browser Manager y clases base
│   ├── pages/          # Page Object Models
│   ├── flows/          # Flujos de negocio
│   ├── utils/          # Utilidades (logger, helpers)
│   └── config/         # Configuración centralizada
├── tests/              # Tests ejecutables
├── data/               # Datos de prueba
└── reports/            # Reportes y screenshots (no versionados)
```

## 🚀 Instalación

### Prerequisitos
- Node.js v18 o superior
- npm o yarn
- Cuenta de Google Cloud (para Gemini API)

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/samrdx/qa-automation-framework.git
cd qa-automation-framework
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Edita `.env` y agrega tu API key de Gemini:
```env
GEMINI_API_KEY=tu_api_key_aqui
```

4. **Instalar navegadores de Playwright**
```bash
npx playwright install
```

## 🎮 Uso

### Ejecutar test de ejemplo
```bash
npm run test
```

### Ejecutar con navegador visible (modo headed)
```bash
npm run test:headed
```

### Limpiar archivos generados
```bash
npm run clean
```

## 📝 Configuración

El archivo `.env` contiene:
```env
# API
GEMINI_API_KEY=tu_api_key

# Ambientes
BASE_URL_DEV=https://moveontruckqa.bermanntms.cl
BASE_URL_STAGING=https://moveontruckqa.bermanntms.cl
BASE_URL_PROD=https://moveontruck.bermanntms.cl

# Configuración de ejecución
ENVIRONMENT=dev
HEADLESS=false
TIMEOUT=30000
LOG_LEVEL=info
```

## 📊 Logs y Reportes

- **Logs:** `logs/app.log` y `logs/errors.log`
- **Screenshots:** `reports/screenshots/`
- **Videos:** `reports/videos/` (solo en ambientes dev/staging)

## 🤝 Contribuir

1. Crear una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
2. Hacer commit de tus cambios: `git commit -m 'Add: nueva funcionalidad'`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Crear un Pull Request

## 📅 Roadmap

- [x] Configuración inicial del proyecto
- [x] Browser Manager
- [x] Sistema de logging
- [x] Page Object Model para Login
- [x] Integración con Stagehand
- [x] Automatización de flujos críticos TMS (Login, Contratos, Planificar Viajes)
- [ ] Sistema de reportes ejecutivos
- [ ] CI/CD con GitHub Actions

## 👤 Autor

**Samuel Rodriguez**
- GitHub: [@samrdx](https://github.com/samrdx)
- Email: samuelrodriguez.it@gmail.com

## 📄 Licencia

Este proyecto es propiedad de Bermann - Uso interno exclusivo.

---

## 🔄 Multi-Site Setup (Casa/Trabajo)

### First Time Setup (New Machine)
```bash
# 1. Clone repository
git clone https://github.com/samrdx/bermann-tms-automation.git
cd bermann-tms-automation

# 2. Setup environment
./scripts/setup-env.sh

# 3. Edit .env with your credentials
nano .env  # or your preferred editor

# 4. Install dependencies
npm install

# 5. Run tests
npm run test:all
```

### Daily Workflow

**Before leaving (Casa/Trabajo):**
```bash
git add .
git commit -m "Day X: progress"
git push origin main
```

**When arriving:**
```bash
git pull origin main
npm run test:all
```

**Note:** Your `.env` file stays on your local machine and won't be overwritten by `git pull`.

### Updating Credentials

If you need to update credentials:
```bash
nano .env  # Edit your local .env
# Changes stay local, never pushed to Git
```

**Última actualización:** Enero 2025