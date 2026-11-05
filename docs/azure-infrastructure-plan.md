# GeoColombia — Plan de infraestructura Azure (Fase 6C.1)

**Estado:** diseño + scripts dry-run auditados (6C.3). **No se han creado recursos.**  
**Commit de referencia (app):** `d4c810fe4ee3fbbdacdd80db1c0009df176ff858`  
**Runbook:** [`azure-deployment-runbook.md`](azure-deployment-runbook.md)  
**Fecha de precios:** Azure Retail Prices API / docs Microsoft (oct–nov 2026).

## 1. Identidad y aislamiento

| Campo | Valor |
|-------|--------|
| Usuario | `miguel.qs1999@gmail.com` |
| Tenant | `f1a75a44-3293-4ea7-9f2c-d357e06088ff` |
| Subscription | `ad2d1b2b-e77a-4074-8bd1-e0ccbf989469` |
| AZURE_CONFIG_DIR | `%USERPROFILE%\.azure-geocolombia` |
| Scripts | `scripts/azure-geocolombia.ps1`, `Assert-GeoColombiaAzure.ps1`, `enter-geocolombia-azure.ps1` |

Antes de cada operación `az`: `Assert-GeoColombiaAzureContext`.  
No usar `%USERPROFILE%\.azure` (corporativo). No ejecutar `az logout`.

## 2. Infraestructura existente (verificada en lectura)

| Recurso | Estado |
|---------|--------|
| Resource group `rg-geocolombia-dev` | Existe, región `eastus2`, **0 recursos** |
| Presupuesto `budget-geocolombia` | Suscripción, **USD 20 / mes**, alertas Actual 50/80/100 % → `miguel.qs1999@gmail.com` |
| Gasto actual del presupuesto | USD 0.0 |
| Periodo presupuesto | 2026-09-01 → 2028-08-31 |

El presupuesto **alerta**; **no corta** el gasto.

No recrear el grupo ni el presupuesto.

## 3. Arquitectura recomendada (mínima)

```text
GitHub (código + Actions)
        │
        ├─ build frontend Vite ──► Azure Static Web Apps (Free)
        │                              HTTPS *.azurestaticapps.net
        │
        └─ build Docker image ──► GHCR (ghcr.io) ──► Azure Container Apps
                                                      Consumption, eastus2
                                                      scale 0 → 1
                                                      ingress HTTPS externo
```

| Capa | Servicio | Motivo |
|------|----------|--------|
| Frontend | **Static Web Apps Free** | Compatible React/Vite, HTTPS, GitHub, USD 0 dentro de cuotas |
| Backend | **Container Apps Consumption** | Scale-to-zero, sin nodos dedicados, eastus2 disponible |
| Imágenes | **GitHub Container Registry** | Evita ~USD 5/mes fijos de ACR Basic |
| Logs | **Don't save logs** + Log stream | Evita Log Analytics (~USD 2.76/GB ingest eastus2) |
| Observabilidad Azure | Application Insights / Front Door / APIM | **No** en fase inicial (coste) |

### Recursos Azure a crear (tras aprobación)

1. Container Apps Environment (workload profiles / Consumption) en `eastus2`, logging: **Don't save logs**.
2. Container App `ca-geocolombia-api` (nombre final por aprobar).
3. Static Web App `swa-geocolombia` (nombre final por aprobar), plan **Free**.

**No crear:** ACR, Log Analytics, VNet, Private Endpoint, Dedicated workload profile, Front Door, APIM, Redis.

## 4. Alternativas evaluadas

### A. Azure Static Web Apps

