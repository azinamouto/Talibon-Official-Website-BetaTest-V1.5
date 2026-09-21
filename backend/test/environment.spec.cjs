const { validateEnvironment } = require('../dist/config/environment');

test('development defaults and invalid configuration', () => {
  expect(validateEnvironment({}).PORT).toBe(3000);
  for (const config of [{ PORT: 'nan' }, { PORT: 0 }, { ALLOWED_ORIGINS: '*' }, { SUPABASE_URL: 'file:///tmp' }]) {
    expect(() => validateEnvironment(config)).toThrow('environment variable');
  }
});

test('production requires secrets and explicit origins, without exposing values', () => {
  expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow('SUPABASE_URL');
  const env = { NODE_ENV: 'production', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret', SUPABASE_PUBLISHABLE_KEY: 'public', ALLOWED_ORIGINS: 'https://talibon.gov.ph' };
  expect(validateEnvironment(env).NODE_ENV).toBe('production');
  expect(() => validateEnvironment({ ...env, ENABLE_MOCK_DATA: 'true' })).toThrow('ENABLE_MOCK_DATA');
});
