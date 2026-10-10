import '@testing-library/jest-dom/vitest';
import { afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';
// Start before SDK imports capture fetch.
server.listen({ onUnhandledRequest: 'error' });
afterEach(() => { cleanup(); server.resetHandlers(); localStorage.clear(); });
afterAll(() => server.close());