| Tema | Hallazgo | Fuente |
|------|----------|--------|
| Plan Free | Disponible para hobby/personal; **sin SLA** | [Planes SWA](https://learn.microsoft.com/en-us/azure/static-web-apps/plans) |
| Precio Free | USD 0 (si no se exceden cuotas; el sitio deja de servirse) | [Precios SWA](https://azure.microsoft.com/en-us/pricing/details/app-service/static/) |
| Bandwidth Free | 100 GB / mes / suscripción; overage **no disponible** | [Cuotas SWA](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas) |
| Storage | 250 MB / entorno; 500 MB total; 15 000 archivos | Cuotas SWA |
| HTTPS / dominio | SSL incluido; hasta 2 custom domains (Free) | Planes SWA |
| GitHub | Integración nativa Actions | Planes SWA |
| React/Vite | Compatible (build estático); API backend **externa** (Container Apps), no Functions obligatorias | Arquitectura GeoColombia |
| IP restrictions | Solo plan Standard | Cuotas SWA |
| Precio Standard | **PENDIENTE** confirmación numérica en calculator (API retail no devolvió ítems SWA) | — |

**Decisión propuesta:** Free. Suficiente para demo/personal. Upgrade a Standard solo si se necesita SLA, más bandwidth o IP allowlist en el front.

### B. Azure Container Apps Consumption

| Tema | Hallazgo | Fuente |
|------|----------|--------|
| Región eastus2 | Consumption disponible | Region availability ACA + Retail API |
| Scale min/max | `minReplicas=0`, `maxReplicas=1` viable | [Scale](https://learn.microsoft.com/en-us/azure/container-apps/scale-app) |
| CPU/memoria mínima | 0.25 vCPU / 0.5 GiB (rango Consumption) | Workload profiles |
| Cold start | Esperado con scale-to-zero (segundos); aceptable para demo | Comportamiento Consumption |
| Ingress | HTTPS externo gestionado; `allowInsecure=false` | [Ingress](https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview) |
| Free grant / mes / suscripción | 180 000 vCPU-s, 360 000 GiB-s, 2 M requests | [Billing](https://learn.microsoft.com/en-us/azure/container-apps/billing) |
| Tarifas eastus2 (Retail API) | Ver tabla abajo | `prices.azure.com` |

**Tarifas Consumption eastus2 (confirmadas Retail API):**

| Medidor | Precio |
|---------|--------|
| vCPU active | USD 0.000024 / segundo |
| vCPU idle | USD 0.000003 / segundo |
| Memory active/idle | USD 0.000003 / GiB-segundo |
| Requests | USD 0.40 / millón (tras free grant) |

**Configuración propuesta de la app:**

```text
CPU: 0.25
Memory: 0.5 GiB
minReplicas: 0
maxReplicas: 1
ingress: external, HTTPS, targetPort 8000
env:
  APP_ENV=production
  LOG_LEVEL=INFO
  API_DOCS_ENABLED=false
  CORS_ALLOWED_ORIGINS=https://<swa-hostname>
```

Evitar: Dedicated plan (management ~USD 0.10/h ≈ USD 73/mes), private endpoint (~USD 0.10/h), minReplicas≥1 24×7 sin necesidad.

### C. Registro de imágenes

| Opción | Coste | Pros | Contras |
|--------|-------|------|---------|
| **GHCR** (recomendada) | Storage/bandwidth de **Container registry** actualmente **gratis** (GitHub avisa ≥1 mes antes de cambiar) | Sin coste Azure fijo; Actions nativo | Auth pull (PAT/`GITHUB_TOKEN`); política de precio puede cambiar |
| ACR Basic eastus2 | **USD 0.1666 / día** ≈ **USD 5.00–5.08 / mes** + storage extra USD 0.10/GB-mes | Integración Azure, Managed Identity | Consume ~25 % del presupuesto de USD 20 en fijo |
| Docker Hub | Variable | Familiar | Límites de pull; menos control |

**Decisión propuesta:** GHCR ahora; migrar a ACR Basic solo si GHCR deja de ser viable o se requiere Managed Identity sin PAT.

### D. Logs

| Opción | Coste / riesgo | Recomendación |
|--------|----------------|---------------|
| **Don't save logs** + Log stream en portal/CLI | USD 0 retención; solo live | **Inicial** |
| Log Analytics Analytics Logs ingest eastus2 | USD **2.76 / GB** (Retail; también aparece medidor 0.0 — usar el PAYG 2.76) + retención USD 0.12/GB-mes | Evitar hasta necesidad clara |
| Application Insights | Adicional | Fuera de alcance 6C |

Logs de app ya van a stdout (Fase 6B). Mantener `LOG_LEVEL=INFO` (o WARNING en picos).

## 5. Estimación económica (USD / mes, orden de magnitud)

Supuestos comunes:

- SWA Free dentro de 100 GB bandwidth.
- GHCR (sin ACR).
- ACA: 0.25 vCPU / 0.5 GiB, scale 0→1.
- Sin Log Analytics, sin Dedicated, sin VNet.
- Free grants ACA aplicados.
- **Egress inter-región / Internet:** **PENDIENTE** cuantificar con calculator (puede sumar en escenario público).
- GitHub Actions minutes: coste **GitHub**, no Azure (depende de visibilidad del repo).

### Desarrollo (uso ocasional)

| Concepto | Estimación |
|----------|------------|
| Frontend SWA Free | ~0 |
| Backend ACA (p. ej. ≤20 h activas/mes) | ~0 (dentro de free grant) |
| Registro GHCR | ~0 (política actual) |
| Logging (no save) | ~0 |
| Transferencia | ~0–bajo (**PENDIENTE** si hay picos) |
| **Total Azure** | **≈ USD 0–2** |

### Demo (uso moderado)

| Concepto | Estimación |
|----------|------------|
| SWA Free | ~0 |
| ACA (p. ej. 50–100 h activas/mes, ≪2 M req) | ~0–3 |
| GHCR / logs | ~0 |
| **Total Azure** | **≈ USD 0–5** |

### Público (uso frecuente, sin abuso)

| Concepto | Estimación |
|----------|------------|
| SWA Free (cuidar 100 GB) | ~0 (si se excede → sitio deja de servirse; no overage) |
| ACA ~400 h activas/mes @ 0.25/0.5 | ≈ USD 4–6 (tras free grant; cálculo ilustrativo con tarifas Retail) |
| Requests ≪ 2 M | ~0 |
| Egress | **PENDIENTE** |
| **Total Azure** | **≈ USD 5–12** (sin abuso ni Log Analytics) |

### Escenario de riesgo (API pública abusada, 1 réplica casi siempre activa)

Cálculo ilustrativo con tarifas eastus2 (730 h):

- vCPU: \(0.25 × 730 × 3600 − 180000\) × 0.000024 ≈ **USD 11.4**
- Memoria: \(0.5 × 730 × 3600 − 360000\) × 0.000003 ≈ **USD 2.9**
- Requests si 5 M: \((5−2) × 0.40\) ≈ **USD 1.2**
- **Subtotal ACA ≈ USD 15–16** → deja poco margen bajo USD 20 + egress/logs.

Si además se añade **ACR Basic (~USD 5)** o **Log Analytics**, se puede **superar USD 20**.

### Margen de seguridad vs presupuesto USD 20

| Decisión | Efecto |
|----------|--------|
| Scale 0→1, sin ACR, sin LA | Margen amplio en dev/demo |
| ACR Basic fijo | −~USD 5 margen |
| Log Analytics | Riesgo alto si logs verbosos |
| minReplicas=1 24×7 | Eleva coste base |
| API anónima sin control de abuso | Riesgo de acercarse/superar presupuesto |

## 6. Seguridad de publicación y rate limiting (6C.3)

CORS **no** autentica. Cloudflare Free **solo delante del front** **no** protege si el FQDN de Container Apps sigue abierto. Detalle operativo: [`azure-deployment-runbook.md`](azure-deployment-runbook.md) §6.

### A. Despliegue controlado (siguiente paso autorizado)

- Crear ACA **sin** ingress; habilitar HTTPS con `ingress enable` + `access-restriction set Allow` inmediato (rollback `disable` si falla). Ver preflight.
- IP operador vía `Get-GeoColombiaOperatorPublicIp.ps1` (no hardcode).
- SWA Free opcional; visitantes externos no consumen API allowlisted.
- Rate limit in-memory: **no** como única defensa.

### B. Publicación pública (posterior)

1. Hostname API detrás de proxy con rate limit.  
2. **Cerrar origen:** allowlist ACA = IPs del proxy (evita bypass del FQDN `*.azurecontainerapps.io`).  
3. Opcional: secreto de borde validado en FastAPI (**pendiente aprobación/código**).  
4. `VITE_API_BASE_URL` = hostname del proxy.

### Riesgo de bypass del origen

| Configuración | Riesgo |
|---------------|--------|
| FQDN ACA público + solo CORS | Alto |
| Proxy sin cerrar origen ACA | Alto (se elude el rate limit) |
| Allowlist IP operador (fase A) | Bajo |
| Proxy + allowlist = IPs proxy | Medio-bajo |

**Bloqueo:** no anunciar API pública anónima hasta completar B o aceptar explícitamente el riesgo.

## 7. Validación Docker local (actualizado 6C.2)

| Comprobación | Resultado |
|--------------|-----------|
| Docker CLI | 29.4.1 |
| Docker Desktop | 4.71.0, Linux containers (`desktop-linux`) |
| Build | `geocolombia-api:local` OK (linux/amd64, ~60 MB) |
| Runtime | Contenedor `geocolombia-api-local-test` → puerto host 18000 |
| Usuario | `uid=10001(appuser)` |
| `/health` | HTTP 200 |
| `/docs`, `/openapi.json` | HTTP 404 (prod) |
| Endpoints ligeros | `/api/v1/earthquakes/recent?limit=3` 200; weather Bogotá 200 |
| Logs | stdout (uvicorn + `geocolombia.api` timing) |
| Limpieza | Contenedor de prueba eliminado; otros contenedores del host intactos |

Ver runbook operativo: [`azure-deployment-runbook.md`](azure-deployment-runbook.md).  
Scripts dry-run: `scripts/New-GeoColombia*.ps1`, `Get-GeoColombiaInfraStatus.ps1`.

## 8. Secuencia de despliegue propuesta (tras aprobación)

Orden sugerido. Distinguir **manual** vs **automatizable**.

| # | Paso | Manual / Auto | Notas |
|---|------|---------------|-------|
| 1 | Assert identidad Azure personal | Manual | Obligatoria |
| 2 | Validar Docker local (build + /health) | Manual | Antes de subir imagen |
| 3 | Crear Container Apps Environment (`eastus2`, don't save logs) | Manual o IaC futuro | Sin LA workspace |
| 4 | Publicar imagen en GHCR | Auto (Actions) o Manual | Tag inmutable + `latest` opcional |
| 5 | Crear Container App (0.25/0.5, 0→1, ingress 8000) | Manual o IaC | Secrets registry si privado |
| 6 | Probar `GET /health` y docs 404 | Manual | URL FQDN ACA |
| 7 | Crear Static Web App Free + enlace GitHub | Manual (portal) / Actions | App location `frontend` |
| 8 | Configurar `VITE_API_BASE_URL=https://<aca-fqdn>` en build SWA | Auto | HTTPS obligatorio (código 6B) |
| 9 | Actualizar `CORS_ALLOWED_ORIGINS=https://<swa-host>` en ACA | Manual | Sin inventar dominio antes |
| 10 | Prueba E2E mapa + un endpoint | Manual | Incluir capa regional pequeña |
| 11 | (Opcional) IP allowlist / Easy Auth en API | Manual | Demo segura |
| 12 | Documentar rollback | Manual | Revisar revision anterior ACA; redeploy SWA commit previo |

**GitHub Actions:** diseñar tras aprobación de despliegue. No crear workflows en 6C.1/6C.2.

**Scripts locales (dry-run por defecto):** ver `docs/azure-deployment-runbook.md`.

**Rollback:**

- ACA: tráfico a revisión estable anterior.
- SWA: redeploy del commit bueno.
- CORS/env: revertir variables sin recrear RG.

## 9. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Abuso API pública | Coste → alerta 80/100 % | Acceso restringido o edge rate limit |
| Cold start | UX demo lenta | Aceptar; o minReplicas=1 solo en demos cortas |
| Cuota SWA Free 100 GB | Sitio offline | Monitorizar; Standard si hace falta (**precio PENDIENTE**) |
| GHCR cambia precio | Coste GitHub | Migrar a ACR (~USD 5) si es necesario |
| Log Analytics accidental | Coste ingest | Don't save logs al crear Environment |
| Presupuesto no hard-cap | Gasto > USD 20 | Alertas + disciplina de recursos; revisar Cost Management |
| Docker Desktop apagado | No validar imagen | Encender con autorización antes del deploy |
| Proveedores externos rate-limit/ban | Datos 502 | Límites app ya existentes; no abrir scraping |

## 10. Decisiones pendientes de aprobación

1. ¿Confirmar arquitectura **SWA Free + ACA Consumption + GHCR + don't save logs**?
2. ¿Primera API en modo **restringido** (IP allowlist / Easy Auth) o **pública con borde rate-limit**?
3. ¿Aprobar nombres `cae-geocolombia-dev`, `ca-geocolombia-api`, `swa-geocolombia`?
4. ~~Docker Desktop~~ — **validado en 6C.2**.
5. ¿Visibilidad del repo GitHub (pública vs privada) para Actions/GHCR?
6. ¿Aceptar egress como **PENDIENTE** y revisarlo tras el primer deploy de prueba?
7. ¿Ejecutar scripts con `-Execute` (az manual) o preparar Bicep antes?
8. ¿Autorizar push a GHCR en la siguiente fase?

## 11. Referencias

- [SWA pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/static/)
- [SWA quotas](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas)
- [Container Apps billing](https://learn.microsoft.com/en-us/azure/container-apps/billing)
- [Container Apps log options](https://learn.microsoft.com/en-us/azure/container-apps/log-options)
- [Container Apps IP restrictions](https://learn.microsoft.com/en-us/azure/container-apps/ip-restrictions)
- [ACR pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/)
- [GitHub Packages billing (GHCR note)](https://docs.github.com/en/billing/concepts/product-billing/github-packages)
- Azure Retail Prices API (`prices.azure.com`) — eastus2, consulta Fase 6C.1
- `docs/production-and-security.md` (CORS, settings, Azure CLI aislado)
