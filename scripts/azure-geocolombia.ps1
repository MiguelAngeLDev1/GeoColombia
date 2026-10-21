#Requires -Version 5.1
<#
.SYNOPSIS
  Activa y valida un Azure CLI aislado para GeoColombia (cuenta personal).

.DESCRIPTION
  Usa AZURE_CONFIG_DIR = %USERPROFILE%\.azure-geocolombia
  No modifica %USERPROFILE%\.azure (sesión corporativa).

  Allowlist obligatoria:
  - miguel.qs1999@gmail.com
  - Tenant f1a75a44-3293-4ea7-9f2c-d357e06088ff
  - Subscription ad2d1b2b-e77a-4074-8bd1-e0ccbf989469

  Uso recomendado (dot-sourcing):
    . .\scripts\azure-geocolombia.ps1

  Si se invoca con & .\scripts\azure-geocolombia.ps1, AZURE_CONFIG_DIR
  NO persiste en la terminal padre. Prefiera enter-geocolombia-azure.ps1
  o el dot-sourcing.

.NOTES
  No ejecuta az logout ni toca la configuración global.
#>

[CmdletBinding()]
param(
    # Omitir az login interactivo (falla si no hay sesión).
    [switch] $NoLogin
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AssertScript = Join-Path $PSScriptRoot 'Assert-GeoColombiaAzure.ps1'
. $AssertScript

$AuthorizedUserExact = $script:GeoColombiaAuthorizedUser
$AuthorizedTenantId = $script:GeoColombiaAuthorizedTenantId
$AuthorizedSubscriptionId = $script:GeoColombiaAuthorizedSubscriptionId
$IsolatedConfigDir = $script:GeoColombiaIsolatedConfigDir
$GlobalConfigDir = $script:GeoColombiaGlobalConfigDir

function Write-GeoInfo([string] $Message) {
    Write-Host "[GeoColombia Azure] $Message" -ForegroundColor Cyan
}

function Write-GeoWarn([string] $Message) {
    Write-Host "[GeoColombia Azure] $Message" -ForegroundColor Yellow
}

function Write-GeoError([string] $Message) {
    Write-Host "[GeoColombia Azure] ERROR: $Message" -ForegroundColor Red
}

# --- 1) Aislar configuración ---
if (-not (Test-Path -LiteralPath $IsolatedConfigDir)) {
    New-Item -ItemType Directory -Path $IsolatedConfigDir -Force | Out-Null
    Write-GeoInfo "Creada carpeta aislada: $IsolatedConfigDir"
}

$env:AZURE_CONFIG_DIR = $IsolatedConfigDir

Write-GeoInfo "AZURE_CONFIG_DIR = $env:AZURE_CONFIG_DIR"
Write-GeoInfo "Config global corporativa (no modificada): $GlobalConfigDir"

# --- 2) Comprobar / iniciar sesión personal ---
$account = $null
try {
    $account = Get-GeoColombiaAzJson @('account', 'show', '-o', 'json')
}
catch {
    $account = $null
}

if ($null -eq $account) {
    if ($NoLogin) {
        Write-GeoError 'No hay sesión en el entorno aislado y -NoLogin está activo.'
        exit 3
    }

    Write-GeoWarn 'No hay sesión personal en el entorno aislado.'
    Write-GeoInfo 'Iniciando az login --use-device-code (cuenta personal)...'
    Write-GeoInfo "Autentíquese exclusivamente con: $AuthorizedUserExact"
    Write-Host ''

    & az login --use-device-code --tenant $AuthorizedTenantId
    if ($LASTEXITCODE -ne 0) {
        Write-GeoError 'az login falló. No se modificó la sesión corporativa.'
        exit 4
    }
}

# Fijar suscripción allowlisted SOLO en el entorno aislado (no toca .azure global).
& az account set --subscription $AuthorizedSubscriptionId
if ($LASTEXITCODE -ne 0) {
    Write-GeoError 'No se pudo fijar la suscripción personal autorizada en el entorno aislado.'
    exit 9
}

# --- 3) Validación obligatoria allowlist ---
try {
    $ctx = Assert-GeoColombiaAzureContext
}
catch {
    Write-GeoError $_.Exception.Message
    Write-GeoError 'Allowlist: usuario + tenant + subscription deben coincidir exactamente.'
    exit 6
}

Write-GeoInfo "Usuario: $($ctx.User)"
Write-GeoInfo "Tenant: $($ctx.TenantId)"
Write-GeoInfo "Subscription: $($ctx.SubscriptionName) ($($ctx.SubscriptionId))"
Write-GeoInfo "Estado: $($ctx.State)"
Write-Host ''
Write-GeoInfo 'Allowlist OK. Entorno GeoColombia listo (este proceso y sus hijos).'
Write-GeoInfo 'Antes de cada operación az futura: Assert-GeoColombiaAzureContext / Invoke-GeoColombiaAz'

$script:GeoColombiaAzure = $ctx
