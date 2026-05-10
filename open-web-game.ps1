param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$gameDir = Join-Path $rootDir 'game'
$url = 'http://127.0.0.1:5173/'
$port = 5173

function Test-PortOpen {
  param(
    [int]$Port
  )

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne(250)

    if ($connected -and $client.Connected) {
      $client.EndConnect($async) | Out-Null
      $client.Close()
      return $true
    }

    $client.Close()
    return $false
  } catch {
    return $false
  }
}

function Ensure-Command {
  param(
    [string]$Name,
    [string]$Hint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "$Name was not found."
    Write-Host $Hint
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
  }
}

if (-not (Test-Path $gameDir)) {
  Write-Host ""
  Write-Host "Game folder not found: $gameDir"
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}

Ensure-Command -Name 'node' -Hint 'Please install Node.js first: https://nodejs.org/'
Ensure-Command -Name 'npm' -Hint 'Please install Node.js first: https://nodejs.org/'

$nodeModulesDir = Join-Path $gameDir 'node_modules'
if (-not (Test-Path $nodeModulesDir)) {
  Write-Host ""
  Write-Host "Installing dependencies for the first run..."
  Push-Location $gameDir
  try {
    & npm install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed."
    }
  } finally {
    Pop-Location
  }
}

if (Test-PortOpen -Port $port) {
  Write-Host ""
  Write-Host "Detected an existing local server on port $port."
  if (-not $NoBrowser) {
    Start-Process $url | Out-Null
  }
  exit 0
}

Write-Host ""
Write-Host "Starting the local web game server..."

$devCommand = 'npm run dev -- --host 127.0.0.1 --port 5173'
$serverProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $devCommand -WorkingDirectory $gameDir -PassThru

for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1

  if ($serverProcess.HasExited) {
    Write-Host ""
    Write-Host "The dev server window closed before the site was ready."
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
  }

  if (Test-PortOpen -Port $port) {
    Write-Host "Server is ready: $url"
    if (-not $NoBrowser) {
      Start-Process $url | Out-Null
    }
    exit 0
  }
}

Write-Host ""
Write-Host "The server window is open, but the site did not respond within 60 seconds."
Write-Host "You can try opening this address manually later:"
Write-Host $url
Write-Host ""
Read-Host "Press Enter to close"
