#Requires -Version 5.1
<#
.SYNOPSIS
  Verifica endpoints del backend GeoColombia (local o remoto).

.DESCRIPTION
  No crea infraestructura. Requiere -BaseUrl explícita (no inventa FQDN).
  Pruebas ligeras: /health, /docs (404 en prod), opcional weather.

.PARAMETER BaseUrl
  URL base HTTPS o HTTP, sin barra final. Ej: http://127.0.0.1:18000
  o https://<fqdn-real-aca>

.PARAMETER IncludeExternalSample
  Si se indica, llama un endpoint ligero a proveedor externo (weather Bogotá).

.EXAMPLE
  .\scripts\Test-GeoColombiaApiEndpoints.ps1 -BaseUrl http://127.0.0.1:18000
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $BaseUrl,

    [switch] $IncludeExternalSample,

    # Por defecto se espera docs deshabilitados (producción).
    # Use -ExpectDocsDisabled:$false solo en entornos de desarrollo.
    [bool] $ExpectDocsDisabled = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($BaseUrl -match 'REPLACE|example\.com|pending|tudominio|placeholder') {
    throw 'BaseUrl contiene placeholder. Use una URL real.'
}

$BaseUrl = $BaseUrl.TrimEnd('/')

function Invoke-GeoCheck {
    param(
        [string] $Path,
        [int[]] $AcceptStatus = @(200)
    )
    $url = "$BaseUrl$Path"
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 45
        $code = [int]$resp.StatusCode
        $ok = $AcceptStatus -contains $code
        return [pscustomobject]@{
            Url     = $url
            Status  = $code
            Ok      = $ok
            Bytes   = $resp.RawContentLength
            Error   = $null
        }
    }
    catch {
        $code = $null
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
        }
        $ok = $code -ne $null -and ($AcceptStatus -contains $code)
        return [pscustomobject]@{
            Url     = $url
            Status  = $code
            Ok      = $ok
            Bytes   = $null
            Error   = $_.Exception.Message
        }
    }
}

Write-Host "[GeoColombia] Probando BaseUrl=$BaseUrl" -ForegroundColor Cyan

$results = @()
$results += Invoke-GeoCheck -Path '/health' -AcceptStatus @(200)
$results += Invoke-GeoCheck -Path '/' -AcceptStatus @(200)

if ($ExpectDocsDisabled) {
    $results += Invoke-GeoCheck -Path '/docs' -AcceptStatus @(404)
    $results += Invoke-GeoCheck -Path '/openapi.json' -AcceptStatus @(404)
}

if ($IncludeExternalSample) {
    $results += Invoke-GeoCheck -Path '/api/v1/weather?latitude=4.6097&longitude=-74.0817' -AcceptStatus @(200)
}

$failed = @($results | Where-Object { -not $_.Ok })
foreach ($r in $results) {
    $mark = if ($r.Ok) { 'OK' } else { 'FAIL' }
    Write-Host ("  [{0}] {1} -> {2}" -f $mark, $r.Url, $r.Status)
}

if ($failed.Count -gt 0) {
    throw ("Fallaron {0} comprobaciones." -f $failed.Count)
}

Write-Host '[GeoColombia] Endpoints OK' -ForegroundColor Green
return $results
