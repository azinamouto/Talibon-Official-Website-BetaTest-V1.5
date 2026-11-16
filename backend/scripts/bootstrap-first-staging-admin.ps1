param(
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$DisplayName,
  [switch]$AuthorizeFirstStagingAdmin,
  [switch]$ConfirmEmailOwnership
)
$ErrorActionPreference = 'Stop'
if (-not $AuthorizeFirstStagingAdmin -or -not $ConfirmEmailOwnership -or
    [Console]::IsInputRedirected -or $null -ne $env:VERCEL -or $null -ne $env:CI -or
    $null -ne $env:NODE_OPTIONS -or $null -ne $env:NODE_EXTRA_CA_CERTS -or $null -ne $env:NODE_TLS_REJECT_UNAUTHORIZED -or
    (Get-ChildItem Env: | Where-Object { $_.Name -match '^(PG|R2_AUTH_HOSTED|R2_STAGING_TEST)' })) {
  throw 'An explicitly authorized local console and confirmed mailbox ownership are required.'
}
$cli = Join-Path $PSScriptRoot 'bootstrap-first-staging-admin.cjs'
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot '../dist/authentication/first-admin-bootstrap.js'))) {
  throw 'Run npm run build:tsc in backend before provisioning.'
}
function Read-PrivateValue([string]$Prompt) {
  $secureValue = Read-Host -Prompt $Prompt -AsSecureString
  $pointer = [IntPtr]::Zero
  try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    $secureValue.Dispose()
  }
}
function Write-PrivateInput {
  param([IO.Stream]$Stream,[string]$Value)
  $bytes = (New-Object Text.UTF8Encoding($false)).GetBytes($Value)
  try {
    # Windows PowerShell 5.1 lacks ProcessStartInfo.StandardInputEncoding.
    # Write UTF-8 bytes directly so Unicode passwords are preserved without a BOM.
    $Stream.Write($bytes,0,$bytes.Length); $Stream.Flush(); $Stream.Close()
  } finally { [Array]::Clear($bytes,0,$bytes.Length) }
}
function Get-BootstrapReceipt {
  param([string]$Stdout,[string]$Stderr,[int]$ExitCode)
  $lines = @(((@($Stdout,$Stderr) -join "`n") -split "`r?`n") | Where-Object { $_.Trim() })
  if ($lines.Count -ne 1) { throw 'Missing or unrecognized bootstrap output suppressed.' }
  try { $result = $lines[0] | ConvertFrom-Json } catch { throw 'Unrecognized bootstrap output suppressed.' }
  if ($ExitCode -eq 0 -and $result.event -eq 'first_admin_bootstrap_completed' -and $result.success -eq $true -and
      $result.role -eq 'admin' -and $result.mfaEnrollmentRequired -eq $true) {
    return 'Website admin provisioned. Bootstrap consumed. MFA enrollment is required.'
  }
  if ($result.event -eq 'first_admin_bootstrap_failed' -and
      $result.code -in @('authorization_required','invalid_input','wrong_identity','already_initialized','provider_rejected','failed_or_unconfirmed')) {
    throw ('Bootstrap stopped: ' + $result.code + '. Do not retry automatically; obtain a bounded read-only state check.')
  }
  throw 'Bootstrap failed or commit is unconfirmed. Do not retry automatically; obtain a bounded read-only state check.'
}
$payload = $null; $json = $null; $confirm = $null; $process = $null
try {
  # Secrets never appear in arguments, environment variables, files or console output.
  $payload = @{
    email = $Email; displayName = $DisplayName
    databaseUrl = Read-PrivateValue 'Existing staging migrator DIRECT URL (verify-full; channel_binding=require)'
    neonApiKey = Read-PrivateValue 'Existing Neon API key for read-only staging metadata verification'
    password = Read-PrivateValue 'New website admin password (14-128 characters)'
  }
  $confirm = Read-PrivateValue 'Confirm new website admin password'
  if ($payload.password.Length -lt 14 -or $payload.password.Length -gt 128 -or
      -not [String]::Equals($payload.password,$confirm,[StringComparison]::Ordinal)) {
    throw 'Password policy or confirmation failed; nothing was provisioned.'
  }
  $confirm = $null
  $info = New-Object Diagnostics.ProcessStartInfo
  $info.FileName = (Get-Command node -ErrorAction Stop).Source
  $info.Arguments = '--no-experimental-require-module "' + $cli + '" --authorize-first-staging-admin --confirm-email-ownership'
  $info.WorkingDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
  $info.UseShellExecute = $false; $info.CreateNoWindow = $true
  $info.RedirectStandardInput = $true; $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
  $info.EnvironmentVariables.Clear()
  foreach ($key in @('SystemRoot','WINDIR','PATH','TEMP','TMP')) {
    $value = [Environment]::GetEnvironmentVariable($key)
    if ($null -ne $value) { $info.EnvironmentVariables[$key] = $value }
  }
  $json = $payload | ConvertTo-Json -Compress
  $process = [Diagnostics.Process]::Start($info)
  $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
  Write-PrivateInput $process.StandardInput.BaseStream $json
  $json = $null; $payload.Clear()
  $process.WaitForExit()
  # Require one bounded receipt AND a successful exit before reporting provisioning.
  Write-Output (Get-BootstrapReceipt $stdout.Result $stderr.Result $process.ExitCode)
} finally {
  $confirm = $null; $json = $null
  if ($null -ne $payload) { $payload.Clear() }
  if ($null -ne $process) { $process.Dispose() }
}
