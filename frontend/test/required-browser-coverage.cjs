const path = require('node:path');

// Dedicated security/contract suites must execute every discovered test.
function coverageFailures(tests, requiredFiles) {
  const failures = [];
  for (const file of requiredFiles) {
    if (!tests.some(test => path.basename(test.location.file) === file)) failures.push(`No tests discovered in ${file}`);
  }
  for (const test of tests) {
    if (test.expectedStatus !== 'passed' || test.results.at(-1)?.status !== 'passed') {
      failures.push(`Required test did not pass: ${path.basename(test.location.file)}:${test.location.line}`);
    }
  }
  return failures;
}
class RequiredBrowserCoverage {
  constructor(options) { this.requiredFiles = options.requiredFiles; }
  onBegin(_config, suite) { this.suite = suite; }
  onEnd() {
    const failures = coverageFailures(this.suite?.allTests() ?? [], this.requiredFiles);
    if (failures.length) {
      for (const failure of failures) console.error(`[required-browser-coverage] ${failure}`);
      return { status: 'failed' };
    }
  }
}
module.exports = RequiredBrowserCoverage;
module.exports.coverageFailures = coverageFailures;
