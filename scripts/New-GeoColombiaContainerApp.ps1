#Requires -Version 5.1
<#
.SYNOPSIS
  Planifica (o crea) la Container App del backend GeoColombia SIN ingress público.

.DESCRIPTION
  Por defecto DRY-RUN.
  La creación segura NO habilita --ingress external.
  El acceso HTTPS controlado se configura después con:
    Set-GeoColombiaContainerAppIngressAllowlist.ps1 -OperatorPublicIpCidr <x.x.x.x/32>

  Enforce: 0.25 vCPU, 0.5Gi, min=0, max=1. Sin ACR. Sin tokens en el script.

.PARAMETER Image
  Referencia GHCR, p.ej. ghcr.io/miguelangeldev1/geocolombia-api:<git-sha>

.PARAMETER Execute
  Ejecuta creación real (requiere aprobación previa).

.EXAMPLE
  .\scripts\New-GeoColombiaContainerApp.ps1 -Image ghcr.io/miguelangeldev1/geocolombia-api:bada24a
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $Image,

    [switch] $Execute,
    [switch] $DryRun,

    [ValidateSet('0.25')]
    [string] $Cpu = '0.25',

    [ValidateSet('0.5Gi')]
    [string] $Memory = '0.5Gi',

    [ValidateRange(0, 1)]
    [int] $MinReplicas = 0,

    [ValidateRange(1, 1)]
    [int] $MaxReplicas = 1
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'GeoColombia.Infra.ps1')

$isDryRun = Test-GeoColombiaDryRunSwitch -Execute:$Execute -DryRun:$DryRun
$ctx = Initialize-GeoColombiaAzureSession
$null = Get-GeoColombiaResourceGroupOrThrow -AzureContext $ctx

Assert-GeoColombiaScaleLimits -MinReplicas $MinReplicas -MaxReplicas $MaxReplicas -Cpu $Cpu -Memory $Memory
Assert-GeoColombiaNoForbiddenResourcesInPlan -PlannedResourceTypes @(
    'Microsoft.App/containerApps'
)

if ($Image -match 'azurecr\.io') {
    throw 'Imagen ACR detectada. GeoColombia usa GHCR para evitar coste fijo de ACR.'
}
if ($Image -notmatch '^ghcr\.io/') {
    if (-not $isDryRun) {
        throw "En -Execute la imagen debe ser GHCR (ghcr.io/...). Recibido: $Image"
    }
    Write-GeoColombiaWarn "La imagen no empieza por ghcr.io/: $Image"
}
if (-not $isDryRun -and $Image -notmatch '^ghcr\.io/miguelangeldev1/geocolombia-api:') {
    throw "Imagen fuera del repositorio autorizado ghcr.io/miguelangeldev1/geocolombia-api:<tag>."
}

Write-GeoColombiaInfo ("Modo: {0}" -f $(if ($isDryRun) { 'DRY-RUN' } else { 'EXECUTE' }))
Write-GeoColombiaInfo ("App: {0}" -f $script:GeoColombiaContainerApp)
Write-GeoColombiaInfo ("Image: {0}" -f $Image)
Write-GeoColombiaInfo ("Scale: min={0} max={1} cpu={2} mem={3}" -f $MinReplicas, $MaxReplicas, $Cpu, $Memory)
Write-GeoColombiaInfo 'Ingress: OMITIDO (sin exposición pública en creación)'

$existing = $null
try {
    $existing = Get-GeoColombiaAzJson @(
        'containerapp', 'show',
        '-g', $script:GeoColombiaResourceGroup,
        '-n', $script:GeoColombiaContainerApp,
        '-o', 'json'
    )
}
catch {
    $existing = $null
}

if ($null -ne $existing) {
    Write-GeoColombiaWarn 'La Container App ya existe. No se recreará con este script.'
    return [pscustomobject]@{
        Action   = 'skip-exists'
        DryRun   = $isDryRun
        Name     = $script:GeoColombiaContainerApp
        Existing = $existing
    }
}

# Sin --ingress: no FQDN público en el momento de creación.
# Registry credentials (GHCR privado): configurar con secretos ACA en fase posterior,
# nunca embutir tokens aquí.
$azArgs = @(
    'containerapp', 'create',
    '-g', $script:GeoColombiaResourceGroup,
    '-n', $script:GeoColombiaContainerApp,
    '--environment', $script:GeoColombiaContainerAppsEnvironment,
    '--image', $Image,
    '--cpu', $Cpu,
    '--memory', $Memory,
    '--min-replicas', [string]$MinReplicas,
    '--max-replicas', [string]$MaxReplicas,
    '--env-vars',
    'APP_ENV=production',
    'LOG_LEVEL=INFO',
    'API_DOCS_ENABLED=false'
)

$result = Invoke-GeoColombiaAzOrPlan -AzArgs $azArgs -IsDryRun $isDryRun `
    -Description 'Crear Container App SIN ingress público (Consumption, scale 0->1)'

if (-not $isDryRun -and $result.ExitCode -ne 0) {
    throw "Falló la creación de Container App. ExitCode=$($result.ExitCode) Output=$($result.Output)"
}

Write-GeoColombiaInfo 'Siguiente paso seguro:'
Write-Host '  .\scripts\Get-GeoColombiaOperatorPublicIp.ps1'
Write-Host '  .\scripts\Set-GeoColombiaContainerAppIngressAllowlist.ps1 -OperatorPublicIpCidr <x.x.x.x/32>'

return [pscustomobject]@{
    Action          = $(if ($isDryRun) { 'planned' } else { 'created' })
    DryRun          = $isDryRun
    Name            = $script:GeoColombiaContainerApp
    Image           = $Image
    IngressEnabled  = $false
    Result          = $result
}
