#Requires -Version 5.1
<#
.SYNOPSIS
  Habilita ingress HTTPS externo de la API SOLO con allowlist del operador.

.DESCRIPTION
  Por defecto DRY-RUN.
  Procedimiento EXECUTE (sin YAML parcial peligroso):
    1) Verificar que la Container App existe (creada SIN ingress).
    2) az containerapp ingress enable (external, puerto 8000).
    3) Inmediatamente az containerapp ingress access-restriction set Allow /CIDR.
    4) Listar reglas; exigir al menos una Allow con el CIDR exacto.
    5) Si algo falla tras enable: az containerapp ingress disable (rollback).

  Semantica Azure: action=Allow permite esos CIDR y deniega el resto.
  Sin reglas, todo el trafico estaria permitido.

  Ventana residual entre enable y set: segundos; no anunciar FQDN hasta verificar.
  Validacion real de denegacion queda pendiente hasta existir infraestructura.

  Obtener IP: .\scripts\Get-GeoColombiaOperatorPublicIp.ps1

.PARAMETER OperatorPublicIpCidr
  IPv4 en CIDR, por ejemplo 203.0.113.10/32

.EXAMPLE
  .\scripts\Set-GeoColombiaContainerAppIngressAllowlist.ps1 -OperatorPublicIpCidr 203.0.113.10/32
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $OperatorPublicIpCidr,

    [switch] $Execute,
    [switch] $DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'GeoColombia.Infra.ps1')

function Test-GeoColombiaAllowlistCidr {
    param([Parameter(Mandatory)][string] $Cidr)

    if ($Cidr -notmatch '^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/(\d{1,2})$') {
        throw "OperatorPublicIpCidr invalido: '$Cidr'. Use por ejemplo 203.0.113.10/32"
    }
    $octets = @(
        [int]$Matches[1],
        [int]$Matches[2],
        [int]$Matches[3],
        [int]$Matches[4]
    )
    $prefix = [int]$Matches[5]
    foreach ($o in $octets) {
        if ($o -lt 0 -or $o -gt 255) {
            throw "Octeto fuera de rango en '$Cidr'."
        }
    }
    if ($prefix -lt 24 -or $prefix -gt 32) {
        throw "Prefijo /$prefix no permitido. Use /32 (recomendado) o entre /24 y /32."
    }

    $a = $octets[0]
    $b = $octets[1]
    $ip = ($octets -join '.')
    if ($a -eq 0 -or $a -eq 127 -or $a -ge 224) {
        throw "IP '$ip' no es publica."
    }
    if ($a -eq 10 -or ($a -eq 192 -and $b -eq 168) -or ($a -eq 172 -and $b -ge 16 -and $b -le 31)) {
        throw "IP '$ip' es privada (RFC1918)."
    }
    if ($a -eq 169 -and $b -eq 254) {
        throw "IP '$ip' es link-local."
    }
    if ($a -eq 100 -and $b -ge 64 -and $b -le 127) {
        throw "IP '$ip' es CGNAT (100.64/10), no apta como allowlist de Internet fijo."
    }
    if ($Cidr -match 'REPLACE|example|pending|placeholder|0\.0\.0\.0') {
        throw 'CIDR placeholder o 0.0.0.0 rechazado.'
    }
}

function Invoke-GeoColombiaIngressDisableRollback {
    Write-GeoColombiaError 'Rollback: deshabilitando ingress para evitar exposicion abierta...'
    return Invoke-GeoColombiaAzOrPlan -AzArgs @(
        'containerapp', 'ingress', 'disable',
        '-g', $script:GeoColombiaResourceGroup,
        '-n', $script:GeoColombiaContainerApp
    ) -IsDryRun $false -Description 'Rollback: ingress disable'
}

$isDryRun = Test-GeoColombiaDryRunSwitch -Execute:$Execute -DryRun:$DryRun
$ctx = Initialize-GeoColombiaAzureSession
$null = Get-GeoColombiaResourceGroupOrThrow -AzureContext $ctx
Test-GeoColombiaAllowlistCidr -Cidr $OperatorPublicIpCidr

Write-GeoColombiaInfo ("Modo: {0}" -f $(if ($isDryRun) { 'DRY-RUN' } else { 'EXECUTE' }))
Write-GeoColombiaInfo ("App: {0}" -f $script:GeoColombiaContainerApp)
Write-GeoColombiaInfo ("Allowlist: {0} (Allow; deniega el resto)" -f $OperatorPublicIpCidr)

