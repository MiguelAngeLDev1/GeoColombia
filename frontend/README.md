# GeoColombia — Frontend

Aplicación web de GeoColombia (React + TypeScript + Vite + Tailwind CSS).

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Backend FastAPI en ejecución si vas a probar el proxy (`http://localhost:8000`)

## Configuración (Windows / PowerShell)

```powershell
cd frontend
copy .env.example .env
npm install
```

Variables de entorno (ver `.env.example`):

| Variable | Descripción |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL de la API. En desarrollo local puedes dejarla vacía y usar el proxy `/api` → `http://localhost:8000`. |

## Scripts

```powershell
npm run dev      # Servidor de desarrollo (por defecto http://localhost:5173)
npm run build    # Compilación de producción
npm run lint     # ESLint
npm run test     # Vitest (una pasada)
npm run preview  # Vista previa del build
```

## Estructura

```text
src/
├── api/          # Cliente HTTP y wrappers de endpoints
├── components/   # UI de presentación y composición
├── features/     # Módulos por dominio (mapa, clima, sismos, …)
├── hooks/        # Estado y efectos reutilizables
├── pages/        # Pantallas
├── services/     # Reglas de negocio y transformaciones
├── types/        # Contratos tipados alineados al backend
└── utils/        # Utilidades puras
```

## Estado actual

- Identidad visual GeoColombia y mapa interactivo (Leaflet + OpenStreetMap).
- Selección de punto por clic/toque con coordenadas visibles.
- Consulta a `GET /api/v1/location/context` con panel de resumen y estados resilientes.
- Aún no se implementan geolocalización, búsqueda de municipios ni tarjetas detalladas (Fase 4).
