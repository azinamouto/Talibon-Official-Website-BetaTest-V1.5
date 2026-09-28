# Local disposable cluster only. No remote database URL is accepted.
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$pgBin = Split-Path (Get-Command psql -ErrorAction Stop).Source
$scratch = Join-Path ([IO.Path]::GetTempPath()) ('talgov-launch-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratch | Out-Null
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$started = $false
$clock = [Diagnostics.Stopwatch]::StartNew()
function Invoke-Pg([string]$tool, [string[]]$arguments, [string]$log) {
  $ErrorActionPreference = 'Continue'
  if ($tool -eq 'pg_ctl') {
    # PostgreSQL children must not inherit the PowerShell capture pipe on Windows.
    $quoted = $arguments | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }
    $process = Start-Process -FilePath (Join-Path $pgBin 'pg_ctl.exe') -ArgumentList $quoted `
      -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $scratch $log) `
      -RedirectStandardError (Join-Path $scratch ($log + '.err'))
    $handle = $process.Handle
    if (!$process.WaitForExit(60000)) { throw "pg_ctl timed out; inspect $scratch/$log" }
    $process.Refresh()
    if ($process.ExitCode -ne 0) { throw "pg_ctl failed; inspect $scratch/$log" }
    return
  }
  & (Join-Path $pgBin ($tool + '.exe')) @arguments *> (Join-Path $scratch $log)
  if ($LASTEXITCODE -ne 0) { throw "$tool failed; inspect $scratch/$log" }
}
function Invoke-Sql([string]$database, [string]$file, [string]$log) {
  Invoke-Pg 'psql' @('-X','-q','-A','-t','-h','127.0.0.1','-p',"$port",'-U','postgres','-d',$database,
    '-v','ON_ERROR_STOP=1','-f',(Join-Path $repo $file)) $log
}
try {
  Invoke-Pg 'initdb' @('-D',"$scratch/data",'-U','postgres','-A','trust','--no-locale','--encoding=UTF8','--no-sync') 'init.log'
  Invoke-Pg 'pg_ctl' @('-D',"$scratch/data",'-l',"$scratch/server.log",'-o',"-h 127.0.0.1 -p $port",'-w','start') 'start.log'
  $started = $true
  $connection = @('-h','127.0.0.1','-p',"$port",'-U','postgres')
  Invoke-Pg 'createdb' ($connection + @('launch_source')) 'create.log'
  Invoke-Sql 'launch_source' 'backend/test/supabase-stubs.sql' 'stubs.log'
  foreach ($migration in (Get-ChildItem (Join-Path $repo 'supabase/migrations') -Filter '*.sql' | Sort-Object Name)) {
    Invoke-Sql 'launch_source' ('supabase/migrations/' + $migration.Name) ($migration.BaseName + '.log')
  }
  Invoke-Sql 'launch_source' 'supabase/operations/verify-launch.sql' 'verify-source.log'
  Invoke-Sql 'launch_source' 'supabase/operations/data-snapshot.sql' 'before.txt'
  Invoke-Pg 'pg_dump' ($connection + @('-Fc','-f',"$scratch/before.dump",'launch_source')) 'dump.log'
  # Deliberately change a seeded business value, proving the snapshot detects it.
  Invoke-Pg 'psql' ($connection + @('-X','-v','ON_ERROR_STOP=1','-d','launch_source','-c',
    "UPDATE public.roles SET description='rollback-rehearsal-change';")) 'mutate.log'
  Invoke-Sql 'launch_source' 'supabase/operations/data-snapshot.sql' 'changed.txt'
  if ((Get-FileHash "$scratch/before.txt").Hash -eq (Get-FileHash "$scratch/changed.txt").Hash) {
    throw 'Mutation was not detected by data snapshot'
  }
  Invoke-Pg 'createdb' ($connection + @('launch_restored')) 'create-restored.log'
  Invoke-Pg 'pg_restore' ($connection + @('--exit-on-error','--single-transaction','-d','launch_restored',"$scratch/before.dump")) 'restore.log'
  Invoke-Sql 'launch_restored' 'supabase/operations/verify-launch.sql' 'verify-restored.log'
  Invoke-Sql 'launch_restored' 'supabase/operations/data-snapshot.sql' 'restored.txt'
  if ((Get-FileHash "$scratch/before.txt").Hash -ne (Get-FileHash "$scratch/restored.txt").Hash) {
    throw 'Restored data differs from the backup snapshot'
  }
  # Ensure launch verification fails closed if RLS is accidentally disabled.
  Invoke-Pg 'psql' ($connection + @('-X','-v','ON_ERROR_STOP=1','-d','launch_restored','-c',
    'ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;')) 'disable-rls.log'
  $rejected = $false
  try { Invoke-Sql 'launch_restored' 'supabase/operations/verify-launch.sql' 'negative-verify.log' }
  catch { $rejected = $true }
  if (!$rejected) { throw 'Launch verification accepted a table without RLS' }
  Write-Output "PASS: fresh migration chain, backup, mutation detection, restore equality, and missing-RLS rejection ($([math]::Round($clock.Elapsed.TotalSeconds, 1))s)."
  Write-Output 'LOCAL ONLY: Supabase Auth/Storage are stubbed. Hosted staging rehearsal remains required.'
} finally {
  if ($started) { Invoke-Pg 'pg_ctl' @('-D',"$scratch/data",'-m','fast','-w','stop') 'stop.log' }
  Write-Output "Evidence retained at $scratch"
}
