const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { AboutService } = require('../dist/api/about/about.service');
const { aboutContracts } = require('../dist/api/about/about.contract');
const methods = { profile: 'getProfile', seal: 'getSeal', history: 'getHistory', mayors: 'getMayors', departments: 'getDepartments', 'vicinity-map': 'getVicinityMap', barangays: 'getBarangays', industry: 'getIndustry', hymn: 'getHymn', demographics: 'getDemographics', location: 'getLocation' };
test('About editorial responses match the shared OpenAPI examples', () => {
  const service = new AboutService();
  for (const [path, method] of Object.entries(methods)) assert.deepEqual(service[method](), aboutContracts[path].example, path);
});
