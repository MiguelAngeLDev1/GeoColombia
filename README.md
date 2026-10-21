# GeoColombia

API y mapa web para consultar información territorial oficial de Colombia (SGC, ANM, DANE, IDEAM, Open-Meteo).

## Stack

- **Backend:** Python 3.12, FastAPI, httpx, Pydantic
- **Frontend:** React 19, TypeScript, Vite, Tailwind, Leaflet, TanStack Query
- **Infra prevista:** Azure Container Apps + Azure Static Web Apps (East US 2)

## Funcionalidades

- Contexto de ubicación (`/api/v1/location/context`) con fallos parciales
- Sismos SGC (recientes, detalle, cercanos)
- Títulos mineros ANM
- Clima Open-Meteo
- Alertas IDEAM (punto + capas regionales/nacionales en el mapa)
- Visualización Leaflet con capas independientes y sismos SGC

## Arranque rápido

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health: `GET http://127.0.0.1:8000/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

En desarrollo, `VITE_API_BASE_URL` vacío usa el proxy Vite `/api` → `localhost:8000`.

## Pruebas

```bash
cd backend && pytest
cd frontend && npm run lint && npm run test && npm run build
```

## Configuración y seguridad

Documentación de producción, CORS, variables de entorno, Docker, límites de costes y **Azure CLI personal aislado**:

→ [docs/production-and-security.md](docs/production-and-security.md)

Scripts Azure (cuenta personal únicamente):

- `scripts/azure-geocolombia.ps1`
- `scripts/Assert-GeoColombiaAzure.ps1`
- `scripts/enter-geocolombia-azure.ps1`

## Notas de interpretación de datos

- Los sismos “recientes” del listado SGC no equivalen necesariamente a las últimas 24 h.
- Distancia al epicentro no demuestra que un sismo se sintiera en un municipio.
- Amenazas IDEAM de deslizamientos/incendios son pronósticos, no incidentes confirmados.
- Geometrías nacionales IDEAM están simplificadas; las regionales son más detalladas.

## Licencia / uso

Proyecto personal. No incluir secretos ni tokens en el repositorio.
