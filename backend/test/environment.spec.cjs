const { validateEnvironment } = require('../dist/config/environment');
test('development and test startup do not need retired credentials',()=>expect(validateEnvironment({NODE_ENV:'test'}).PORT).toBe(3000));
test('production requires Neon and staff configuration',()=>expect(()=>validateEnvironment({NODE_ENV:'production'})).toThrow('DATABASE_URL'));
test('rejects public secret names and invalid ports',()=> { expect(()=>validateEnvironment({VITE_PRIVATE_KEY:'hidden'})).toThrow(); expect(()=>validateEnvironment({PORT:0})).toThrow(); });
