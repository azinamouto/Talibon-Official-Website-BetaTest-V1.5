const {test}=require('node:test');
const assert=require('node:assert/strict');
const {staffOriginConfiguration,isStaffMutationOrigin}=require('../dist/config/staff-origin');
const {validateEnvironment}=require('../dist/config/environment');
const {providerOptions}=require('../dist/authentication/better-auth.adapter');
const {isAllowedOrigin}=require('../dist/configure-app');
const {mediaMutation}=require('../dist/api/media/media.controller');
const canonical='https://talgov-r2-staging.vercel.app';
const hostname='talgov-r2-staging-synthetic1-rynzz22s-projects.vercel.app';
const origin=`https://${hostname}`;
const staging={NODE_ENV:'production',STAFF_AUTH_ORIGIN:canonical,ALLOWED_ORIGINS:canonical,
  STAFF_AUTH_DEPLOYMENT_ORIGIN_ENABLED:'true',VERCEL:'1',VERCEL_PROJECT_ID:'prj_bi8GqnCkvRLBz850HiJKU5RRhXq8',
  VERCEL_ENV:'production',VERCEL_TARGET_ENV:'production',VERCEL_URL:hostname};

async function withEnv(values,work) {
  const keys=[...new Set([...Object.keys(staging),'STAFF_AUTH_DATABASE_URL','STAFF_AUTH_SECRET','STAFF_PASSWORD_RECOVERY_ENABLED',...Object.keys(values)])];
  const before=new Map(keys.map(k=>[k,process.env[k]]));
  try { for(const key of keys)delete process.env[key];Object.assign(process.env,values);return await work(); }
  finally { for(const [key,value]of before)if(value===undefined)delete process.env[key];else process.env[key]=value; }
}

