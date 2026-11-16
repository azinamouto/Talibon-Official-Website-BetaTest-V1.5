const { writeFileSync, copyFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
writeFileSync(path.join(root, 'dist/package.json'), JSON.stringify({ type: 'commonjs' }));
copyFileSync(path.join(root, 'src/authentication/better-auth-loader.cjs'),
  path.join(root, 'dist/authentication/better-auth-loader.cjs'));