$enableArgs = @(
    'containerapp', 'ingress', 'enable',
    '-g', $script:GeoColombiaResourceGroup,
    '-n', $script:GeoColombiaContainerApp,
    '--type', 'external',
    '--target-port', [string]$script:GeoColombiaTargetPort,
    '--transport', 'http'
)
$restrictArgs = @(
    'containerapp', 'ingress', 'access-restriction', 'set',
    '-g', $script:GeoColombiaResourceGroup,
    '-n', $script:GeoColombiaContainerApp,
    '--rule-name', 'operator-allow',
    '--ip-address', $OperatorPublicIpCidr,
    '--action', 'Allow',
    '--description', 'GeoColombia controlled deploy operator only'
)

if ($isDryRun) {
    Write-Host '[DRY-RUN] Secuencia segura (sin YAML parcial):' -ForegroundColor DarkYellow
    $null = Invoke-GeoColombiaAzOrPlan -AzArgs $enableArgs -IsDryRun $true `
        -Description 'Paso 1/2: habilitar ingress external'
    $null = Invoke-GeoColombiaAzOrPlan -AzArgs $restrictArgs -IsDryRun $true `
        -Description 'Paso 2/2: Allow IP (inmediato; sin anunciar FQDN antes de verificar)'
    Write-Host '[DRY-RUN] Luego: access-restriction list + prueba +/- ; si falla, ingress disable' -ForegroundColor DarkYellow
    $result = [pscustomobject]@{ DryRun = $true; ExitCode = 0; Command = 'enable+allowlist'; Output = $null }
}
else {
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
    if ($null -eq $existing) {
        throw "Container App '$($script:GeoColombiaContainerApp)' no existe. Cree primero sin ingress."
    }

    $enabled = $false
    try {
        $enableResult = Invoke-GeoColombiaAzOrPlan -AzArgs $enableArgs -IsDryRun $false `
            -Description 'Habilitar ingress external (ventana minima hasta Allow)'
        if ($enableResult.ExitCode -ne 0) {
            throw "Fallo ingress enable. ExitCode=$($enableResult.ExitCode) Output=$($enableResult.Output)"
        }
        $enabled = $true

        $restrictResult = Invoke-GeoColombiaAzOrPlan -AzArgs $restrictArgs -IsDryRun $false `
            -Description 'Aplicar Allow IP inmediatamente'
        if ($restrictResult.ExitCode -ne 0) {
            throw "Fallo access-restriction set. ExitCode=$($restrictResult.ExitCode) Output=$($restrictResult.Output)"
        }

        $null = Assert-GeoColombiaAzureContext
        $rules = Get-GeoColombiaAzJson @(
            'containerapp', 'ingress', 'access-restriction', 'list',
            '-g', $script:GeoColombiaResourceGroup,
            '-n', $script:GeoColombiaContainerApp,
            '-o', 'json'
        )
        $ruleList = @($rules)
        if ($ruleList.Count -lt 1) {
            throw 'NO_GO: ingress sin reglas de allowlist tras set.'
        }

        $allowOk = $false
        foreach ($rule in $ruleList) {
            $action = [string]$rule.action
            $range = [string]$rule.ipAddressRange
            if ($action -ne 'Allow') {
                throw "NO_GO: regla no-Allow detectada ($action)."
            }
            if ($range -eq $OperatorPublicIpCidr) {
                $allowOk = $true
            }
        }
        if (-not $allowOk) {
            throw "NO_GO: no se encontro regla Allow para $OperatorPublicIpCidr"
        }

        Write-GeoColombiaInfo 'Reglas de acceso verificadas (Allow):'
        $ruleList | ConvertTo-Json -Depth 5 | Write-Host
        $result = $restrictResult
    }
    catch {
        if ($enabled) {
            $null = Invoke-GeoColombiaIngressDisableRollback
        }
        throw
    }
}

Write-GeoColombiaInfo 'Prueba positiva: desde la IP allowlisted, GET /health'
Write-GeoColombiaInfo 'Prueba negativa: desde otra red (datos moviles) debe denegar acceso'
Write-GeoColombiaWarn 'La IP del operador puede cambiar; re-ejecutar Get-GeoColombiaOperatorPublicIp.ps1 si falla el acceso.'
Write-GeoColombiaWarn 'Validacion real de ingress queda pendiente hasta que exista la Container App.'

return [pscustomobject]@{
    Action        = $(if ($isDryRun) { 'planned' } else { 'updated' })
    DryRun        = $isDryRun
    AllowlistCidr = $OperatorPublicIpCidr
    Result        = $result
}
