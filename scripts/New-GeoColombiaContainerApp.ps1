#Requires -Version 5.1
<#
.SYNOPSIS
  Planifica (o crea) la Container App del backend GeoColombia.

.DESCRIPTION
  Por defecto DRY-RUN. Exige imagen GHCR existente (tag) al ejecutar de verdad.
  Enforce: 0.25 vCPU, 0.5Gi, min=0, max=1, ingress externo HTTPS puerto 8000.
  No crea ACR. No habilita más de 1 réplica.

.PARAMETER Image
  Referencia completa de imagen, p.ej. ghcr.io/miguelangeldev1/geocolombia-api:sha-abc

.PARAMETER Execute
  Ejecuta creación real (requiere -Image y aprobación previa).

.PARAMETER DryRun
  Fuerza dry-run.

.EXAMPLE
  .\scripts\New-GeoColombiaContainerApp.ps1 -Image ghcr.io/miguelangeldev1/geocolombia-api:local-placeholder
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

# Registry credentials: en EXECUTE real se configuran aparte (GHCR secret).
# Aquí no se embuten tokens.
$azArgs = @(
    'containerapp', 'create',
    '-g', $script:GeoColombiaResourceGroup,
    '-n', $script:GeoColombiaContainerApp,
    '--environment', $script:GeoColombiaContainerAppsEnvironment,
    '--image', $Image,
    '--target-port', [string]$script:GeoColombiaTargetPort,
    '--ingress', 'external',
    '--transport', 'http',
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
    -Description 'Crear Container App (Consumption, scale 0->1, ingress HTTPS)'

if (-not $isDryRun -and $result.ExitCode -ne 0) {
    throw "Falló la creación de Container App. ExitCode=$($result.ExitCode) Output=$($result.Output)"
}

Write-GeoColombiaInfo 'Tras crear: obtener FQDN real con az containerapp show --query properties.configuration.ingress.fqdn'
Write-GeoColombiaInfo 'Luego configurar CORS_ALLOWED_ORIGINS con el dominio SWA (ver runbook).'

return [pscustomobject]@{
    Action = $(if ($isDryRun) { 'planned' } else { 'created' })
    DryRun = $isDryRun
    Name   = $script:GeoColombiaContainerApp
    Image  = $Image
    Result = $result
}
