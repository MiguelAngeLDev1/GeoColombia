#Requires -Version 5.1
<#
.SYNOPSIS
  Lectura: estado de infraestructura GeoColombia en la suscripción personal.

.DESCRIPTION
  Valida identidad, lista recursos del RG, comprueba nombres previstos y
  reporta si existen CAE / Container App / SWA. No crea ni modifica nada.

.EXAMPLE
  .\scripts\Get-GeoColombiaInfraStatus.ps1
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'GeoColombia.Infra.ps1')

$ctx = Initialize-GeoColombiaAzureSession
Write-GeoColombiaInfo "Usuario: $($ctx.User)"
Write-GeoColombiaInfo "Subscription: $($ctx.SubscriptionId)"

$rg = Get-GeoColombiaResourceGroupOrThrow -AzureContext $ctx
Write-GeoColombiaInfo "RG: $($rg.name) @ $($rg.location)"

$resources = Get-GeoColombiaAzJson @(
    'resource', 'list',
    '-g', $script:GeoColombiaResourceGroup,
    '-o', 'json'
)
if ($null -eq $resources) {
    $resources = @()
}
if ($resources -isnot [System.Array]) {
    $resources = @($resources)
}

Write-Host ''
Write-GeoColombiaInfo ("Recursos en RG: {0}" -f $resources.Count)
foreach ($res in $resources) {
    Write-Host ("  - {0} ({1})" -f $res.name, $res.type)
}

$planned = @(
    [pscustomobject]@{ Kind = 'ContainerAppsEnvironment'; Name = $script:GeoColombiaContainerAppsEnvironment; Type = 'Microsoft.App/managedEnvironments' },
    [pscustomobject]@{ Kind = 'ContainerApp'; Name = $script:GeoColombiaContainerApp; Type = 'Microsoft.App/containerApps' },
    [pscustomobject]@{ Kind = 'StaticWebApp'; Name = $script:GeoColombiaStaticWebApp; Type = 'Microsoft.Web/staticSites' }
)

Write-Host ''
Write-GeoColombiaInfo 'Nombres previstos vs existencia:'
foreach ($item in $planned) {
    $found = $resources | Where-Object {
        $_.name -eq $item.Name -and $_.type -eq $item.Type
    } | Select-Object -First 1
    $status = if ($found) { "EXISTS ($($found.name))" } else { 'NOT_CREATED' }
    Write-Host ("  [{0}] {1} => {2}" -f $item.Kind, $item.Name, $status)
}

$forbiddenPresent = @()
foreach ($res in $resources) {
    if ($script:GeoColombiaForbiddenResourceTypes -contains [string]$res.type) {
        $forbiddenPresent += $res
    }
}
if ($forbiddenPresent.Count -gt 0) {
    Write-GeoColombiaWarn 'Se detectaron recursos de alto coste / no aprobados en el RG:'
    foreach ($f in $forbiddenPresent) {
        Write-Host ("  ! {0} ({1})" -f $f.name, $f.type)
    }
}
else {
    Write-GeoColombiaInfo 'Sin recursos prohibidos (ACR/LA/Redis/APIM/FrontDoor/VM) en el RG.'
}

Write-Host ''
Write-GeoColombiaInfo 'GHCR image repo previsto (no verificado aquí):'
Write-Host ("  {0}:<tag>" -f $script:GeoColombiaGhcrImageRepository)

return [pscustomobject]@{
    Context          = $ctx
    ResourceGroup    = $rg.name
    ResourceCount    = $resources.Count
    Resources        = $resources
    PlannedNames     = $planned
    ForbiddenPresent = $forbiddenPresent
}
