#Requires -Version 5.1
<#
.SYNOPSIS
  Constantes y helpers compartidos para scripts de infraestructura GeoColombia.

.NOTES
  No crea recursos. Debe usarse con Assert-GeoColombiaAzureContext.
  Dry-run es el modo por defecto de los scripts New-*.
#>

Set-StrictMode -Version Latest

$script:GeoColombiaResourceGroup = 'rg-geocolombia-dev'
$script:GeoColombiaLocation = 'eastus2'
$script:GeoColombiaBudgetName = 'budget-geocolombia'

# Nombres propuestos (no existen todavía; sujetos a aprobación).
$script:GeoColombiaContainerAppsEnvironment = 'cae-geocolombia-dev'
$script:GeoColombiaContainerApp = 'ca-geocolombia-api'
$script:GeoColombiaStaticWebApp = 'swa-geocolombia'
$script:GeoColombiaGhcrImageRepository = 'ghcr.io/miguelangeldev1/geocolombia-api'

# Límites de coste / seguridad de escala.
$script:GeoColombiaCpu = '0.25'
$script:GeoColombiaMemory = '0.5Gi'
$script:GeoColombiaMinReplicas = 0
$script:GeoColombiaMaxReplicas = 1
$script:GeoColombiaTargetPort = 8000

# Recursos / planes prohibidos en scripts de creación.
$script:GeoColombiaForbiddenResourceTypes = @(
    'Microsoft.ContainerRegistry/registries',
    'Microsoft.OperationalInsights/workspaces',
    'Microsoft.Cache/Redis',
    'Microsoft.ApiManagement/service',
    'Microsoft.Cdn/profiles',
    'Microsoft.Network/frontDoors',
    'Microsoft.Compute/virtualMachines'
)

function Write-GeoColombiaInfo {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "[GeoColombia Infra] $Message" -ForegroundColor Cyan
}

function Write-GeoColombiaWarn {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "[GeoColombia Infra] WARN: $Message" -ForegroundColor Yellow
}

function Write-GeoColombiaError {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "[GeoColombia Infra] ERROR: $Message" -ForegroundColor Red
}

function Initialize-GeoColombiaAzureSession {
    <#
    .SYNOPSIS
      Aísla AZURE_CONFIG_DIR en proceso, dot-source Assert y valida allowlist.

    .NOTES
      Solo asigna $env:AZURE_CONFIG_DIR en esta sesión de PowerShell.
      No modifica %USERPROFILE%\.azure ni ejecuta az logout.
      Obligatoria: no puede omitirse antes de operaciones az.
    #>
    $assertPath = Join-Path $PSScriptRoot 'Assert-GeoColombiaAzure.ps1'
    if (-not (Test-Path -LiteralPath $assertPath)) {
        throw "No se encontró $assertPath"
    }
    . $assertPath

    $isolated = [System.IO.Path]::GetFullPath($script:GeoColombiaIsolatedConfigDir)
    $global = [System.IO.Path]::GetFullPath($script:GeoColombiaGlobalConfigDir)

    if (-not (Test-Path -LiteralPath $isolated)) {
        throw "Configuración aislada inexistente: $isolated. Ejecute azure-geocolombia.ps1 primero."
    }

    # Forzar aislamiento en este proceso (no toca la config corporativa en disco).
    $env:AZURE_CONFIG_DIR = $isolated

    if ([System.IO.Path]::GetFullPath($env:AZURE_CONFIG_DIR) -eq $global) {
        throw 'Refusing to use corporate Azure CLI config for GeoColombia.'
    }

    return Assert-GeoColombiaAzureContext
}

function Test-GeoColombiaDryRunSwitch {
    param(
        [switch] $Execute,
        [switch] $DryRun
    )
    # Por defecto: dry-run. Solo -Execute desactiva dry-run.
    # -DryRun explícito siempre gana sobre -Execute (seguridad).
    if ($DryRun) {
        return $true
    }
    if ($Execute) {
        return $false
    }
    return $true
}

function Assert-GeoColombiaScaleLimits {
    param(
        [int] $MinReplicas = $script:GeoColombiaMinReplicas,
        [int] $MaxReplicas = $script:GeoColombiaMaxReplicas,
        [string] $Cpu = $script:GeoColombiaCpu,
        [string] $Memory = $script:GeoColombiaMemory
    )

    if ($MinReplicas -lt 0) {
        throw "minReplicas inválido: $MinReplicas"
    }
    if ($MaxReplicas -gt 1) {
        throw "maxReplicas=$MaxReplicas no permitido. Presupuesto GeoColombia exige maxReplicas<=1."
    }
    if ($MaxReplicas -lt 1) {
        throw "maxReplicas debe ser al menos 1 (recibido $MaxReplicas)."
    }
    if ($MinReplicas -gt $MaxReplicas) {
        throw "minReplicas ($MinReplicas) > maxReplicas ($MaxReplicas)."
    }
    if ($Cpu -ne '0.25') {
        throw "CPU='$Cpu' no aprobada. Use 0.25 vCPU."
    }
    if ($Memory -notin @('0.5Gi', '0.5gi', '0.5GI')) {
        throw "Memory='$Memory' no aprobada. Use 0.5Gi."
    }
}

function Assert-GeoColombiaNoForbiddenResourcesInPlan {
    param([string[]] $PlannedResourceTypes)

    foreach ($type in $PlannedResourceTypes) {
        if ($script:GeoColombiaForbiddenResourceTypes -contains $type) {
            throw "Plan incluye recurso prohibido por coste/seguridad: $type"
        }
    }
}

function Get-GeoColombiaResourceGroupOrThrow {
    param([Parameter(Mandatory)] $AzureContext)

    $null = $AzureContext
    $rg = Get-GeoColombiaAzJson @(
        'group', 'show',
        '-n', $script:GeoColombiaResourceGroup,
        '-o', 'json'
    )
    if ($null -eq $rg) {
        throw "Resource group '$script:GeoColombiaResourceGroup' no encontrado."
    }
    if ([string]$rg.location -ne $script:GeoColombiaLocation) {
        throw "RG location='$($rg.location)' distinta de '$script:GeoColombiaLocation'."
    }
    return $rg
}

function Invoke-GeoColombiaAzOrPlan {
    <#
    .SYNOPSIS
      En dry-run imprime el comando; con Execute lo corre tras Assert.
    #>
    param(
        [Parameter(Mandatory)][string[]] $AzArgs,
        [Parameter(Mandatory)][bool] $IsDryRun,
        [string] $Description = ''
    )

    $null = Assert-GeoColombiaAzureContext
    $cmd = 'az ' + ($AzArgs -join ' ')
    if ($Description) {
        Write-GeoColombiaInfo $Description
    }

    if ($IsDryRun) {
        Write-Host "[DRY-RUN] $cmd" -ForegroundColor DarkYellow
        return [pscustomobject]@{
            DryRun   = $true
            ExitCode = 0
            Command  = $cmd
            Output   = $null
        }
    }

    Write-GeoColombiaWarn "EXECUTE: $cmd"
    $raw = & az @AzArgs 2>&1
    $exit = $LASTEXITCODE
    return [pscustomobject]@{
        DryRun   = $false
        ExitCode = $exit
        Command  = $cmd
        Output   = $raw
    }
}
