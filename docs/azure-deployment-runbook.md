# GeoColombia — Runbook de despliegue Azure

**Estado:** preparación controlada (Fase 6D.1). **No desplegado.**

**Commit base:** `bada24aed4f1ca5ac585e244a808fbed7ea3dd5d`

**Preflight detallado:** [`azure-deployment-preflight.md`](azure-deployment-preflight.md)

## 1. Identidad Azure personal (obligatoria)

```powershell
. .\scripts\azure-geocolombia.ps1   # opcional si los scripts New-/Get- autoaislan
Assert-GeoColombiaAzureContext
```

Los scripts `Get-` / `New-` / `Set-` llaman `Initialize-GeoColombiaAzureSession`, que:

- Fija `AZURE_CONFIG_DIR` **solo en el proceso** a `%USERPROFILE%\.azure-geocolombia`
- Ejecuta `Assert-GeoColombiaAzureContext` (usuario + tenant + subscription)
- **No** modifica `%USERPROFILE%\.azure` y **no** ejecuta `az logout`

| Campo | Valor |
|-------|--------|
| Usuario | `miguel.qs1999@gmail.com` |
| Tenant | `f1a75a44-3293-4ea7-9f2c-d357e06088ff` |
| Subscription | `ad2d1b2b-e77a-4074-8bd1-e0ccbf989469` |
| Config | `%USERPROFILE%\.azure-geocolombia` |
| RG | `rg-geocolombia-dev` (`eastus2`) |
| Presupuesto | `budget-geocolombia` USD 20/mes (**alerta**, no hard-cap) |

## 2. Arquitectura final propuesta

```text
Browser
  │
  ├─ HTTPS ──► Azure Static Web Apps Free (swa-geocolombia)
  │                 build: frontend/ → dist/
  │                 VITE_API_BASE_URL = https://<api-public-host>
  │
  └─ HTTPS ──► [control de acceso API — ver §6]
                   │
                   ▼
              Azure Container Apps Consumption
              cae-geocolombia-dev (logs-destination=none)
              ca-geocolombia-api
              0.25 vCPU / 0.5Gi / min=0 / max=1
              image: ghcr.io/miguelangeldev1/geocolombia-api:<git-sha>
```

**Prohibido crear sin aprobación:** ACR, Log Analytics persistente, Redis, APIM, Front Door Azure, VMs, maxReplicas>1, planes premium/Standard SWA.

## 3. Nombres y variables

| Recurso | Nombre |
|---------|--------|
| Environment | `cae-geocolombia-dev` |
| Container App | `ca-geocolombia-api` |
| Static Web App | `swa-geocolombia` |
| GHCR | `ghcr.io/miguelangeldev1/geocolombia-api:<git-sha>` |

| Variable | Dónde | Valor |
|----------|-------|--------|
| `APP_ENV` | ACA | `production` |
| `LOG_LEVEL` | ACA | `INFO` |
| `API_DOCS_ENABLED` | ACA | `false` |
| `CORS_ALLOWED_ORIGINS` | ACA | `https://<swa-real-hostname>` (nunca `*`) |
| `VITE_API_BASE_URL` | build SWA | `https://<api-public-host>` (HTTPS) |

No inventar hostnames. Obtenerlos con `az` tras crear recursos.

## 4. GHCR

| Tema | Decisión |
|------|----------|
| Owner/paquete | `miguelangeldev1/geocolombia-api` (owner GitHub `MiguelAngeLDev1`, GHCR en minúsculas) |
| Tag | SHA corto o completo de Git (`d4c810f…`), no solo `latest` en producción |
| Visibilidad recomendada (controlado) | **Privada** + secret de pull en ACA |
| Visibilidad alternativa | Pública (sin secret de pull; imagen del código open-source) |
| Permisos push | `write:packages` (+ `read:packages`); preferir PAT classic o `gh auth` con scopes |
| Pull desde ACA | Registry secret / username+PAT en Container App (nunca en repo git) |
| Coste | Storage/bandwidth de **container images** actualmente gratis (GitHub avisa ≥1 mes si cambia) |
| Scripts | **No** embuten tokens; `Test-GeoColombiaGhcrReadiness.ps1` no hace push |

