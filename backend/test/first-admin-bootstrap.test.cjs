const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const powershell = process.platform === 'win32' ? 'powershell' : 'pwsh';
const b = require('../dist/authentication/first-admin-bootstrap');
const cli = require('../scripts/bootstrap-first-staging-admin.cjs');
const target = require('../scripts/staging/target.json');
const args = ['--authorize-first-staging-admin','--confirm-email-ownership'];
const input = () => ({ authorization:b.FIRST_ADMIN_AUTHORIZATION,emailOwnershipConfirmed:true,
  email:'synthetic-admin@example.invalid',displayName:'Synthetic administrator',password:randomBytes(24).toString('base64url') });
function fixture({ fail, rollbackFails=false, state={}, identity={}, rejectUser=false, rejectCredential=false, commitTag='COMMIT', transport=false }={}) {
  const original = new Error('synthetic failure with private diagnostics');
  const queries=[],released=[],providerWrites=[];
  const client = new EventEmitter();
  client.query = async (sql, values) => {
    queries.push([sql,values]);
    if (sql==='ROLLBACK' && rollbackFails) throw new Error('secondary failure');
    if (fail && sql.includes(fail)) throw original;
    if (sql.startsWith('SELECT current_database')) return { rows:[{database:'neondb',role:'talgov_staging_migrator',session_role:'talgov_staging_migrator',...identity}] };
    if (sql.includes('AS admin_exists')) return {rows:[{admin_exists:false,consumed:false,email_exists:false,...state}]};
    if (sql.includes('INSERT INTO app.staff_accounts')) return { rows:[{id:'synthetic-staff-id'}] };
    if (transport && sql.includes('INSERT INTO app.audit_events')) client.emit('error',original);
    return { rows:[],command:sql==='COMMIT' ? commitTag : undefined };
  };
  client.release = discard => released.push(discard);
  const pool = { connect:async()=>client };
  const provide = async pinned => {
    assert.equal(pinned,client);
    return { password:{config:{minPasswordLength:14,maxPasswordLength:128},hash:async password=>{assert.ok(password.length>=14);return 'synthetic-provider-hash';}},
      internalAdapter:{createUser:async data=>{providerWrites.push(['user',data]);return rejectUser ? null : data;},
        createAccount:async data=>{providerWrites.push(['credential',data]);return rejectCredential ? null : data;}} };
  };
  return { pool,client,provide,original,queries,released,providerWrites };
}
const execute = (f, account=input()) => b.bootstrapFirstAdmin(f.pool,account,undefined,f.provide);

