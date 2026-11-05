#Requires -Version 5.1
<#
.SYNOPSIS
  Planifica (o crea) Azure Static Web App Free para el frontend GeoColombia.

.DESCRIPTION
  Por defecto DRY-RUN. Plan Free únicamente. No inventa URL de API.
  Tras crear SWA: obtener hostname real y usarlo en CORS del backend;
  configurar VITE_API_BASE_URL en el build con el FQDN HTTPS del backend.

.PARAMETER RepositoryUrl
  URL HTTPS del repo GitHub. Default: GeoColombia personal.

.PARAMETER Branch
  Rama de despliegue. Default main.

.PARAMETER Execute
  Crea el recurso real (requiere aprobación).

.EXAMPLE
  .\scripts\New-GeoColombiaStaticWebApp.ps1
#>

[CmdletBinding()]
param(
    [string] $RepositoryUrl = 'https://github.com/MiguelAngeLDev1/GeoColombia',
    [string] $Branch = 'main',
    [string] $AppLocation = 'frontend',
    [string] $OutputLocation = 'dist',
    [ValidateSet('Free')]
    [string] $Sku = 'Free',
    [switch] $Execute,
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'GeoColombia.Infra.ps1')

$isDryRun = Test-GeoColombiaDryRunSwitch -Execute:$Execute -DryRun:$DryRun
$ctx = Initialize-GeoColombiaAzureSession
$null = Get-GeoColombiaResourceGroupOrThrow -AzureContext $ctx

if ($Sku -ne 'Free') {
    throw 'Solo se permite plan Free en esta fase.'
}

Assert-GeoColombiaNoForbiddenResourcesInPlan -PlannedResourceTypes @(
    'Microsoft.Web/staticSites'
)

Write-GeoColombiaInfo ("Modo: {0}" -f $(if ($isDryRun) { 'DRY-RUN' } else { 'EXECUTE' }))
Write-GeoColombiaInfo ("SWA: {0} sku={1}" -f $script:GeoColombiaStaticWebApp, $Sku)
Write-GeoColombiaInfo ("Repo: {0} branch={1}" -f $RepositoryUrl, $Branch)

$existing = $null
try {
    $existing = Get-GeoColombiaAzJson @(
        'staticwebapp', 'show',
        '-g', $script:GeoColombiaResourceGroup,
        '-n', $script:GeoColombiaStaticWebApp,
        '-o', 'json'
    )
}
catch {
    $existing = $null
}

if ($null -ne $existing) {
    Write-GeoColombiaWarn 'Static Web App ya existe. No se recreará.'
    return [pscustomobject]@{
        Action   = 'skip-exists'
        DryRun   = $isDryRun
        Name     = $script:GeoColombiaStaticWebApp
        Existing = $existing
    }
}

# Nota: az staticwebapp create puede requerir login GitHub interactivo.
$azArgs = @(
    'staticwebapp', 'create',
    '-g', $script:GeoColombiaResourceGroup,
    '-n', $script:GeoColombiaStaticWebApp,
    '-l', $script:GeoColombiaLocation,
    '--sku', $Sku,
    '--source', $RepositoryUrl,
    '--branch', $Branch,
    '--app-location', $AppLocation,
    '--output-location', $OutputLocation,
    '--login-with-github'
)

$result = Invoke-GeoColombiaAzOrPlan -AzArgs $azArgs -IsDryRun $isDryRun `
    -Description 'Crear Static Web App Free (requiere auth GitHub en EXECUTE)'

Write-GeoColombiaInfo 'Orden post-creación (ver docs/azure-deployment-runbook.md):'
Write-Host '  1) Obtener FQDN backend ACA'
Write-Host '  2) Obtener hostname SWA'
Write-Host '  3) CORS_ALLOWED_ORIGINS=https://<swa-host>'
Write-Host '  4) Rebuild frontend con VITE_API_BASE_URL=https://<aca-fqdn>'

if (-not $isDryRun -and $result.ExitCode -ne 0) {
    throw "Falló creación SWA. ExitCode=$($result.ExitCode) Output=$($result.Output)"
}

return [pscustomobject]@{
    Action = $(if ($isDryRun) { 'planned' } else { 'created' })
    DryRun = $isDryRun
    Name   = $script:GeoColombiaStaticWebApp
    Sku    = $Sku
    Result = $result
}