```text
# Futuro (NO ejecutar en 6C.3):
docker tag geocolombia-api:local ghcr.io/miguelangeldev1/geocolombia-api:<git-sha>
docker push ghcr.io/miguelangeldev1/geocolombia-api:<git-sha>
```

## 5. Orden de despliegue

1. Assert identidad personal.  
2. Docker local: `/health` 200, docs 404.  
3. Push imagen GHCR con tag SHA (**fase posterior**).  
4. Dry-run scripts → revisar comandos.  
5. `-Execute` Environment (`--logs-destination none`).  
6. `-Execute` Container App (GHCR image, 0→1).  
7. Obtener **FQDN ACA real**.  
8. Aplicar **controles de §6A** (despliegue controlado) **antes** de anunciar.  
9. Crear SWA Free; obtener **hostname SWA real**.  
10. `CORS_ALLOWED_ORIGINS=https://<swa>`.  
11. Rebuild SWA con `VITE_API_BASE_URL=https://<api-host-público>`.  
12. Pruebas de aceptación (§7).  

Scripts (dry-run por defecto; `-DryRun` gana sobre `-Execute`):

| Script | Rol |
|--------|-----|
| `Get-GeoColombiaInfraStatus.ps1` | Lectura |
| `New-GeoColombiaContainerAppsEnvironment.ps1` | CAE |
| `New-GeoColombiaContainerApp.ps1 -Image …` | ACA **sin** ingress público |
| `Get-GeoColombiaOperatorPublicIp.ps1` | IP pública operador (no persistir) |
| `Set-GeoColombiaContainerAppIngressAllowlist.ps1` | Ingress + allowlist Allow |
| `Set-GeoColombiaContainerAppEnv.ps1` | Env/CORS |
| `New-GeoColombiaStaticWebApp.ps1` | SWA Free |
| `Test-GeoColombiaApiEndpoints.ps1 -BaseUrl …` | Smoke |
| `Test-GeoColombiaGhcrReadiness.ps1` | Prep GHCR |

## 6. Seguridad: controlado vs público

**CORS no autentica ni limita abuso.**  
**maxReplicas=1 no acota la factura bajo tráfico sostenido.**  
**Un proxy/CDN delante del front no protege si el FQDN ACA sigue abierto en Internet.**

### A. Primer despliegue controlado (recomendado ahora)

```text
Internet ──X──► FQDN ACA (Allow solo operator/32)
Operador ─────► ACA (tras enable+allowlist atómico por YAML)
Browser (tú) ─► SWA opcional ─► misma allowlist
```

**Secuencia segura (scripts):**

1. `New-GeoColombiaContainerApp.ps1` crea la app **sin** `--ingress` (sin FQDN público).
2. `Get-GeoColombiaOperatorPublicIp.ps1` obtiene CIDR `/32` en memoria (no hardcode, no persistir).
3. `Set-GeoColombiaContainerAppIngressAllowlist.ps1 -OperatorPublicIpCidr …` ejecuta `ingress enable` y, de inmediato, `access-restriction set` con `action=Allow` (deniega el resto). Si falla tras enable: `ingress disable`.
4. Verificar `access-restriction list`; prueba positiva `/health` y negativa desde otra red.
5. No anunciar el FQDN hasta completar el paso 4.

Ventana residual entre enable y set: segundos. Mitigación: no publicar la URL y rollback `ingress disable` automático ante fallo.

| Control | Estado | Coste |
|---------|--------|-------|
| Create sin ingress abierto | Scripts 6D.1 | 0 |
| Allowlist Allow `/32` | Script ingress; verificar en deploy | ~0 |
| Alternativa Easy Auth | Viable; no preferida vs IP en controlado | ~0 |
| `API_DOCS_ENABLED=false` | Verificado Docker 6C.2 | 0 |
| CORS explícito | Script listo; hostname SWA pendiente | 0 |
| maxReplicas=1 + límites app | Código/scripts | 0 |

