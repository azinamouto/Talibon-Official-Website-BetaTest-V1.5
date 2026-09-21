const { validateEnvironment } = require('../dist/config/environment');

test('development defaults and invalid configuration', () => {
  const base = { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' };
  expect(validateEnvironment(base).PORT).toBe(3000);
  expect(() => validateEnvironment({})).toThrow('SUPABASE_URL');
  for (const config of [{ PORT: 'nan' }, { PORT: 0 }, { ALLOWED_ORIGINS: '*' }, { SUPABASE_URL: 'file:///tmp' }]) {
    expect(() => validateEnvironment({ ...base, ...config })).toThrow('environment variable');
  }
});

test('production requires secrets and explicit origins, without exposing values', () => {
  expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow('SUPABASE_URL');
  const env = { NODE_ENV: 'production', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret', SUPABASE_PUBLISHABLE_KEY: 'public', ALLOWED_ORIGINS: 'https://talibon.gov.ph' };
  expect(validateEnvironment(env).NODE_ENV).toBe('production');
  expect(() => validateEnvironment({ ...env, ENABLE_MOCK_DATA: 'true' })).toThrow('ENABLE_MOCK_DATA');
});


test('rejects private browser variables and placeholder server configuration without leaking values', () => {
  const base = { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' };
  for (const name of ['VITE_SECRET_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY', 'VITE_PRIVATE_KEY']) {
    expect(() => validateEnvironment({ ...base, [name]: 'sensitive-test-marker' })).toThrow('VITE_ prefix');
    expect(() => validateEnvironment({ ...base, [name]: 'sensitive-test-marker' })).not.toThrow('sensitive-test-marker');
  }
  expect(() => validateEnvironment({ ...base, SUPABASE_SERVICE_ROLE_KEY: 'your_service_role_key' })).toThrow('SUPABASE_SERVICE_ROLE_KEY');
});
