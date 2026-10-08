const fs = require('node:fs');
const path = require('node:path');
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { configureApp, createApiDocument } = require('../dist/configure-app');

// Inspect production controllers without constructing database clients or listening.
const definitions = [
  ['auth/auth', 'AuthController', 'auth/auth', 'AuthService'],
  ['about/about', 'AboutController', 'about/about', 'AboutService'],
  ['content/pages', 'PageContentController', 'content/content', 'ContentService'],
  ['content/news', 'NewsContentController', 'content/content', 'ContentService'],
  ['content/services', 'ServiceContentController', 'content/content', 'ContentService'],
  ['admin/users', 'UsersController', 'admin/users', 'UsersService'],
  ['admin/reports', 'ReportsController', 'admin/reports', 'ReportsService'],
];
async function exportDocument() {
  const controllers = definitions.map(([file, name]) => require(`../dist/api/${file}.controller`)[name]);
  const services = [...new Set(definitions.map(([, , file, name]) => require(`../dist/api/${file}.service`)[name]))];
  class ContractModule {}
  Module({ controllers, providers: services.map(provide => ({ provide, useValue: {} })) })(ContractModule);
  const app = await NestFactory.create(ContractModule, { logger: false, bodyParser: false });
  try {
    configureApp(app);
    const document = createApiDocument(app);
    document.info.description += ' Checked-in scope: Sprint 1 authentication, Sprint 2 About/content and Sprint 4 admin endpoints. Other APIs remain in the live document.';
    const output = JSON.stringify(document, null, 2) + '\n';
    const target = path.resolve(__dirname, '../../contracts/openapi.json');
    if (process.argv.includes('--check')) {
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== output) throw new Error('OpenAPI snapshot is stale. Run npm run contracts:export.');
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, output);
    }
  } finally { await app.close(); }
}
exportDocument().catch(error => { console.error(error.message); process.exitCode = 1; });
