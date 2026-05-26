param(
  [int]$Port = 5173,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$webDir = Join-Path $rootDir 'web'

function Pause-And-Exit {
  param(
    [int]$Code = 1
  )

  Write-Host ''
  Read-Host 'Press Enter to close'
  exit $Code
}

function Test-PortOpen {
  param(
    [int]$Port
  )

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $connected = $async.AsyncWaitHandle.WaitOne(180)

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

function Find-FreePort {
  param(
    [int]$StartPort
  )

  for ($candidate = $StartPort; $candidate -lt ($StartPort + 80); $candidate++) {
    if (-not (Test-PortOpen -Port $candidate)) {
      return $candidate
    }
  }

  throw "No free local port was found from $StartPort to $($StartPort + 79)."
}

function Get-MimeType {
  param(
    [string]$Path
  )

  $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  switch ($ext) {
    '.html' { return 'text/html; charset=utf-8' }
    '.js' { return 'text/javascript; charset=utf-8' }
    '.mjs' { return 'text/javascript; charset=utf-8' }
    '.css' { return 'text/css; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.txt' { return 'text/plain; charset=utf-8' }
    '.svg' { return 'image/svg+xml' }
    '.png' { return 'image/png' }
    '.jpg' { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.webp' { return 'image/webp' }
    '.gif' { return 'image/gif' }
    '.ico' { return 'image/x-icon' }
    '.mp3' { return 'audio/mpeg' }
    '.wav' { return 'audio/wav' }
    '.ogg' { return 'audio/ogg' }
    '.mp4' { return 'video/mp4' }
    '.webm' { return 'video/webm' }
    '.woff' { return 'font/woff' }
    '.woff2' { return 'font/woff2' }
    '.ttf' { return 'font/ttf' }
    default { return 'application/octet-stream' }
  }
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$SendBody = $true
  )

  if ($null -eq $Body) {
    $Body = [byte[]]::new(0)
  }

  $header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)

  if ($SendBody -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

function Resolve-RequestPath {
  param(
    [string]$RequestTarget,
    [string]$Root
  )

  $pathOnly = ($RequestTarget -split '\?', 2)[0]
  if ([string]::IsNullOrWhiteSpace($pathOnly) -or $pathOnly -eq '/') {
    $pathOnly = '/index.html'
  }

  $decodedPath = [System.Net.WebUtility]::UrlDecode($pathOnly)
  $relativePath = $decodedPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
  $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $relativePath))
  $rootFullPath = [System.IO.Path]::GetFullPath($Root)
  $rootPrefix = $rootFullPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

  if (-not $fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }

  if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
    return $fullPath
  }

  if ([System.IO.Path]::GetExtension($fullPath) -eq '') {
    return (Join-Path $Root 'index.html')
  }

  return $null
}

if (-not (Test-Path -LiteralPath $webDir -PathType Container)) {
  Write-Host 'Offline web folder was not found:'
  Write-Host $webDir
  Pause-And-Exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $webDir 'index.html') -PathType Leaf)) {
  Write-Host 'index.html was not found in the offline web folder:'
  Write-Host $webDir
  Pause-And-Exit 1
}

$selectedPort = Find-FreePort -StartPort $Port
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $selectedPort)
$url = "http://127.0.0.1:$selectedPort/"

try {
  $listener.Start()
  Write-Host ''
  Write-Host 'Five Elements Medical Way offline server is running.'
  Write-Host "URL: $url"
  Write-Host 'Keep this window open while playing. Press Ctrl+C to stop.'
  Write-Host ''

  if (-not $NoBrowser) {
    Start-Process $url | Out-Null
  }

  while ($true) {
    $client = $listener.AcceptTcpClient()

    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 8192, $true)
      $requestLine = $reader.ReadLine()

      while ($true) {
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line.Length -eq 0) {
          break
        }
      }

      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }

      $parts = $requestLine -split ' '
      $method = $parts[0]
      $target = if ($parts.Length -gt 1) { $parts[1] } else { '/' }

      if ($method -ne 'GET' -and $method -ne 'HEAD') {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Method Not Allowed')
        Send-Response -Stream $stream -StatusCode 405 -StatusText 'Method Not Allowed' -ContentType 'text/plain; charset=utf-8' -Body $body
        continue
      }

      $filePath = Resolve-RequestPath -RequestTarget $target -Root $webDir
      if ($null -eq $filePath -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        Send-Response -Stream $stream -StatusCode 404 -StatusText 'Not Found' -ContentType 'text/plain; charset=utf-8' -Body $body -SendBody ($method -eq 'GET')
        continue
      }

      $bodyBytes = [System.IO.File]::ReadAllBytes($filePath)
      Send-Response -Stream $stream -StatusCode 200 -StatusText 'OK' -ContentType (Get-MimeType -Path $filePath) -Body $bodyBytes -SendBody ($method -eq 'GET')
    } catch {
      try {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Server Error')
        Send-Response -Stream $stream -StatusCode 500 -StatusText 'Server Error' -ContentType 'text/plain; charset=utf-8' -Body $body
      } catch {
      }
    } finally {
      if ($null -ne $client) {
        $client.Close()
      }
    }
  }
} catch {
  Write-Host ''
  Write-Host 'Failed to start the offline server.'
  Write-Host $_.Exception.Message
  Pause-And-Exit 1
} finally {
  if ($null -ne $listener) {
    $listener.Stop()
  }
}
