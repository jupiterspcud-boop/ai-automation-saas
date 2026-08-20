const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('knowledge and AI routes parse as JavaScript', () => {
  for (const file of ['knowledge.js', 'ai.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.doesNotThrow(() => new Function('require', 'module', 'exports', source));
  }
});

test('AI route is tenant knowledge aware', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'ai.js'), 'utf8');
  assert.match(source, /CLIENT KNOWLEDGE BASE/);
  assert.match(source, /Do not mix information from another business/);
  assert.match(source, /knowledgeContext\(biz\)/);
});