test('explicit authorization and email ownership are required before connection',async()=>{
  for(const patch of [{authorization:''},{authorization:'CREATE_FIRST_ADMIN:other'},{emailOwnershipConfirmed:false},{emailOwnershipConfirmed:'true'}]) {
    await assert.rejects(b.bootstrapFirstAdmin({connect:()=>assert.fail('connected')},{...input(),...patch}),e=>e.code==='authorization_required');
  }
});
test('bounded identity/password inputs reject malformed values',()=>{
  for(const patch of [{email:'bad'},{email:' user@example.invalid'},{email:'u\n@example.invalid'},
    {displayName:''},{displayName:'x\n'},{displayName:'x'.repeat(101)},{password:'short'},
    {password:'x'.repeat(129)},{password:'x'.repeat(14)+'\u0000'}]) {
    assert.throws(()=>b.validateFirstAdminInput({...input(),...patch}),e=>e.code==='invalid_input');
  }
});
test('operator CLI rejects missing/repeated/extra flags, hosted execution and inherited overrides',()=>{
  assert.doesNotThrow(()=>cli.authorize(args,{}));
  for(const bad of [[],[args[0]],[args[0],args[0]],[...args,'--test'],['--apply',args[1]]]) assert.throws(()=>cli.authorize(bad,{}));
  for(const key of ['VERCEL','CI','NODE_OPTIONS','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED','PGHOST','PGOPTIONS','R2_AUTH_HOSTED','R2_STAGING_TEST_FIXTURE']) {
    assert.throws(()=>cli.authorize(args,{[key]:''}));
  }
});
test('operator connection requires the frozen direct staging endpoint, migrator and strict TLS/binding',()=>{
  const url=`postgresql://${target.migrationLogin}:synthetic@${target.host}/neondb?sslmode=verify-full&channel_binding=require`;
  const config=cli.config(url); assert.equal(config.max,1);assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(typeof config.onConnect,'function');
  for(const bad of [url.replace(target.host,'example.invalid'),url.replace(target.host,target.host.replace('.','-pooler.')),
    url.replace('/neondb','/other'),url.replace(target.migrationLogin,'talgov_staging_runtime'),url.replace('verify-full','require'),
    url.replace('&channel_binding=require',''),url+'&options=unsafe',url+'&sslmode=verify-full',url+'#fragment']) assert.throws(()=>cli.config(bad));
});
test('private stdin is bounded, rejects arbitrary fields and never consumes secrets as command arguments',async()=>{
  const fields={email:'synthetic@example.invalid',displayName:'Synthetic',password:randomBytes(24).toString('base64url'),databaseUrl:'synthetic',neonApiKey:'synthetic'};
  assert.deepEqual(await cli.readInput(Readable.from([JSON.stringify(fields)])),fields);
  for(const value of [{...fields,extra:'x'},{...fields,password:1},{...fields,neonApiKey:''},[]]) await assert.rejects(cli.readInput(Readable.from([JSON.stringify(value)])));
  await assert.rejects(cli.readInput(Readable.from([Buffer.alloc(16385,65)])));
});
test('metadata failure occurs before database acquisition and scrubs input',async()=>{
  const saved=global.fetch;
  let requests=0;
  global.fetch=async (url,options)=>{requests++;assert.match(url,/^https:\/\/console\.neon\.tech\/api\/v2\/projects\/misty-silence-69777617/);assert.equal(options.redirect,'error');return {ok:false};};
  const privateInput={email:'synthetic@example.invalid',displayName:'Synthetic',password:randomBytes(24).toString('base64url'),
    databaseUrl:`postgresql://${target.migrationLogin}:synthetic@${target.host}/neondb?sslmode=verify-full&channel_binding=require`,neonApiKey:'synthetic'};
  try { await assert.rejects(cli.run(args,{},privateInput)); } finally {global.fetch=saved;}
  assert.equal(requests,1);assert.equal(privateInput.password,'');assert.equal(privateInput.databaseUrl,'');assert.equal(privateInput.neonApiKey,'');
});
for(const state of [{admin_exists:true},{consumed:true},{email_exists:true},{consumed:undefined}]) {
  test(`existing administrator, consumption marker or email rejects before provider writes: ${Object.keys(state)[0]}`,async()=>{
    const f=fixture({state});await assert.rejects(execute(f),e=>e.code==='already_initialized');
    assert.equal(f.providerWrites.length,0);assert.equal(f.queries.at(-1)[0],'ROLLBACK');assert.deepEqual(f.released,[false]);
  });
}
test('database, effective and session roles must each match',async()=>{
  for(const identity of [{database:'official'},{role:'neondb_owner'},{session_role:'neondb_owner'}]) {
    const f=fixture({identity});await assert.rejects(execute(f),e=>e.code==='wrong_identity');assert.equal(f.providerWrites.length,0);
  }
});
test('provider user, credential, active admin mapping and audit commit once; no MFA/session is pregranted',async()=>{
  const f=fixture(), account=input(); const result=await execute(f,account);
  assert.deepEqual(result,{success:true,role:'admin',mfaEnrollmentRequired:true});assert.equal(account.password,'');
  const user=f.providerWrites[0][1],credential=f.providerWrites[1][1];
  assert.equal(user.emailVerified,true);assert.equal(user.twoFactorEnabled,false);assert.equal(credential.providerId,'credential');
  assert.equal(credential.accountId,user.id);assert.equal(credential.userId,user.id);assert.equal(credential.password,'synthetic-provider-hash');
  assert.ok(f.queries.some(([sql])=>sql.includes("'admin',true")));
  assert.ok(f.queries.some(([sql,values])=>sql.includes('INSERT INTO app.staff_auth_audit')&&values[0]===b.FIRST_ADMIN_MARKER));
  assert.ok(f.queries.findIndex(([sql])=>sql.includes('LOCK TABLE'))<f.queries.findIndex(([sql])=>sql.includes('AS admin_exists')));
  assert.equal(f.queries.filter(([sql])=>sql==='COMMIT').length,1);assert.deepEqual(f.released,[false]);
  assert.equal(f.queries.some(([sql])=>/INSERT.*(session|two_factor|assurance)/i.test(sql)),false);
});
for(const fail of ['BEGIN','INSERT INTO app.staff_accounts','INSERT INTO app.staff_auth_audit','INSERT INTO app.audit_events','COMMIT']) {
  test(`preserves ${fail} exception and discards after failed rollback`,async()=>{
    const f=fixture({fail,rollbackFails:true});await assert.rejects(execute(f),e=>e===f.original);
    assert.equal(f.queries.at(-1)[0],'ROLLBACK');assert.deepEqual(f.released,[true]);assert.equal(f.client.listenerCount('error'),0);
  });
}
test('confirmed rollback permits reuse; ambiguous commit does not',async()=>{
  for(const [fail,discard] of [['INSERT INTO app.staff_auth_audit',false],['COMMIT',true]]) {
    const f=fixture({fail});await assert.rejects(execute(f),e=>e===f.original);assert.deepEqual(f.released,[discard]);
  }
});
test('provider refusal, transport failure and aborted commit are never reported as success',async()=>{
  for(const options of [{rejectUser:true},{rejectCredential:true},{transport:true},{commitTag:'ROLLBACK'}]) {
    const f=fixture(options);await assert.rejects(execute(f));
    if(options.transport||options.commitTag) assert.deepEqual(f.released,[true]);
  }
});
test('diagnostics cannot disclose arbitrary messages, codes, tokens or credentials',()=>{
  const arbitrary=Object.assign(new Error('synthetic private payload'),{code:'arbitrary private payload'});
  assert.deepEqual(cli.diagnostic(arbitrary),{event:'first_admin_bootstrap_failed',code:'failed_or_unconfirmed'});
  assert.equal(cli.diagnostic(new b.BootstrapError('already_initialized')).code,'already_initialized');
});
test('PowerShell launcher parses and refuses execution without authorization before prompting',()=>{
  const file=path.resolve(__dirname,'../scripts/bootstrap-first-staging-admin.ps1');
  const parsed=spawnSync(powershell,['-NoProfile','-Command',`$tokens=$null; $errors=$null; [System.Management.Automation.Language.Parser]::ParseFile('${file.replaceAll("'","''")}',[ref]$tokens,[ref]$errors) | Out-Null; if ($errors.Count) { $errors | ForEach-Object Message; exit 1 }`],{encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr||parsed.stdout);
  const stopped=spawnSync(powershell,['-NoProfile','-File',file,'-Email','synthetic@example.invalid','-DisplayName','Synthetic'],{encoding:'utf8',timeout:10000});
  assert.notEqual(stopped.status,0);assert.match(stopped.stderr,/explicitly authorized local console/);
});
test('Windows PowerShell private transport preserves UTF-8 and accepts only confirmed bounded receipts',()=>{
  const file=path.resolve(__dirname,'../scripts/bootstrap-first-staging-admin.ps1').replaceAll("'","''");
  const script=`
    $ErrorActionPreference='Stop'
    $tokens=$null; $errors=$null
    $ast=[System.Management.Automation.Language.Parser]::ParseFile('${file}',[ref]$tokens,[ref]$errors)
    $functions=$ast.FindAll({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst]},$true)
    $write=($functions | Where-Object Name -eq 'Write-PrivateInput').Body.GetScriptBlock()
    $receipt=($functions | Where-Object Name -eq 'Get-BootstrapReceipt').Body.GetScriptBlock()
    $value=[string][char]0x00e9 + [string][char]0x4e2d + [string][char]0x2603
    $utf8=(New-Object Text.UTF8Encoding($false)).GetBytes($value)
    $stream=New-Object IO.MemoryStream
    & $write $stream $value
    $actual=$stream.ToArray()
    if ([Convert]::ToBase64String($actual) -ne [Convert]::ToBase64String($utf8)) { throw 'UTF-8 transport mismatch' }
    $success='{"event":"first_admin_bootstrap_completed","success":true,"role":"admin","mfaEnrollmentRequired":true}'
    if ((& $receipt $success '' 0) -ne 'Website admin provisioned. Bootstrap consumed. MFA enrollment is required.') { throw 'Receipt mismatch' }
    foreach ($case in @(@('','',0),@($success,'',1),@($success,$success,0),@('arbitrary-private-text','',0),@('{"event":"first_admin_bootstrap_failed","code":"arbitrary-private-text"}','',1))) {
      $rejected=$false
      try { & $receipt $case[0] $case[1] $case[2] | Out-Null } catch { $rejected=$true; if ($_.Exception.Message.Contains('arbitrary-private-text')) { throw 'Diagnostic disclosure' } }
      if (-not $rejected) { throw 'Unsafe receipt accepted' }
    }
  `;
  const result=spawnSync(powershell,['-NoProfile','-Command',script],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout);
});
