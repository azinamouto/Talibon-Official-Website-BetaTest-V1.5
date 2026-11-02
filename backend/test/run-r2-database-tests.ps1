$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$pgBin = Split-Path (Get-Command psql -ErrorAction Stop).Source
$scratch = Join-Path ([IO.Path]::GetTempPath()) ('talgov-r2-' + [guid]::NewGuid().ToString('N'))
$data = Join-Path $scratch 'data'
New-Item -ItemType Directory -Path $scratch | Out-Null
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
$listener.Start(); $port=$listener.LocalEndpoint.Port; $listener.Stop()
$started=$false
$savedUrl=$env:R2_TEST_DATABASE_URL
$savedScratch=$env:R2_TEST_SCRATCH
try {
  & (Join-Path $pgBin 'initdb.exe') -D $data -U postgres -A trust --no-locale --encoding=UTF8 --no-sync *> (Join-Path $scratch 'init.log')
  if ($LASTEXITCODE -ne 0) {throw 'Disposable initdb failed'}
  & (Join-Path $pgBin 'pg_ctl.exe') -D $data -l (Join-Path $scratch 'server.log') -o "-h 127.0.0.1 -p $port" -w start
  if ($LASTEXITCODE -ne 0) {throw 'Disposable PostgreSQL startup failed'}
  $started=$true
  foreach ($name in @('r2_test','r2_source','r2_upgrade','r2_restore')) {
    & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p $port -U postgres $name
    if ($LASTEXITCODE -ne 0) {throw 'Disposable database creation failed'}
  }
  $env:R2_TEST_DATABASE_URL="postgresql://postgres@127.0.0.1:$port/r2_test"
  $env:R2_TEST_SCRATCH=$scratch
  & node --test --test-timeout=60000 (Join-Path $PSScriptRoot 'r2-database.integration.cjs')
  if ($LASTEXITCODE -ne 0) {throw 'R2 database integration tests failed'}
  $archive=Join-Path $scratch 'r2.dump'
  & (Join-Path $pgBin 'pg_dump.exe') -h 127.0.0.1 -p $port -U postgres -d r2_test -Fc -f $archive
  if ($LASTEXITCODE -ne 0) {throw 'R2 backup failed'}
  & (Join-Path $pgBin 'pg_restore.exe') -h 127.0.0.1 -p $port -U postgres -d r2_restore --exit-on-error --single-transaction $archive
  if ($LASTEXITCODE -ne 0) {throw 'R2 restore failed'}
  & node (Join-Path $PSScriptRoot 'r2-restore-check.cjs')
  if ($LASTEXITCODE -ne 0) {throw 'R2 restore reconciliation failed'}
} finally {
  if ($started) { & (Join-Path $pgBin 'pg_ctl.exe') -D $data -m fast -w stop }
  $env:R2_TEST_DATABASE_URL=$savedUrl; $env:R2_TEST_SCRATCH=$savedScratch
  Write-Output "Disposable files retained at $scratch"
}