**Implicación:** visitantes externos **no** usarán la API mientras la allowlist sea solo tu IP. Controlado ≠ público.

### B. Publicación pública posterior

El navegador del visitante llama a la API → el host API debe ser alcanzable por clientes globales. Por tanto:

1. DNS público del API (p. ej. bajo un hostname propio) → **proxy de borde** con rate limiting.  
2. **Proteger el origen ACA:** IP allowlist del ingress ACA limitada a rangos del proxy (p. ej. Cloudflare IPs), **no** dejar el `*.azurecontainerapps.io` usable sin filtro.  
3. Opcional (pendiente de aprobación/código): cabecera secreta inyectada por el proxy y validada en FastAPI.  
4. SWA público; `VITE_API_BASE_URL` = hostname del proxy, **no** el FQDN crudo de ACA si este queda allowlisted.

| Control | Estado | Notas |
|---------|--------|-------|
| Borde + rate limit | **Pendiente aprobación** | Cloudflare Free u equivalente; **no** basta sin cerrar origen |
| Allowlist origen = IPs del proxy | **Pendiente deploy** | Cierra bypass del FQDN ACA |
| Shared secret proxy→API | **Pendiente diseño/código** | Defensa en profundidad |
| APIM / Front Door Azure / Redis | **Descartado** por presupuesto USD 20 | — |

### Riesgo de bypass del origen

| Escenario | Riesgo |
|-----------|--------|
| ACA FQDN público + solo CORS | **Alto** — clientes no browser abusan la API |
| Proxy delante pero ACA FQDN aún abierto | **Alto** — se elude el rate limit del proxy |
| ACA allowlist solo tu IP (fase A) | **Bajo** para abuso público |
| Proxy + ACA allowlist = IPs del proxy | **Medio-bajo** — control verificable sin servicios Azure de pago |

## 7. Pruebas de aceptación

```powershell
.\scripts\Test-GeoColombiaApiEndpoints.ps1 -BaseUrl https://<api-host>
# Opcional ligero:
.\scripts\Test-GeoColombiaApiEndpoints.ps1 -BaseUrl https://<api-host> -IncludeExternalSample
```

Manual: mapa SWA carga; clic ubicación; weather/sismos/alertas sin 5xx masivos; `/docs` 404.

## 8. Costes y riesgos de facturación

- Consumption + free grants; scale-to-zero.  
- SWA Free: 100 GB bandwidth/mes; sin overage (sitio puede dejar de servirse).  
- Egress ACA/Internet: **riesgo residual** (cuantificar tras primer mes).  
- Abuso sin allowlist: puede acercarse a USD 20 (alerta, no corte).  
- Scripts rechazan ACR / maxReplicas>1 / SKU ≠ Free / `CORS=*`.

## 9. Rollback

- ACA: revisión anterior.  
- SWA: redeploy commit bueno.  
- Env: `Set-GeoColombiaContainerAppEnv.ps1`.  
- Emergencia: IP deny / quitar anuncios / no recrear RG.

## 10. Checklist antes de `-Execute`

- [ ] Identidad personal Assert OK  
- [ ] Docker `/health` OK  
- [ ] Imagen GHCR con tag SHA (cuando se autorice push)  
- [ ] Dry-run revisado  
- [ ] Modo seguridad **A** (allowlist o Easy Auth) acordado  
- [ ] Presupuesto = alerta, no hard-cap, aceptado  

## 11. Bloqueos abiertos

- Sin recursos Azure creados.  
- Sin push GHCR.  
- Sin hostnames reales.  
- Fase pública (B) sin borde+origen cerrados.  
- `gh` CLI no instalado en la máquina de preparación (push manual con `docker login ghcr.io`).
