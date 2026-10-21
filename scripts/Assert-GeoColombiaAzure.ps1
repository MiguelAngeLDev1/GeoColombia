#Requires -Version 5.1
<#
.SYNOPSIS
  Validación obligatoria de identidad Azure para operaciones GeoColombia.

.DESCRIPTION
  Debe invocarse inmediatamente ANTES de cada operación az (no solo al abrir
  la terminal). Falla con exit code distinto de 0 si algo no coincide.

  Allowlist confirmada por el propietario del proyecto:
  - Usuario: miguel.qs1999@gmail.com
  - Tenant:  f1a75a44-3293-4ea7-9f2c-d357e06088ff
  - Subscription: ad2d1b2b-e77a-4074-8bd1-e0ccbf989469

  Uso desde otros scripts:
    . "$PSScriptRoot\Assert-GeoColombiaAzure.ps1"
    Assert-GeoColombiaAzureContext
    az group show ...

.NOTES
  No modifica la configuración corporativa (%USERPROFILE%\.azure).
  No ejecuta az logout.
#>

Set-StrictMode -Version Latest

$script:GeoColombiaAuthorizedUser = 'miguel.qs1999@gmail.com'
$script:GeoColombiaAuthorizedTenantId = 'f1a75a44-3293-4ea7-9f2c-d357e06088ff'
$script:GeoColombiaAuthorizedSubscriptionId = 'ad2d1b2b-e77a-4074-8bd1-e0ccbf989469'
$script:GeoColombiaIsolatedConfigDir = Join-Path $env:USERPROFILE '.azure-geocolombia'
$script:GeoColombiaGlobalConfigDir = Join-Path $env:USERPROFILE '.azure'

function Get-GeoColombiaAzJson {
    param([Parameter(Mandatory)][string[]] $AzArgs)

    $raw = & az @AzArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        $text = ($raw | Out-String).Trim()
        throw "az $($AzArgs -join ' ') falló: $text"
    }
    $text = ($raw | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($text) -or $text -eq 'null') {
        return $null
    }
    return ($text | ConvertFrom-Json)
}

function Assert-GeoColombiaAzureContext {
    <#
    .SYNOPSIS
      Verifica AZURE_CONFIG_DIR, usuario, tenant, suscripción y estado Enabled.
    .OUTPUTS
      PSCustomObject con ConfigDir, User, TenantId, SubscriptionId, SubscriptionName, State
    #>
    [CmdletBinding()]
    param()

    $ErrorActionPreference = 'Stop'

    $expectedConfig = [System.IO.Path]::GetFullPath($script:GeoColombiaIsolatedConfigDir)
    $globalConfig = [System.IO.Path]::GetFullPath($script:GeoColombiaGlobalConfigDir)

    if ([string]::IsNullOrWhiteSpace($env:AZURE_CONFIG_DIR)) {
        throw 'AZURE_CONFIG_DIR no está definido. Use . .\scripts\azure-geocolombia.ps1 o enter-geocolombia-azure.ps1'
    }

    $activeConfig = [System.IO.Path]::GetFullPath($env:AZURE_CONFIG_DIR)

    if ($activeConfig -eq $globalConfig) {
        throw "AZURE_CONFIG_DIR apunta a la configuración corporativa ($globalConfig). Abortado."
    }

    if ($activeConfig -ne $expectedConfig) {
        throw "AZURE_CONFIG_DIR='$activeConfig' no es el directorio personal autorizado '$expectedConfig'."
    }

    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        throw 'Azure CLI (az) no está disponible en PATH.'
    }

    $account = Get-GeoColombiaAzJson @('account', 'show', '-o', 'json')
    if ($null -eq $account) {
        throw 'No hay cuenta Azure activa en el entorno aislado. Ejecute azure-geocolombia.ps1'
    }

    $userName = [string]$account.user.name
    $tenantId = [string]$account.tenantId
    $subscriptionId = [string]$account.id
    $subscriptionName = [string]$account.name
    $state = [string]$account.state

    if ($userName.Trim().ToLowerInvariant() -ne $script:GeoColombiaAuthorizedUser) {
        throw "Usuario no autorizado: '$userName'. Se requiere '$script:GeoColombiaAuthorizedUser'."
    }

    if ($tenantId -ne $script:GeoColombiaAuthorizedTenantId) {
        throw "Tenant no autorizado: '$tenantId'. Se requiere '$script:GeoColombiaAuthorizedTenantId'."
    }

    if ($subscriptionId -ne $script:GeoColombiaAuthorizedSubscriptionId) {
        throw "Suscripción no autorizada: '$subscriptionId'. Se requiere '$script:GeoColombiaAuthorizedSubscriptionId'."
    }

    if ($state -ne 'Enabled') {
        throw "La suscripción no está Enabled (estado: '$state')."
    }

    return [pscustomobject]@{
        ConfigDir          = $activeConfig
        User               = $userName
        TenantId           = $tenantId
        SubscriptionId     = $subscriptionId
        SubscriptionName   = $subscriptionName
        State              = $state
        AuthorizedUser     = $script:GeoColombiaAuthorizedUser
        AuthorizedTenantId = $script:GeoColombiaAuthorizedTenantId
        AuthorizedSubscriptionId = $script:GeoColombiaAuthorizedSubscriptionId
    }
}

function Invoke-GeoColombiaAz {
    <#
    .SYNOPSIS
      Ejecuta un comando az tras Assert-GeoColombiaAzureContext.
    .EXAMPLE
      Invoke-GeoColombiaAz -AzArgs @('group','show','-n','rg-geocolombia-dev','-o','json')
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string[]] $AzArgs
    )

    $null = Assert-GeoColombiaAzureContext
    $raw = & az @AzArgs 2>&1
    $exit = $LASTEXITCODE
    return [pscustomobject]@{
        ExitCode = $exit
        Output   = $raw
    }
}
