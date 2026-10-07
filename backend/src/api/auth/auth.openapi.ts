import { ApiResponse } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'citizen@example.test' };
const userSchema: SchemaObject = { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' }, email: { type: 'string' } }, additionalProperties: true };
const sessionSchema: SchemaObject = { type: 'object', required: ['access_token', 'refresh_token', 'expires_in', 'token_type', 'user'], properties: {
  access_token: { type: 'string' }, refresh_token: { type: 'string' }, expires_in: { type: 'number' }, token_type: { type: 'string' }, user: userSchema,
}, additionalProperties: true };

export function AuthResponse(operation: 'signup' | 'login' | 'refresh' | 'me' | 'logout') {
  const profile = { role: 'citizen', is_verified: false };
  const session = { access_token: 'mock-access-token-not-valid', refresh_token: 'mock-refresh-token-not-valid', expires_in: 3600, token_type: 'bearer', user };
  const data = operation === 'me' ? { user, profile } : { user, session: operation === 'signup' ? null : session, ...(operation === 'signup' ? { confirmation_required: true } : {}) };
  const properties: Record<string, SchemaObject> = operation === 'me'
    ? { user: userSchema, profile: { type: 'object', nullable: true, additionalProperties: true } }
    : { user: { ...userSchema, nullable: operation === 'signup' }, session: { ...sessionSchema, nullable: operation === 'signup' }, ...(operation === 'signup' ? { confirmation_required: { type: 'boolean' as const } } : {}) };
  return ApiResponse({ status: operation === 'signup' ? 201 : 200, description: 'Authentication response. Mock tokens are deliberately unusable against live services.', schema: {
    type: 'object', required: operation === 'logout' ? ['success'] : ['success', 'data'], properties: {
      success: { type: 'boolean', enum: [true] },
      ...(operation === 'logout' ? {} : { data: { type: 'object' as const, required: Object.keys(properties), properties } }),
    }, example: operation === 'logout' ? { success: true } : { success: true, data },
  } });
}
