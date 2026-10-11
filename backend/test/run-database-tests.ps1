param([switch]$Advisors)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$pgBin = Split-Path (Get-Command psql -ErrorAction Stop).Source
$scratch = Join-Path ([IO.Path]::GetTempPath()) ('talgov-phase1-' + [guid]::NewGuid().ToString('N'))
$pgData = Join-Path $scratch 'data'
New-Item -ItemType Directory -Path $scratch | Out-Null
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$started = $false

function Invoke-SqlFile([string]$database, [string]$relativePath) {
  # Windows PowerShell represents native stderr notices as errors; psql's exit
  # status with ON_ERROR_STOP is the authority for SQL success/failure.
  $ErrorActionPreference = 'Continue'
  & (Join-Path $pgBin 'psql.exe') -X -h 127.0.0.1 -p $port -U postgres -d $database `
    -v ON_ERROR_STOP=1 -1 -f (Join-Path $repo $relativePath) *> (Join-Path $scratch ($database + '-last.log'))
  if ($LASTEXITCODE -ne 0) { throw "SQL failed: $relativePath. Inspect $scratch/$database-last.log" }
}

try {
  & (Join-Path $pgBin 'initdb.exe') -D $pgData -U postgres -A trust --no-locale --encoding=UTF8 --no-sync *> (Join-Path $scratch 'init.log')
  if ($LASTEXITCODE -ne 0) { throw "initdb failed. Inspect $scratch/init.log" }
  & (Join-Path $pgBin 'pg_ctl.exe') -D $pgData -l (Join-Path $scratch 'server.log') -o "-h 127.0.0.1 -p $port" -w start
  if ($LASTEXITCODE -ne 0) { throw 'Local PostgreSQL startup failed.' }
  $started = $true
  foreach ($database in @('phase1_fresh', 'phase1_canonical', 'phase1_v4')) {
    & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p $port -U postgres $database
    if ($LASTEXITCODE -ne 0) { throw 'Could not create disposable database.' }
    Invoke-SqlFile $database 'backend/test/supabase-stubs.sql'
    if ($database -eq 'phase1_fresh') {
      foreach ($migration in (Get-ChildItem (Join-Path $repo 'supabase/migrations') -Filter '*sprint1*.sql' | Sort-Object Name)) {
        Invoke-SqlFile $database ('supabase/migrations/' + $migration.Name)
      }
    } elseif ($database -eq 'phase1_canonical') {
      Invoke-SqlFile $database 'DATABASE/PHASE1_SETUP.sql'
    } else {
      Invoke-SqlFile $database 'supabase/legacy-migrations/20260803000000_v4_enterprise_municipal_core.sql'
      Invoke-SqlFile $database 'supabase/legacy-migrations/20260804000000_v4_production_bootstrap.sql'
      Invoke-SqlFile $database 'supabase/legacy-migrations/20260920075951_phase1_backend_security.sql'
    }
    Invoke-SqlFile $database 'backend/test/database-security.sql'
    Invoke-SqlFile $database 'supabase/legacy-migrations/20260920075951_phase1_backend_security.sql'
    Invoke-SqlFile $database 'backend/test/database-security.sql'
    Write-Output "PASS: $database security assertions and migration reapplication"
    if ($database -ne 'phase1_v4') {
      foreach ($migration in (Get-ChildItem (Join-Path $repo 'supabase/migrations') -Filter '*.sql' | Where-Object Name -NotLike '*sprint1*' | Sort-Object Name)) {
        Invoke-SqlFile $database ('supabase/migrations/' + $migration.Name)
      }
      Invoke-SqlFile $database 'backend/test/content-security.sql'
      Invoke-SqlFile $database 'backend/test/forms-security.sql'
      Invoke-SqlFile $database 'backend/test/admin-reports.sql'
      Get-Content (Join-Path $scratch ($database + '-last.log')) | Select-String 'REPORT BENCHMARK'
      Invoke-SqlFile $database 'backend/test/admin-users.sql'
      Write-Output "PASS: $database Sprint 4 reports, user authorization, audit rollback and deactivation RLS"
      Write-Output "PASS: $database Sprint 3 ownership, transactional outbox and retry assertions"
      Write-Output "PASS: $database Sprint 2 content schema and RLS assertions"
      Invoke-SqlFile $database 'ops/verify-database.sql'
      if ($database -eq 'phase1_fresh') {
        # Rehearse a logical backup/restore using synthetic data in this local cluster.
        # This is not evidence of a hosted Supabase staging restore.
        $archive = Join-Path $scratch 'rehearsal.dump'
        & (Join-Path $pgBin 'pg_dump.exe') -h 127.0.0.1 -p $port -U postgres -d $database -Fc -f $archive
        if ($LASTEXITCODE -ne 0) { throw 'Backup rehearsal dump failed.' }
        & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p $port -U postgres phase7_restored
        if ($LASTEXITCODE -ne 0) { throw 'Restore database creation failed.' }
        & (Join-Path $pgBin 'pg_restore.exe') -h 127.0.0.1 -p $port -U postgres -d phase7_restored --exit-on-error --single-transaction $archive
        if ($LASTEXITCODE -ne 0) { throw 'Backup rehearsal restore failed.' }
        Invoke-SqlFile 'phase7_restored' 'ops/verify-database.sql'
        $manifests = @()
        foreach ($source in @($database, 'phase7_restored')) {
          $manifest = & (Join-Path $pgBin 'psql.exe') -X -q -A -t -h 127.0.0.1 -p $port -U postgres -d $source -v ON_ERROR_STOP=1 -f (Join-Path $repo 'ops/data-manifest.sql')
          if ($LASTEXITCODE -ne 0) { throw 'Data manifest generation failed.' }
          $manifests += ($manifest -join "`n")
        }
        if ($manifests[0] -cne $manifests[1]) { throw 'Restored data does not match backup source.' }
        Invoke-SqlFile 'phase7_restored' 'backend/test/database-security.sql'
        Write-Output 'PASS: Sprint 7 local backup/restore, row counts, data hashes, RLS and schema verification'
      }
    } else {
      # Historical V4 has municipal_services, UUID departments and different enums.
      # It is retained here only for the existing Sprint 1 security regression.
      Write-Output 'INFO: Sprint 2 requires canonical schema; archived V4 needs schema reconciliation first.'
    }
    if ($Advisors) {
      & npx --yes supabase db advisors --db-url "postgresql://postgres@127.0.0.1:$port/${database}?sslmode=disable" --type security --level warn --fail-on warn
      if ($LASTEXITCODE -ne 0) { throw "Security advisors failed for $database" }
    }
  }
} finally {
  if ($started) { & (Join-Path $pgBin 'pg_ctl.exe') -D $pgData -m fast -w stop }
  Write-Output "Disposable PostgreSQL files and logs retained at $scratch"
}

