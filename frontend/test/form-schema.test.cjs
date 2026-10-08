const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const vm = require('node:vm');
const path = require('node:path');
const code = buildSync({ entryPoints: [path.join(__dirname, '../src/components/eservices/formSchema.ts')], bundle: true, write: false, format: 'cjs', platform: 'node' }).outputFiles[0].text;
const context = { module: { exports: {} } };
vm.runInNewContext(code, context);
const { applicantFields, formSchemas, validateFields, submissionPayload } = context.module.exports;
const applicant = { fullName: ' Juan Cruz ', barangay: 'poblacion', email: 'citizen@example.test', mobileNumber: '09171234567', purpose: ' Employment ' };
test('required numeric fields do not convert blank values to zero', () => {
  const fields = formSchemas['Certificate of Indigency'];
  const errors = validateFields(fields, { address: 'Purok 1', monthlyIncome: ' ', familyMembers: '', reason: 'Assistance' });
  assert.match(errors.monthlyIncome, /required/); assert.match(errors.familyMembers, /required/);
});
test('numeric bounds and integer counts match the backend', () => {
  const fields = formSchemas['Certificate of Indigency'];
  for (const value of ['-1', 'Infinity', 'NaN', '1000000001']) assert.ok(validateFields(fields, { monthlyIncome: value }).monthlyIncome);
  assert.ok(validateFields(fields, { familyMembers: '1.5' }).familyMembers);
  assert.ok(validateFields(formSchemas['Building Permit'], { floorArea: '0', estimatedCost: '0' }).floorArea);
  assert.equal(validateFields(fields, { address: 'A', monthlyIncome: '0', familyMembers: '1', reason: 'R' }).monthlyIncome, undefined);
});
test('contact and selection validation rejects invalid values', () => {
  for (const mobileNumber of ['12345', '+6391234567890', '0917-123-4567']) assert.ok(validateFields(applicantFields, { ...applicant, mobileNumber }).mobileNumber);
  assert.equal(Object.keys(validateFields(applicantFields, { ...applicant, mobileNumber: '+639171234567' })).length, 0);
  assert.ok(validateFields(applicantFields, { ...applicant, email: 'invalid' }).email);
  assert.ok(validateFields(applicantFields, { ...applicant, barangay: 'not-a-barangay' }).barangay);
});
test('payload is trimmed, typed and excludes unknown fields and card data', () => {
  const result = submissionPayload('Barangay Clearance', { ...applicant, sitioPurok: ' Purok 1 ', yearsOfResidency: '0', cardNumber: 'not-allowed', userId: 'not-allowed' });
  assert.equal(result.fullName, 'Juan Cruz'); assert.equal(result.purpose, 'Employment');
  assert.equal(result.details.yearsOfResidency, 0); assert.equal(result.details.sitioPurok, 'Purok 1');
  assert.equal('cardNumber' in result, false); assert.equal('userId' in result, false);
  assert.throws(() => submissionPayload('Barangay Clearance', { ...applicant, yearsOfResidency: '' }));
});
test('all schema string lengths reject oversized values', () => {
  for (const field of [...applicantFields, ...Object.values(formSchemas).flat()]) {
    if (field.maxLength) assert.ok(validateFields([field], { [field.name]: 'x'.repeat(field.maxLength + 1) })[field.name]);
  }
});
