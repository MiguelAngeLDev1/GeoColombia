# GeoColombia — producción, seguridad y Azure personal

## Arquitectura de ejecución prevista

| Capa | Tecnología |
|------|------------|
| Frontend | Azure Static Web Apps (build Vite) |
| Backend | Azure Container Apps Consumption (Docker + Uvicorn) |
| Región | East US 2 |
| Resource group | `rg-geocolombia-dev` |
| Presupuesto | USD 20 / mes (`budget-geocolombia`, alertas 50/80/100 %) |

## Azure CLI personal (obligatorio)

GeoColombia **solo** puede usar la cuenta personal:

- Usuario: `miguel.qs1999@gmail.com`
- Tenant: `f1a75a44-3293-4ea7-9f2c-d357e06088ff`
- Subscription: `ad2d1b2b-e77a-4074-8bd1-e0ccbf989469`
- Config aislada: `%USERPROFILE%\.azure-geocolombia`

La sesión corporativa (`%USERPROFILE%\.azure`) no debe modificarse.

```powershell
. .\scripts\azure-geocolombia.ps1
Assert-GeoColombiaAzureContext   # antes de cada operación az
```

o `.\scripts\enter-geocolombia-azure.ps1` para una terminal hija.

No ejecutar `az logout` sobre la configuración global.

## Variables de entorno — backend

Ver `backend/.env.example`.

| Variable | Default | Notas |
|----------|---------|--------|
| `APP_ENV` | `development` | `development` \| `production` \| `test` |
| `LOG_LEVEL` | `INFO` | Logs a stdout |
| `CORS_ALLOWED_ORIGINS` | (vacío) | Coma-separada. Dev: localhost Vite. Prod: nunca `*` |
| `API_DOCS_ENABLED` | `true` en dev / `false` en prod | `/docs`, `/redoc`, `/openapi.json` |
| `ALERT_LAYER_*` | ver código | Límites y caché IDEAM |

## Variables de entorno — frontend

Ver `frontend/.env.example`.

| Variable | Desarrollo | Producción |
|----------|------------|------------|
| `VITE_API_BASE_URL` | vacío (proxy `/api` → `:8000`) | `https://…` absoluto HTTPS |

No colocar secretos en variables `VITE_*` (quedan en el bundle).

## CORS

- Middleware FastAPI `CORSMiddleware`.
- Orígenes explícitos; `allow_credentials=false`.
- Métodos: `GET`, `OPTIONS`.
- CORS **no** sustituye rate limiting ni autenticación.

Antes del despliegue SWA, configurar `CORS_ALLOWED_ORIGINS` con la URL HTTPS de Static Web Apps.

## Seguridad de API pública (sin Redis)

Ya existen:

- Validación de query params (coords, radio, límites).
- Timeouts httpx (20–30 s).
- Límites de features/bytes/bbox en capas IDEAM.
- Caché in-memory IDEAM (por proceso).
- Errores de proveedor → 502 tipado; fallos parciales en contexto.

**Rate limiting global:** no implementado en proceso en esta fase.

Motivos:

- Contador in-memory no se comparte entre réplicas.
- Confiar en `X-Forwarded-For` sin cadena de proxies validada es inseguro.
- Redis u otros servicios aumentan coste frente al presupuesto de USD 20.

Mitigación prevista en despliegue (fase posterior):

- Una réplica (o pocas) al inicio.
- Límites ya presentes en capas pesadas (`/national`, bbox).
- Valorar WAF / rate limit en el borde de Azure cuando haya dominio estable.

Endpoints de mayor coste/riesgo: capas IDEAM nacionales, `location/context` (varios proveedores), `earthquakes/recent`.

## Logging

- Stdout/stderr, nivel `LOG_LEVEL`.
- Middleware registra método, **path** (sin query) y duración.
- No registrar tokens ni cuerpos sensibles.

## Docker

```bash
cd backend
docker build -t geocolombia-api:local .
docker run --rm -p 8000:8000 -e CORS_ALLOWED_ORIGINS=http://localhost:5173 geocolombia-api:local
```

- Python 3.12-slim, usuario no root (`appuser`), puerto 8000, `HEALTHCHECK` en `/health`.

## Ejecución local

```bash
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\activate   # Windows
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Pruebas

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm run lint
npm run test
npm run build
```

## Dependencias Python fijadas (6B)

Ver `backend/requirements.txt` y `requirements-dev.txt` (versiones exactas validadas con Python 3.12).
