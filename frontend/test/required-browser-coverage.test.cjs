const { test } = require('node:test');
const assert = require('node:assert/strict');
const Reporter = require('./required-browser-coverage.cjs');
const requiredFiles = ['admin.spec.ts','public-contract.spec.ts'];
const caseFor = (file, status = 'passed', expectedStatus = 'passed') => ({location:{file,line:1},expectedStatus,results:status ? [{status}] : []});

test('required coverage accepts executed passing tests and rejects missing discovery',()=>{
  assert.deepEqual(Reporter.coverageFailures(requiredFiles.map(f=>caseFor(f)),requiredFiles),[]);
  assert.equal(Reporter.coverageFailures([],requiredFiles).length,2);
  assert.equal(Reporter.coverageFailures([caseFor(requiredFiles[0])],requiredFiles).length,1);
});
test('required coverage fails skipped, interrupted, pending and expected-failure tests',()=>{
  for(const status of ['skipped','interrupted','failed','timedOut',null]) {
    assert.equal(Reporter.coverageFailures([caseFor('admin.spec.ts',status)],['admin.spec.ts']).length,1);
  }
  assert.equal(Reporter.coverageFailures([caseFor('admin.spec.ts','passed','failed')],['admin.spec.ts']).length,1);
});
test('reporter overrides a green run when required coverage skipped',()=>{
  const reporter=new Reporter({requiredFiles:['admin.spec.ts']});
  reporter.onBegin({}, {allTests:()=>[caseFor('admin.spec.ts','skipped')]});
  const saved=console.error;console.error=()=>{};
  try { assert.deepEqual(reporter.onEnd({status:'passed'}),{status:'failed'}); } finally { console.error=saved; }
});
