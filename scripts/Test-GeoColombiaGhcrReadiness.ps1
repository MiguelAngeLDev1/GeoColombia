#Requires -Version 5.1
<#
.SYNOPSIS
  Comprueba preparación local para usar GHCR (sin publicar imágenes).

.DESCRIPTION
  Verifica Docker, presencia de gh CLI, autenticación GitHub (si existe) y
  documenta el nombre de imagen previsto. NO hace docker push ni crea packages.

.EXAMPLE
  .\scripts\Test-GeoColombiaGhcrReadiness.ps1
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'GeoColombia.Infra.ps1')

$report = [ordered]@{
    DockerCli        = $false
    DockerDaemon     = $false
    LocalImage       = $false
    LocalImageName   = 'geocolombia-api:local'
    GhCli            = $false
    GhAuthenticated  = $false
    GhUser           = $null
    ProposedImage    = $script:GeoColombiaGhcrImageRepository
    PushPerformed    = $false
    ReadyToPushLater = $false
    Notes            = @()
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
    $report.DockerCli = $true
    docker info 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) {
        $report.DockerDaemon = $true
    }
    else {
        $report.Notes += 'Docker daemon no disponible.'
    }
}
else {
    $report.Notes += 'Docker CLI no encontrado.'
}

if ($report.DockerDaemon) {
    docker image inspect geocolombia-api:local 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) {
        $report.LocalImage = $true
    }
    else {
        $report.Notes += 'Imagen geocolombia-api:local no encontrada. Construir antes del push.'
    }
}

if (Get-Command gh -ErrorAction SilentlyContinue) {
    $report.GhCli = $true
    $status = gh auth status 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        $report.GhAuthenticated = $true
        try {
            $report.GhUser = (gh api user --jq .login 2>$null)
        }
        catch {
            $report.GhUser = $null
        }
    }
    else {
        $report.Notes += 'gh no autenticado. Para push futuro: gh auth login + scopes write:packages.'
        $report.Notes += ($status.Trim())
    }
}
else {
    $report.Notes += 'GitHub CLI (gh) no instalado. Opcional para automatizar; docker login ghcr.io también sirve.'
}

# Listo para un push futuro solo con daemon + imagen local + auth gh (si gh está instalado).
$report.ReadyToPushLater = $false
if ($report.DockerDaemon -and $report.LocalImage) {
    if (-not $report.GhCli) {
        # docker login ghcr.io manual posible; marcar como parcial.
        $report.ReadyToPushLater = $true
        $report.Notes += 'gh CLI ausente: el push futuro requerirá docker login ghcr.io manual.'
    }
    elseif ($report.GhAuthenticated) {
        $report.ReadyToPushLater = $true
    }
    else {
        $report.ReadyToPushLater = $false
    }
}

Write-Host '[GeoColombia GHCR] Preparación (sin push):' -ForegroundColor Cyan
Write-Host ("  Docker CLI/Daemon : {0}/{1}" -f $report.DockerCli, $report.DockerDaemon)
Write-Host ("  Imagen local      : {0}" -f $report.LocalImage)
Write-Host ("  gh CLI/auth       : {0}/{1} user={2}" -f $report.GhCli, $report.GhAuthenticated, $report.GhUser)
Write-Host ("  Imagen propuesta  : {0}:<tag>" -f $report.ProposedImage)
Write-Host ("  ReadyToPushLater  : {0}" -f $report.ReadyToPushLater)
foreach ($n in $report.Notes) {
    Write-Host ("  NOTE: {0}" -f $n) -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Push futuro (NO ejecutar ahora):' -ForegroundColor DarkGray
Write-Host ("  docker tag geocolombia-api:local {0}:<git-sha>" -f $script:GeoColombiaGhcrImageRepository)
Write-Host ("  docker push {0}:<git-sha>" -f $script:GeoColombiaGhcrImageRepository)

return [pscustomobject]$report
