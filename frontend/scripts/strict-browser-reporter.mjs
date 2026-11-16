import { basename, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

export function validateInventory(tests, expectedFiles, minimum = 1) {
  const issues = [];
  if (!tests.length) issues.push('No tests were discovered');
  if (tests.length < minimum) issues.push(`Expected at least ${minimum} tests; discovered ${tests.length}`);
  for (const file of expectedFiles) {
    if (!tests.some(test => basename(test.location.file) === file)) issues.push(`Missing expected suite: ${file}`);
  }
  for (const test of tests) {
    if (test.expectedStatus === 'skipped') issues.push(`Skipped test: ${test.title}`);
    else if (test.expectedStatus !== 'passed') issues.push(`Expected failure is not permitted: ${test.title}`);
  }
  return issues;
}

export default class StrictBrowserReporter {
  constructor() { this.tests = []; this.issues = []; }
  onBegin(config, suite) {
    this.tests = suite.allTests();
    this.expectedFiles = JSON.parse(process.env.TALGOV_EXPECTED_BROWSER_FILES || '[]');
    this.name = process.env.TALGOV_BROWSER_SUITE || 'browser';
    this.minimum = Number(process.env.TALGOV_MINIMUM_BROWSER_TESTS || 1);
    this.issues = validateInventory(this.tests, this.expectedFiles, this.minimum);
    if (!config.forbidOnly) this.issues.push('Focused tests are not forbidden');
  }
  onEnd(result) {
    for (const test of this.tests) {
      if (test.expectedStatus !== 'passed') this.issues.push(`Test must expect success: ${test.title}`);
      if (!test.results.length) this.issues.push(`Test did not execute: ${test.title}`);
      if (test.results.some(run => run.status === 'skipped')) this.issues.push(`Skipped result: ${test.title}`);
      if (test.outcome() !== 'expected') this.issues.push(`Unexpected outcome: ${test.title}`);
    }
    const status = result.status === 'passed' && !this.issues.length ? 'passed' : 'failed';
    const report = { suite: this.name, status, discovered: this.tests.length,
      executed: this.tests.filter(test => test.results.some(run => run.status !== 'skipped')).length,
      skipped: this.tests.filter(test => test.results.some(run => run.status === 'skipped')).length,
      expectedFiles: this.expectedFiles, minimumTests: this.minimum, issues: this.issues };
    const directory = resolve('browser-gate-reports');
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, `${this.name}-${Date.now()}.json`), JSON.stringify(report, null, 2) + '\n');
    if (this.issues.length) console.error(this.issues.join('\n'));
    return { status };
  }
}
