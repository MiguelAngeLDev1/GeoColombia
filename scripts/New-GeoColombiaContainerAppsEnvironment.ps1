#Requires -Version 5.1
<#
.SYNOPSIS
  Planifica (o crea con -Execute) el Container Apps Environment de GeoColombia.

.DESCRIPTION
  Por defecto DRY-RUN: solo imprime el comando az.
  Logging: --logs-destination none (evita Log Analytics de pago).
  No crea ACR, VNet, private endpoints ni Dedicated profiles.

.PARAMETER Execute
  Ejecuta la creación real. Requiere validación de identidad. Usar solo con aprobación.

.PARAMETER DryRun
  Fuerza dry-run aunque también se pase -Execute.

.EXAMPLE
  .\scripts\New-GeoColombiaContainerAppsEnvironment.ps1
.EXAMPLE
  .\scripts\New-GeoColombiaContainerAppsEnvironment.ps1 -Execute
#>

[CmdletBinding()]
param(
    [switch] $Execute,
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'GeoColombia.Infra.ps1')

$isDryRun = Test-GeoColombiaDryRunSwitch -Execute:$Execute -DryRun:$DryRun
$ctx = Initialize-GeoColombiaAzureSession
$null = Get-GeoColombiaResourceGroupOrThrow -AzureContext $ctx

Assert-GeoColombiaNoForbiddenResourcesInPlan -PlannedResourceTypes @(
    'Microsoft.App/managedEnvironments'
)

Write-GeoColombiaInfo ("Modo: {0}" -f $(if ($isDryRun) { 'DRY-RUN' } else { 'EXECUTE' }))
Write-GeoColombiaInfo ("Environment: {0}" -f $script:GeoColombiaContainerAppsEnvironment)
Write-GeoColombiaInfo 'logs-destination=none (sin Log Analytics)'

$existing = $null
try {
    $existing = Get-GeoColombiaAzJson @(
        'containerapp', 'env', 'show',
        '-g', $script:GeoColombiaResourceGroup,
        '-n', $script:GeoColombiaContainerAppsEnvironment,
        '-o', 'json'
    )
}
catch {
    $existing = $null
}

if ($null -ne $existing) {
    Write-GeoColombiaWarn 'El Environment ya existe. No se recreará.'
    return [pscustomobject]@{
        Action   = 'skip-exists'
        DryRun   = $isDryRun
        Name     = $script:GeoColombiaContainerAppsEnvironment
        Existing = $existing
    }
}

$azArgs = @(
    'containerapp', 'env', 'create',
    '-g', $script:GeoColombiaResourceGroup,
    '-n', $script:GeoColombiaContainerAppsEnvironment,
    '-l', $script:GeoColombiaLocation,
    '--logs-destination', 'none'
)

$result = Invoke-GeoColombiaAzOrPlan -AzArgs $azArgs -IsDryRun $isDryRun `
    -Description 'Crear Container Apps Environment (Consumption / sin logs persistentes)'

if (-not $isDryRun -and $result.ExitCode -ne 0) {
    throw "Falló la creación del Environment. ExitCode=$($result.ExitCode) Output=$($result.Output)"
}

return [pscustomobject]@{
    Action = $(if ($isDryRun) { 'planned' } else { 'created' })
    DryRun = $isDryRun
    Name   = $script:GeoColombiaContainerAppsEnvironment
    Result = $result
}
