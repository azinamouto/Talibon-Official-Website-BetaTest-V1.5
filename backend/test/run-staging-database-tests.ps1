param([ValidateSet('staging-database.integration.cjs','content-database.integration.cjs','staff-auth.integration.cjs','media.integration.cjs','generate-content-catalog.cjs')][string]$TestFile = 'staging-database.integration.cjs')
$ErrorActionPreference = 'Stop'
$pgBin = Split-Path (Get-Command psql -ErrorAction Stop).Source
$node = (Get-Command node -ErrorAction Stop).Source
$scratch = Join-Path $PSScriptRoot ('../node_modules/.cache/talgov-staging-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratch | Out-Null
$scratch = (Resolve-Path -LiteralPath $scratch).Path
$data = Join-Path $scratch 'data'
$cluster = Split-Path $scratch -Leaf

function Invoke-LocalProcess([string]$Executable, [string[]]$Arguments) {
  $info = New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName = $Executable
  $info.Arguments = ($Arguments | ForEach-Object { '"' + $_.Replace('"','\"') + '"' }) -join ' '
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  # pg_ctl's server descendants can retain pipe handles on Windows. Its server
  # output goes to -l; capture finite initdb/node processes only.
  $capture = (Split-Path $Executable -Leaf) -ne 'pg_ctl.exe'
  $info.RedirectStandardOutput = $capture
  $info.RedirectStandardError = $capture
  $info.EnvironmentVariables.Clear()
  foreach ($name in @('SystemRoot','WINDIR','PATH','TEMP','TMP')) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ($null -ne $value) { $info.EnvironmentVariables[$name] = $value }
  }
  $info.EnvironmentVariables['LC_ALL'] = 'C'
  $info.EnvironmentVariables['PGPASSFILE'] = Join-Path $scratch 'no-password-file'
  $info.EnvironmentVariables['PGSERVICEFILE'] = Join-Path $scratch 'no-service-file'
  $info.EnvironmentVariables['R2_STAGING_TEST_FIXTURE'] = Join-Path $scratch 'fixture.json'
  $process = [Diagnostics.Process]::Start($info)
  try {
    if ($capture) {
      $stdout = $process.StandardOutput.ReadToEndAsync()
      $stderr = $process.StandardError.ReadToEndAsync()
    }
    $process.WaitForExit()
    if ($capture) {
      Write-Host $stdout.Result
      Write-Host $stderr.Result
    }
    return $process.ExitCode
  } finally { $process.Dispose() }
}

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
$listener.Start(); $port=$listener.LocalEndpoint.Port; $listener.Stop()
try {
  if ((Invoke-LocalProcess (Join-Path $pgBin 'initdb.exe') @('-D',$data,'-U','postgres','-A','trust','--no-locale','--encoding=UTF8','--no-sync')) -ne 0) {
    throw 'Disposable initdb failed'
  }
  # A random port is insufficient proof: pin the fresh data directory and cluster identity too.
  if ((Invoke-LocalProcess (Join-Path $pgBin 'pg_ctl.exe') @('-D',$data,'-l',(Join-Path $scratch 'server.log'),'-o',"-h 127.0.0.1 -p $port -c cluster_name=$cluster",'-w','start')) -ne 0) {
    throw 'Disposable startup failed'
  }
  @{ port=$port; cluster=$cluster } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $scratch 'fixture.json')
  $testTimeout = if ($TestFile -eq 'staff-auth.integration.cjs') { '--test-timeout=240000' } else { '--test-timeout=120000' }
  if ((Invoke-LocalProcess $node @('--test',$testTimeout,(Join-Path $PSScriptRoot $TestFile))) -ne 0) {
    throw 'Staging integration tests failed'
  }
} finally {
  # Also handle a server that started but whose startup wait failed.
  if (Test-Path -LiteralPath (Join-Path $data 'postmaster.pid')) {
    if ((Invoke-LocalProcess (Join-Path $pgBin 'pg_ctl.exe') @('-D',$data,'-m','fast','-w','stop')) -ne 0) {
      throw "Disposable shutdown failed; inspect $scratch"
    }
  }
  Write-Output "Disposable files retained at $scratch"
}
