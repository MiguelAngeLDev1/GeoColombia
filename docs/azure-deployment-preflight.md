# GeoColombia — Preflight despliegue controlado (Fase 6D.1)

**Estado:** preparación. **No desplegado. No push GHCR. No `-Execute`.**

**HEAD base:** `bada24aed4f1ca5ac585e244a808fbed7ea3dd5d`

## 1. Arquitectura objetivo (controlado)

```text
Operador (IP pública /32)
        │ HTTPS
        ▼
ca-geocolombia-api  (ACA Consumption, eastus2)
  ingress external + ipSecurityRestrictions Allow [operator/32]
  image ghcr.io/miguelangeldev1/geocolombia-api:<git-sha>
  0.25 vCPU / 0.5Gi / min=0 / max=1
  APP_ENV=production API_DOCS_ENABLED=false
        ▲
        │ (fase D, opcional en controlado)
swa-geocolombia (SWA Free) — VITE_API_BASE_URL → FQDN ACA
  Solo el operador verá datos si la allowlist bloquea al resto.
```

Visitantes externos **no** podrán usar el mapa contra una API allowlisted a tu IP. Eso es esperado en fase controlada ≠ portafolio público.

## 2. GHCR — procedimiento futuro (manual)

| Campo | Valor |
|-------|--------|
| Imagen | `ghcr.io/miguelangeldev1/geocolombia-api:<git-sha>` |
| Owner | `miguelangeldev1` (repo `MiguelAngeLDev1/GeoColombia`) |
| Tag | SHA de Git (`git rev-parse --short HEAD`), no solo `latest` |
| Digest | `docker image inspect --format '{{.RepoDigests}}'` tras push |

### Permisos

- Push: scope `write:packages` (+ `read:packages`); autenticación `docker login ghcr.io` con PAT classic o `gh auth token` **en la terminal del operador**, nunca en el repo.
- No crear tokens desde Cursor. No pegar tokens en chat. No `docker login` / `docker push` en 6D.1.

### Comandos futuros (NO ejecutar ahora)

```powershell
$sha = git rev-parse --short HEAD
docker build -t geocolombia-api:local ./backend
docker tag geocolombia-api:local "ghcr.io/miguelangeldev1/geocolombia-api:$sha"
# docker login ghcr.io -u USERNAME --password-stdin   # PAT por stdin, no en historial de archivos
# docker push "ghcr.io/miguelangeldev1/geocolombia-api:$sha"
# docker inspect --format '{{index .RepoDigests 0}}' "ghcr.io/miguelangeldev1/geocolombia-api:$sha"
```

### Pull privado en Container Apps

1. Crear secret ACA con PAT de **solo lectura** (`read:packages`), nombre p.ej. `ghcr-pull`.
2. `az containerapp registry set` / `--registry-server ghcr.io --registry-username <github-user> --registry-password secretref:ghcr-pull`.
3. Rotar/revocar PAT en GitHub → Settings → Developer settings si se filtra.
4. Nunca poner el PAT en `--env-vars`, README ni logs de CI.

### Rollback de imagen

Apuntar la Container App a un tag/digest SHA anterior verificado; o activar revisión ACA previa.

## 3. Secuencia segura de creación (sin ventana pública)

**Prohibido:** `containerapp create --ingress external` sin allowlist.

| Paso | Acción | Script |
|------|--------|--------|
| C1 | Crear CAE `--logs-destination none` | `New-GeoColombiaContainerAppsEnvironment.ps1` |
| C2 | Crear Container App **sin ingress** | `New-GeoColombiaContainerApp.ps1 -Image …` |
| C3 | Obtener IP pública operador | `Get-GeoColombiaOperatorPublicIp.ps1` |
| C4 | `ingress enable` + `access-restriction set Allow` inmediato; rollback `disable` si falla | `Set-GeoColombiaContainerAppIngressAllowlist.ps1 -OperatorPublicIpCidr …` |
| C5 | Listar reglas; prueba +/‑ | Manual + `Test-GeoColombiaApiEndpoints.ps1` |
| C6 | Solo entonces anunciar FQDN | — |

Dry-run por defecto. `-Execute` solo con aprobación explícita.

### Criterios GO/NO_GO — Etapa C

| Check | GO | NO_GO |
|-------|----|-------|
| Identidad personal Assert | Coincide | Cualquier mismatch |
| Create sin ingress | Confirmado | Ingress external abierto |
| Allowlist Allow presente | ≥1 regla Allow | 0 reglas (todo permitido) |
| /health desde IP allowlisted | 200 | Timeout/5xx inesperado |
| Acceso desde otra red | Denegado | 200 anónimo |
| Docs | 404 | 200 en /docs |

## 4. IP del operador

- Obtener en el momento: `Get-GeoColombiaOperatorPublicIp.ps1` (ipify/ifconfig.me).
- No hardcodear. No commitear. No usar RFC1918.
- IP puede cambiar (VPN/móvil/ISP) → actualizar allowlist.
- Prueba negativa: datos móviles u otra red sin la IP allowlisted.

## 5. Frontend vs backend restringido

| Escenario | Comportamiento |
|-----------|----------------|
| A. Solo pruebas API allowlisted | Operador valida /health y endpoints |
| B. SWA público + API allowlisted | Visitantes cargan UI pero fallan llamadas API (red/403) |
| Público real | Requiere arquitectura B del runbook (proxy + origen cerrado) |

`VITE_API_BASE_URL` se **bakea** en el bundle en `npm run build`. Cambio de URL ⇒ rebuild + redeploy SWA.

## 6. Costes post-despliegue (checklist)

Config objetivo: SWA Free, ACA 0.25/0.5, 0→1, sin ACR, sin LA persistente, GHCR.

Tras deploy, revisar Cost Management:

- [ ] vCPU-s / GiB-s vs free grant
- [ ] Requests
- [ ] Egress
- [ ] Que no exista ACR ni Log Analytics Workspace
- [ ] Alertas presupuesto 50/80/100 %
- [ ] Presupuesto = alerta, no hard-cap

## 7. Etapas A–E (resumen GO/NO_GO)

| Etapa | GO si… | NO_GO si… |
|-------|--------|-----------|
| A Preflight | Git limpio, Docker OK, Assert OK, RG vacío/esperado, dry-run OK | Identidad incorrecta; secretos en tree |
| B Imagen | Build local + tag SHA; auth manual lista | Push sin aprobación; token en repo |
| C Azure | Secuencia sin ingress abierto; allowlist verificada; prueba − | FQDN anónimo; sin reglas IP |
| D Frontend | Hostname real; CORS real; HTTPS VITE | Dominios inventados; API pública sin querer |
| E Verificación | Health + muestras + allowlist − | Abuso abierto; costes inesperados sin revisión |

## 8. Publicación pública posterior (no ahora)

1. Hostname API → proxy con rate limit.
2. Allowlist ACA = **solo IPs del proxy** (cierra bypass del FQDN ACA).
3. Opcional: secreto borde→API (código futuro).
4. Cloudflare Free **sin** cerrar origen = **insuficiente**.

## 9. Rollback

- Imagen/revisión ACA anterior.
- Quitar ingress o estrechar allowlist.
- Redeploy SWA commit bueno.
- Revocar PAT GHCR.
