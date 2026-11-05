#Requires -Version 5.1
<#
.SYNOPSIS
  Obtiene la IP pública actual del operador para allowlist ACA (sin guardarla en el repo).

.DESCRIPTION
  Consulta un servicio HTTPS público de "what is my IP" solo en memoria.
  No escribe archivos. No hardcodea IPs. No crea recursos Azure.
  La IP puede cambiar (ISP / móvil / VPN): volver a consultar antes de cada deploy.

  Fuentes (solo lectura de IP): api.ipify.org, ifconfig.me/ip

.EXAMPLE
  .\scripts\Get-GeoColombiaOperatorPublicIp.ps1
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-GeoColombiaPublicIpv4 {
    param([Parameter(Mandatory)][string] $Candidate)

    if ($Candidate -notmatch '^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$') {
        return $false
    }
    $octets = @(
        [int]$Matches[1],
        [int]$Matches[2],
        [int]$Matches[3],
        [int]$Matches[4]
    )
    foreach ($o in $octets) {
        if ($o -lt 0 -or $o -gt 255) {
            return $false
        }
    }

    $a = $octets[0]
    $b = $octets[1]

    # 0.0.0.0/8, loopback, RFC1918, link-local, CGNAT, multicast/reserved
    if ($a -eq 0) { return $false }
    if ($a -eq 127) { return $false }
    if ($a -eq 10) { return $false }
    if ($a -eq 192 -and $b -eq 168) { return $false }
    if ($a -eq 172 -and $b -ge 16 -and $b -le 31) { return $false }
    if ($a -eq 169 -and $b -eq 254) { return $false }
    if ($a -eq 100 -and $b -ge 64 -and $b -le 127) { return $false }
    if ($a -ge 224) { return $false }
    if ($Candidate -eq '255.255.255.255') { return $false }

    return $true
}

Write-Host '[GeoColombia] Consultando IP publica del operador (no se persiste)...' -ForegroundColor Cyan

$ip = $null
$sources = @(
    'https://api.ipify.org',
    'https://ifconfig.me/ip'
)

foreach ($url in $sources) {
    try {
        $raw = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15).Content.Trim()
        if (Test-GeoColombiaPublicIpv4 -Candidate $raw) {
            $ip = $raw
            Write-Host ("  Fuente: {0}" -f $url) -ForegroundColor DarkGray
            break
        }
        else {
            Write-Host ("  Respuesta no publica/valida desde {0}: {1}" -f $url, $raw) -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host ("  Fallo {0}: {1}" -f $url, $_.Exception.Message) -ForegroundColor Yellow
    }
}

if (-not $ip) {
    throw 'No se pudo determinar una IPv4 publica valida. Compruebe red/VPN y reintente.'
}

$cidr = "$ip/32"
Write-Host ("  IP publica : {0}" -f $ip) -ForegroundColor Green
Write-Host ("  CIDR Allow : {0}" -f $cidr) -ForegroundColor Green
Write-Host ''
Write-Host 'Usar en el siguiente comando (NO commitear esta IP):' -ForegroundColor Cyan
Write-Host ("  .\scripts\Set-GeoColombiaContainerAppIngressAllowlist.ps1 -OperatorPublicIpCidr '{0}'" -f $cidr)

return [pscustomobject]@{
    PublicIp  = $ip
    Cidr      = $cidr
    Persisted = $false
}
