const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync(require('node:path').join(__dirname, '../src/styles/tokens.css'), 'utf8');
const color = name => css.match(new RegExp(`--color-${name}: (#[0-9a-f]{6})`))[1];
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
test('all base control text and hover pairs meet AA normal text contrast', () => {
  for (const name of ['action', 'action-hover', 'danger', 'danger-hover', 'ink', 'muted']) {
    assert.ok(contrast(color(name), '#ffffff') >= 4.5, name);
  }
  assert.ok(contrast(color('ink'), color('surface')) >= 4.5);
  for (const name of ['focus', 'control']) assert.ok(contrast(color(name), '#ffffff') >= 3, name);
});
