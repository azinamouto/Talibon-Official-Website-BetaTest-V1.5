require('reflect-metadata');
const { AuthService } = require('../dist/api/auth/auth.service');
const { SignupDto } = require('../dist/api/auth/auth.dto');
const { ValidationPipe } = require('@nestjs/common');
const input = { email: 'citizen@example.test', password: 'long-enough-password', full_name: ' Citizen ' };

test.each([null, { access_token: 'access', refresh_token: 'refresh' }])('signup handles confirmation and immediate sessions %j', async session => {
  const signUp = jest.fn(async () => ({ data: { user: { id: 'user' }, session }, error: null }));
  const service = new AuthService({ createAuthClient: () => ({ auth: { signUp } }) });
  const result = await service.signup(input);
  expect(result.data.confirmation_required).toBe(!session);
  expect(result.data.session).toEqual(session);
  expect(signUp).toHaveBeenCalledWith({ email: input.email, password: input.password, options: { data: { full_name: 'Citizen' } } });
});

test.each([[400, 400], [429, 429], [503, 503]])('signup sanitizes provider error %s', async (providerStatus, status) => {
  const service = new AuthService({ createAuthClient: () => ({ auth: { signUp: async () => ({ data: {}, error: { status: providerStatus, message: 'sensitive-provider-details' } }) } }) });
  await expect(service.signup(input)).rejects.toMatchObject({ status });
  await expect(service.signup(input)).rejects.not.toThrow('sensitive-provider-details');
});

test.each([{ password: 'short' }, { full_name: '   ' }, { email: 'invalid' }, { role: 'admin' }])('signup rejects invalid or overposted data %j', async change => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  await expect(pipe.transform({ ...input, ...change }, { type: 'body', metatype: SignupDto })).rejects.toMatchObject({ status: 400 });
});
