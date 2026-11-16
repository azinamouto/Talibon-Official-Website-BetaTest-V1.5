// Native dynamic import supports ESM even when require(ESM) is unavailable.
let modules;
exports.loadBetterAuth = () => modules ??= Promise.all([
  import('better-auth'), import('better-auth/plugins'),
]).then(([auth, plugins]) => ({ betterAuth: auth.betterAuth, twoFactor: plugins.twoFactor }));
