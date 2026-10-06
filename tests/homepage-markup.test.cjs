const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// CardDescription renders a <p>. Browsers auto-close it at a block element,
// changing SSR HTML before React hydrates and causing errors #418 / #423.
test('homepage CardDescription contains only phrasing elements, not parser-repaired block markup', () => {
  const filename = path.join(__dirname, '../components/GeneratorClient.tsx');
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const blockTags = new Set(['div', 'p', 'section', 'article', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  let descriptions = 0;
  function checkChildren(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      assert.ok(!blockTags.has(node.tagName.getText(source)), 'a <p> description must not contain <' + node.tagName.getText(source) + '>');
    }
    ts.forEachChild(node, checkChildren);
  }
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'CardDescription') {
      descriptions++;
      node.children.forEach(checkChildren);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(descriptions > 0, 'the regression check must inspect a real description');
});
