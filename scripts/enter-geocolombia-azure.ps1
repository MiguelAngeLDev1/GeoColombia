#Requires -Version 5.1
<#
.SYNOPSIS
  Abre una terminal PowerShell hija dedicada a Azure CLI de GeoColombia.

.DESCRIPTION
  Lanza un proceso nuevo con AZURE_CONFIG_DIR=%USERPROFILE%\.azure-geocolombia
  y ejecuta azure-geocolombia.ps1 (allowlist estricta) dentro de esa terminal.

  La sesión corporativa en %USERPROFILE%\.azure no se modifica.

  Persistencia:
  - Trabaje en la TERMINAL HIJA abierta por este script.
  - & .\scripts\azure-geocolombia.ps1 no deja AZURE_CONFIG_DIR en el padre.
  - Dot-sourcing en la terminal actual: . .\scripts\azure-geocolombia.ps1

  No usa setx ni modifica $PROFILE.
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$SetupScript = Join-Path $PSScriptRoot 'azure-geocolombia.ps1'
$IsolatedConfigDir = Join-Path $env:USERPROFILE '.azure-geocolombia'

if (-not (Test-Path -LiteralPath $SetupScript)) {
    throw "No se encontró $SetupScript"
}

if (-not (Test-Path -LiteralPath $IsolatedConfigDir)) {
    New-Item -ItemType Directory -Path $IsolatedConfigDir -Force | Out-Null
}

$argList = @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    @"
`$env:AZURE_CONFIG_DIR = '$IsolatedConfigDir'
Set-Location -LiteralPath '$RepoRoot'
Write-Host 'Terminal dedicada GeoColombia Azure' -ForegroundColor Green
Write-Host ("AZURE_CONFIG_DIR = " + `$env:AZURE_CONFIG_DIR) -ForegroundColor Cyan
Write-Host 'Allowlist: miguel.qs1999@gmail.com / tenant+subscription personales' -ForegroundColor DarkGray
Write-Host 'La sesión corporativa (.azure) no se usa en esta ventana.' -ForegroundColor DarkGray
. '$SetupScript'
"@
)

Write-Host '[GeoColombia Azure] Abriendo PowerShell hijo con AZURE_CONFIG_DIR aislado...' -ForegroundColor Cyan
Write-Host "[GeoColombia Azure] Config: $IsolatedConfigDir" -ForegroundColor Cyan
Write-Host '[GeoColombia Azure] Trabaje en la ventana nueva. Esta terminal padre conserva su entorno.' -ForegroundColor Yellow

Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -WorkingDirectory $RepoRoot | Out-Null
