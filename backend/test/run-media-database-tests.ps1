$ErrorActionPreference = 'Stop'
$pgBin = Split-Path (Get-Command psql -ErrorAction Stop).Source
$scratch = Join-Path ([IO.Path]::GetTempPath()) ('talgov-media-' + [guid]::NewGuid().ToString('N'))
$data = Join-Path $scratch 'data'
New-Item -ItemType Directory -Path $scratch | Out-Null
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
$listener.Start(); $port=$listener.LocalEndpoint.Port; $listener.Stop()
$started=$false
$saved=$env:R2_AUTH_TEST_URL
try {
  & (Join-Path $pgBin 'initdb.exe') -D $data -U postgres -A trust --no-locale --encoding=UTF8 --no-sync *> (Join-Path $scratch 'init.log')
  if ($LASTEXITCODE -ne 0) {throw 'Disposable initdb failed'}
  & (Join-Path $pgBin 'pg_ctl.exe') -D $data -l (Join-Path $scratch 'server.log') -o "-h 127.0.0.1 -p $port" -w start
  if ($LASTEXITCODE -ne 0) {throw 'Disposable PostgreSQL startup failed'}
  $started=$true
  & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p $port -U postgres r2_auth_test
  if ($LASTEXITCODE -ne 0) {throw 'Disposable database creation failed'}
  $env:R2_AUTH_TEST_URL="postgresql://postgres@127.0.0.1:$port/r2_auth_test"
  & node --test --test-timeout=240000 (Join-Path $PSScriptRoot 'media.integration.cjs')
  if ($LASTEXITCODE -ne 0) {throw 'Staff authentication integration failed'}
} finally {
  if ($started) {
    & (Join-Path $pgBin 'pg_ctl.exe') -D $data -m fast -w stop
    if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL shutdown failed; scratch files retained.' }
  }
  $env:R2_AUTH_TEST_URL=$saved
  if (-not ([IO.Path]::GetFullPath($scratch).StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()))) -or (Split-Path $scratch -Leaf) -notlike 'talgov-media-*') { throw 'Unsafe cleanup path' }; Remove-Item -LiteralPath $scratch -Recurse -Force
  Write-Output 'Disposable authentication database stopped and its synthetic files removed.'
}
