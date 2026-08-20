const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('voice-safe widget parses as JavaScript', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'voice-widget.js'), 'utf8');
  assert.doesNotThrow(() => new Function(source));
});

test('voice-safe widget contains answer-first validation and speech alternatives', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'voice-widget.js'), 'utf8');
  assert.match(source, /Critical ordering: a valid field answer always wins/);
  assert.match(source, /maxAlternatives=5/);
  assert.match(source, /digitsFromSpeech/);
});
