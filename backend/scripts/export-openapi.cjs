const fs = require('node:fs');
const path = require('node:path');
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { configureApp, createApiDocument } = require('../dist/configure-app');

// Inspect production controllers without constructing database clients or listening.
const definitions = [
  ['forms/public-forms', 'PublicFormsController', '../database/public-content', 'PublicContentService'],
  ['content/public-catalog', 'PublicCatalogController', '../database/public-content', 'PublicContentService'],
  ['media/media', 'MediaController', 'media/media', 'MediaService'],
  ['media/media', 'PublicMediaController', 'media/media', 'MediaService'],
  ['executive/executive', 'ExecutiveController', 'executive/executive', 'ExecutiveService'],
  ['legislative/legislative', 'LegislativeController', 'legislative/legislative', 'LegislativeService'],
  ['transparency/transparency', 'TransparencyController', 'transparency/transparency', 'TransparencyService'],
  ['tourism/tourism', 'TourismController', 'tourism/tourism', 'TourismService'],
  ['news/news', 'NewsController', 'news/news', 'NewsService'],
  ['about/about', 'AboutController', 'about/about', 'AboutService'],
  ['content/pages', 'PageContentController', 'content/content', 'ContentService'],
  ['content/news', 'NewsContentController', 'content/content', 'ContentService'],
  ['content/services', 'ServiceContentController', 'content/content', 'ContentService'],
  ['search/search', 'SearchController', 'search/search', 'SearchService'],
];
async function exportDocument() {
  const controllers = definitions.map(([file, name]) => require(`../dist/api/${file}.controller`)[name]);
  const services = [...new Set(definitions.map(([, , file, name]) => require(`../dist/api/${file}.service`)[name]))];
  class ContractModule {}
  Module({ controllers, providers: services.map(provide => ({ provide, useValue: {} })) })(ContractModule);
  console.error("contract: creating inspection app");
  const app = await NestFactory.create(ContractModule, { logger: false, bodyParser: false });
  try {
    console.error("contract: configuring inspection app");
    configureApp(app);
    console.error("contract: generating schema");
    const document = createApiDocument(app);
    console.error("contract: schema generated");
    document.info.description += ' Checked-in scope: retained public content/search/catalog contracts, R2 staff authentication and private photo/document media. Other APIs remain in the live document.';
    const output = JSON.stringify(document, null, 2) + '\n';
    const target = path.resolve(__dirname, '../../contracts/openapi.json');
    if (process.argv.includes('--check')) {
      if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) throw new Error('OpenAPI snapshot is stale. Run npm run contracts:export.');
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, output);
    }
  } finally { await app.close(); }
}
exportDocument().catch(error => { console.error(error.message); process.exitCode = 1; });
