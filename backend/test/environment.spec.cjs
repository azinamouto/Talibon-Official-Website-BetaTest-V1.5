const { validateEnvironment } = require('../dist/config/environment');
test('development and test startup do not need retired credentials',()=>expect(validateEnvironment({NODE_ENV:'test'}).PORT).toBe(3000));
test('production requires Neon and staff configuration',()=>expect(()=>validateEnvironment({NODE_ENV:'production'})).toThrow('DATABASE_URL'));
test('rejects public secret names and invalid ports',()=> { expect(()=>validateEnvironment({VITE_PRIVATE_KEY:'hidden'})).toThrow(); expect(()=>validateEnvironment({PORT:0})).toThrow(); });
test('email recovery defaults disabled and mail is required only for explicit enablement',()=>{
  const env={NODE_ENV:'production',DATABASE_URL:'postgresql://synthetic@localhost/test',
    STAFF_AUTH_DATABASE_URL:'postgresql://synthetic@localhost/test',MEDIA_DATABASE_URL:'postgresql://synthetic@localhost/test',
    STAFF_AUTH_SECRET:'x'.repeat(48),STAFF_AUTH_ORIGIN:'https://staging.example.invalid',ALLOWED_ORIGINS:'https://staging.example.invalid',
    MEDIA_BUCKET:'synthetic',AWS_ENDPOINT_URL_S3:'https://br-synthetic.storage.c-1.ap-southeast-1.aws.neon.tech',
    AWS_REGION:'ap-southeast-1',AWS_ACCESS_KEY_ID:'synthetic',AWS_SECRET_ACCESS_KEY:'synthetic'};
  expect(validateEnvironment(env).NODE_ENV).toBe('production');
  expect(()=>validateEnvironment({...env,STAFF_PASSWORD_RECOVERY_ENABLED:'true'})).toThrow('STAFF_MAIL_API_KEY');
  expect(validateEnvironment({...env,STAFF_PASSWORD_RECOVERY_ENABLED:'false'}).NODE_ENV).toBe('production');
  expect(()=>validateEnvironment({...env,STAFF_PASSWORD_RECOVERY_ENABLED:'False'})).toThrow('STAFF_PASSWORD_RECOVERY_ENABLED');
  for (const value of ['', '0', false, true]) expect(()=>validateEnvironment({...env,STAFF_PASSWORD_RECOVERY_ENABLED:value})).toThrow('STAFF_PASSWORD_RECOVERY_ENABLED');
  expect(validateEnvironment({...env,VITE_STAFF_PASSWORD_RECOVERY_ENABLED:'false'}).NODE_ENV).toBe('production');
  expect(()=>validateEnvironment({...env,VITE_STAFF_PASSWORD_RECOVERY_ENABLED:'False'})).toThrow('VITE_STAFF_PASSWORD_RECOVERY_ENABLED');
  expect(()=>validateEnvironment({...env,VITE_STAFF_PASSWORD_RECOVERY_ENABLED_SECRET:'hidden'})).toThrow('Private environment');
  for (const key of ['STAFF_AUTH_SECRET','STAFF_AUTH_DATABASE_URL','AWS_SECRET_ACCESS_KEY']) {
    expect(()=>validateEnvironment({...env,STAFF_PASSWORD_RECOVERY_ENABLED:'false',[key]:''})).toThrow(key);
  }
});
