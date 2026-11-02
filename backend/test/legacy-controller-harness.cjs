// Test-only R1 controller safety coverage. These controllers are unmounted or unreachable in R2.
// Preserve DTO/RBAC/provider-failure tests without claiming they are the production contract.
const production = require('../dist/configure-app');
const { deferredRoutes } = require('../dist/security/deferred-routes.middleware');
exports.configureApp = app => production.configureApp(new Proxy(app, {
  get(target, key) {
    if (key === 'use') return (...args) => args[0] === deferredRoutes ? target : target.use(...args);
    return Reflect.get(target, key);
  },
}));
exports.createApiDocument = production.createApiDocument;
exports.isAllowedOrigin = production.isAllowedOrigin;