test('staging resolves one immutable exact HTTPS trusted origin',()=>{
  const config=staffOriginConfiguration(staging);
  assert.equal(config.origin,origin);assert.deepEqual(config.trustedOrigins,[origin]);
  assert.ok(Object.isFrozen(config));assert.ok(Object.isFrozen(config.trustedOrigins));
  assert.ok(isStaffMutationOrigin(origin,staging));
  for(const value of [canonical,undefined,'null','https://evil.invalid',origin+'/',origin+':443',origin.replace('synthetic1','synthetic2')]) {
    assert.equal(isStaffMutationOrigin(value,staging),false);
  }
});
test('default and disabled modes preserve the fixed production origin',async()=>{
  for(const flag of [undefined,'false']) {
    const env={NODE_ENV:'production',STAFF_AUTH_ORIGIN:'https://talibon.gov.ph',ALLOWED_ORIGINS:'https://talibon.gov.ph',VERCEL_URL:hostname};
    if(flag!==undefined)env.STAFF_AUTH_DEPLOYMENT_ORIGIN_ENABLED=flag;
    assert.deepEqual(staffOriginConfiguration(env).trustedOrigins,['https://talibon.gov.ph']);
    assert.equal(isStaffMutationOrigin(origin,env),false);
    await withEnv(env,()=>{
      assert.ok(isAllowedOrigin('https://talibon.gov.ph'));
      assert.equal(isAllowedOrigin(origin),false);assert.equal(isAllowedOrigin('http://localhost:5173'),false);
    });
  }
});
test('non-Vercel development origins retain existing behavior',async()=>{
  await withEnv({NODE_ENV:'development',STAFF_AUTH_ORIGIN:'http://127.0.0.1:5173'},()=>{
    assert.ok(isAllowedOrigin('http://localhost:5173'));assert.ok(isAllowedOrigin(undefined));
    assert.ok(isStaffMutationOrigin('http://127.0.0.1:5173',process.env));
  });
});
test('malformed opt-in flags fail closed without logging their values',()=>{
  for(const flag of [true,false,'True','1','',' true ','synthetic-private-value']) {
    const env={...staging,STAFF_AUTH_DEPLOYMENT_ORIGIN_ENABLED:flag};
    assert.throws(()=>staffOriginConfiguration(env),{message:'Invalid environment variable: STAFF_AUTH_DEPLOYMENT_ORIGIN_ENABLED'});
    assert.equal(isStaffMutationOrigin(origin,env),false);
  }
});
test('missing, preview, foreign-project and non-production platform contexts fail closed',async()=>{
  for(const [key,bad]of Object.entries({NODE_ENV:'development',VERCEL:'0',VERCEL_PROJECT_ID:'prj_other',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview'})) {
    for(const value of [undefined,bad]) {
      const env={...staging};if(value===undefined)delete env[key];else env[key]=value;
      assert.throws(()=>staffOriginConfiguration(env),new RegExp(key));
      assert.equal(isStaffMutationOrigin(origin,env),false);
      await withEnv(env,()=>{assert.equal(isAllowedOrigin(origin),false);assert.equal(isAllowedOrigin(undefined),false);});
    }
  }
});
test('untrusted or malformed deployment hostnames cannot expand the allowlist',()=>{
  for(const value of [undefined,'',canonical,`https://${hostname}`,`${hostname}:443`,`${hostname}/`,`${hostname}?x=1`,`${hostname}#x`,
    `user@${hostname}`,`${hostname}.evil.invalid`,`*.vercel.app`,'talgov-r2-other-synthetic1-rynzz22s-projects.vercel.app',
    'talgov-r2-staging-synthetic1-otherteam.vercel.app',hostname.toUpperCase(),` ${hostname}`,`${hostname}\n`,
    hostname.replace('synthetic1','a'.repeat(28))]) {
    const env={...staging,VERCEL_URL:value};
    assert.throws(()=>staffOriginConfiguration(env),{message:'Invalid staging origin configuration: VERCEL_URL'});
    assert.equal(isStaffMutationOrigin(origin,env),false);
  }
});
test('production environment validation resolves only staging and preserves original configured-origin restrictions',()=>{
  const env={...staging,DATABASE_URL:'postgresql://synthetic@localhost/test',STAFF_AUTH_DATABASE_URL:'postgresql://synthetic@localhost/test',
    MEDIA_DATABASE_URL:'postgresql://synthetic@localhost/test',STAFF_AUTH_SECRET:'s'.repeat(48),MEDIA_BUCKET:'synthetic',
    AWS_ENDPOINT_URL_S3:'https://br-synthetic.storage.c-1.ap-southeast-1.aws.neon.tech',AWS_REGION:'ap-southeast-1',AWS_ACCESS_KEY_ID:'synthetic',AWS_SECRET_ACCESS_KEY:'synthetic'};
  const validated=validateEnvironment(env);
  assert.equal(validated.STAFF_AUTH_ORIGIN,origin);assert.equal(validated.ALLOWED_ORIGINS,origin);
  assert.equal(env.STAFF_AUTH_ORIGIN,canonical);
  assert.throws(()=>validateEnvironment({...env,ALLOWED_ORIGINS:'https://evil.invalid'}));
  assert.throws(()=>validateEnvironment({...env,STAFF_AUTH_ORIGIN:'http://staff.invalid'}));
  assert.throws(()=>validateEnvironment({...env,VERCEL_PROJECT_ID:'prj_other'}));
  const disabled=validateEnvironment({...env,STAFF_AUTH_DEPLOYMENT_ORIGIN_ENABLED:'false'});
  assert.equal(disabled.STAFF_AUTH_ORIGIN,canonical);assert.equal(disabled.ALLOWED_ORIGINS,canonical);
});
test('CORS and CMS reject header-based trust, stale origins and non-JSON mutations',async()=>{
  await withEnv(staging,()=>{
    assert.ok(isAllowedOrigin(origin));assert.ok(isAllowedOrigin(undefined));
    for(const bad of [canonical,'https://evil.invalid',undefined,'null',origin.replace('synthetic1','synthetic2')]) {
      if(bad!==undefined)assert.equal(isAllowedOrigin(bad),false);
      assert.throws(()=>mediaMutation({headers:{origin:bad,host:hostname,'x-forwarded-host':hostname,forwarded:`host=${hostname};proto=https`},is:()=>true}),/Same-origin JSON required/);
    }
    mediaMutation({headers:{origin,host:'evil.invalid','x-forwarded-host':'evil.invalid'},is:()=>true});
    assert.throws(()=>mediaMutation({headers:{origin},is:()=>false}),/Same-origin JSON required/);
  });
});
test('runtime and Better Auth share the exact staging allowlist and retain cookie/session/MFA policy',async()=>{
  await withEnv({...staging,STAFF_AUTH_DATABASE_URL:'postgresql://synthetic@127.0.0.1:1/synthetic',STAFF_AUTH_SECRET:'s'.repeat(48),STAFF_PASSWORD_RECOVERY_ENABLED:'false'},async()=>{
    const modulePath=require.resolve('../dist/authentication/runtime');delete require.cache[modulePath];
    const {staffAuthentication}=require(modulePath);const adapter=staffAuthentication();
    try {
      const options=await providerOptions(adapter.pool,adapter.options);
      assert.equal(options.baseURL,origin);assert.deepEqual(options.trustedOrigins,[origin]);
      assert.equal(options.advanced.useSecureCookies,true);
      assert.deepEqual(options.advanced.defaultCookieAttributes,{httpOnly:true,sameSite:'strict',path:'/'});
      assert.equal(options.advanced.crossSubDomainCookies,undefined);
      assert.equal(options.session.expiresIn,28800);assert.equal(options.session.disableSessionRefresh,true);
      assert.equal(options.session.cookieCache.enabled,false);assert.equal(options.emailAndPassword.disableSignUp,true);
      assert.equal(options.emailAndPassword.sendResetPassword,undefined);assert.equal(options.plugins[0].id,'two-factor');
      let databaseCalls=0,providerCalls=0;const queries=[];
      adapter.pool.query=async sql=>{databaseCalls++;queries.push(sql);return{rows:[{attempts:1}]};};
      adapter.authPromise=Promise.resolve({handler:async request=>{providerCalls++;assert.equal(new URL(request.url).origin,origin);assert.equal(request.headers.get('origin'),origin);return new Response('{"success":true}');}});
      const res=()=>({setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;}});
      for(const bad of [canonical,'https://evil.invalid',undefined,'null',origin.replace('synthetic1','synthetic2')]) {
        const response=res();await adapter.handle({path:'/api/staff-auth/sign-in/email',method:'POST',headers:{origin:bad,host:hostname,'x-forwarded-host':hostname},body:{},is:()=>true},response,()=>assert.fail('unexpected next'));
        assert.equal(response.statusCode,403);
      }
      assert.equal(databaseCalls,0);assert.equal(providerCalls,0);
      const missingIp=res();await adapter.handle({path:'/api/staff-auth/sign-in/email',method:'POST',headers:{origin},ip:'127.0.0.1',body:{},is:()=>true},missingIp,()=>assert.fail('unexpected next'));
      assert.equal(missingIp.statusCode,503);assert.equal(providerCalls,0);
      // Existing stale-throttle cleanup precedes IP validation; no auth/attempt write follows denial.
      assert.equal(databaseCalls,1);assert.ok(queries[0].startsWith('DELETE FROM app.staff_auth_throttle'));
      const response=res();await adapter.handle({path:'/api/staff-auth/sign-in/email',method:'POST',headers:{origin,host:'evil.invalid','x-forwarded-host':'evil.invalid','x-forwarded-for':'127.0.0.1'},body:{},is:()=>true},response,()=>assert.fail('unexpected next'));
      assert.deepEqual(response.body,{success:true,mfaRequired:false});assert.equal(providerCalls,1);
    } finally {await adapter.close();delete require.cache[modulePath];}
  });
});
