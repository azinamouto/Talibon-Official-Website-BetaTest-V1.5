import '@testing-library/jest-dom/vitest';
import { afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';
// Start before SDK imports capture fetch.
server.listen({ onUnhandledRequest: 'error' });
// jsdom does not implement the native dialog lifecycle used by the CMS.
Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
afterEach(() => { cleanup(); server.resetHandlers(); localStorage.clear(); });
afterAll(() => server.close());
