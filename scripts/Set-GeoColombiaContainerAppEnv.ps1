#Requires -Version 5.1
<#
.SYNOPSIS
  Planifica actualización de variables de entorno de la Container App.

.DESCRIPTION
  Por defecto DRY-RUN. No inventa dominios: exige CORS_ALLOWED_ORIGINS explícito
  cuando se quiere fijar CORS. No imprime secretos.

.PARAMETER CorsAllowedOrigins
  Lista coma-separada de orígenes HTTPS reales (p.ej. https://xxx.azurestaticapps.net).

.PARAMETER ApiDocsEnabled
  true/false. Default false en producción.

.PARAMETER Execute
  Aplica cambios reales.

.EXAMPLE
  .\scripts\Set-GeoColombiaContainerAppEnv.ps1 -CorsAllowedOrigins 'https://REPLACE.azurestaticapps.net'
#>

[CmdletBinding()]
param(
    [string] $CorsAllowedOrigins = '',
    [ValidateSet('true', 'false')]
    [string] $ApiDocsEnabled = 'false',
    [ValidateSet('production', 'development', 'test')]
    [string] $AppEnv = 'production',
    [ValidateSet('CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG')]
    [string] $LogLevel = 'INFO',
    [switch] $Execute,
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'GeoColombia.Infra.ps1')

$isDryRun = Test-GeoColombiaDryRunSwitch -Execute:$Execute -DryRun:$DryRun
$ctx = Initialize-GeoColombiaAzureSession
$null = Get-GeoColombiaResourceGroupOrThrow -AzureContext $ctx

if ($CorsAllowedOrigins -eq '*') {
    throw 'CORS_ALLOWED_ORIGINS=* está prohibido en producción.'
}
if ($CorsAllowedOrigins -match 'REPLACE|example\.com|tudominio|pending|placeholder') {
    throw 'CORS_ALLOWED_ORIGINS contiene un placeholder. Use el dominio SWA real.'
}
if ($CorsAllowedOrigins -and $CorsAllowedOrigins -notmatch '^https://') {
    Write-GeoColombiaWarn 'CORS debería usar HTTPS en producción.'
}

$envPairs = @(
    "APP_ENV=$AppEnv",
    "LOG_LEVEL=$LogLevel",
    "API_DOCS_ENABLED=$ApiDocsEnabled"
)
if ($CorsAllowedOrigins) {
    $envPairs += "CORS_ALLOWED_ORIGINS=$CorsAllowedOrigins"
}

Write-GeoColombiaInfo ("Modo: {0}" -f $(if ($isDryRun) { 'DRY-RUN' } else { 'EXECUTE' }))
Write-GeoColombiaInfo ("App: {0}" -f $script:GeoColombiaContainerApp)
foreach ($pair in $envPairs) {
    Write-Host ("  env: {0}" -f $pair)
}

$azArgs = @(
    'containerapp', 'update',
    '-g', $script:GeoColombiaResourceGroup,
    '-n', $script:GeoColombiaContainerApp,
    '--set-env-vars'
) + $envPairs

$result = Invoke-GeoColombiaAzOrPlan -AzArgs $azArgs -IsDryRun $isDryRun `
    -Description 'Actualizar variables de entorno de Container App'

if (-not $isDryRun -and $result.ExitCode -ne 0) {
    throw "Falló update de env. ExitCode=$($result.ExitCode)"
}

return [pscustomobject]@{
    Action = $(if ($isDryRun) { 'planned' } else { 'updated' })
    DryRun = $isDryRun
    Env    = $envPairs
    Result = $result
}
