const test = require('node:test');
const assert = require('node:assert/strict');
const { GenerationContentStart } = require('../lib/generation-stream.ts');
const { readGenerationStream } = require('../lib/generation-sse.ts');
const { sanitizeText } = require('../lib/utils.ts');
const encoder = new TextEncoder();

function bytes(text, split = 1) {
  const data = encoder.encode(text);
  return new ReadableStream({ start(c) {
    for (let i = 0; i < data.length; i += split) c.enqueue(data.slice(i, i + split));
    c.close();
  } });
}
function opening(chunks) {
  const start = new GenerationContentStart();
  return chunks.map(c => start.push(c)).join('') + start.finish();
}

test('the opening Markdown marker is preserved at every token boundary', () => {
  const source = '## 1. 爆款标题创作\n标题正文';
  for (let i = 1; i < source.length; i++) {
    assert.equal(opening([source.slice(0, i), source.slice(i)]), source);
  }
  assert.equal(opening(Array.from(source)), source);
});

test('plain numbered titles and alternative punctuation are accepted', () => {
  assert.equal(opening(['1', '.', ' 爆款', '标题创作\n答案']), '## 1. 爆款标题创作\n答案');
  assert.equal(opening(['1、标题创作\n答案']), '## 1. 标题创作\n答案');
  assert.equal(opening(['1．生成标题\n答案']), '## 1. 生成标题\n答案');
});

test('preamble is removed only when a genuine heading is found', () => {
  assert.equal(opening(['说明中提到1. 但不是标题\n', '## 1. 标题\n答案']), '## 1. 标题\n答案');
  assert.equal(opening(['格式不同但', '仍有正文']), '格式不同但仍有正文');
  assert.equal(opening(['', '  ']), '');
});

test('text sanitizer keeps emojis and combining accents, removes hidden characters', () => {
  assert.equal(sanitizeText('中文🌟👩‍💻 café\n## 1. 标题\u200B\uFEFF\u0000'), '中文🌟👩‍💻 café\n## 1. 标题');
});

test('SSE reader retains byte-split UTF-8 and JSON with heartbeats and CRLF', async () => {
  const content = '中文🌟正文';
  const chunks = [];
  await readGenerationStream(bytes(`: keep-alive\r\n\r\ndata: ${JSON.stringify({ content })}\r\n\r\ndata: [DONE]\r\n\r\n`), c => chunks.push(c));
  assert.equal(chunks.join(''), content);
});

test('SSE reader handles a final DONE without a newline', async () => {
  const chunks = [];
  await readGenerationStream(bytes('data:{"content":"答案"}\n\ndata: [DONE]', 20), c => chunks.push(c));
  assert.deepEqual(chunks, ['答案']);
});

test('empty DONE is not success', async () => {
  await assert.rejects(readGenerationStream(bytes('data: [DONE]\n\n'), () => {}), /未收到有效内容/);
});

test('EOF without DONE reports truncation while preserving partial content', async () => {
  const chunks = [];
  await assert.rejects(readGenerationStream(bytes('data: {"content":"部分答案"}\n\n'), c => chunks.push(c)), /提前结束/);
  assert.deepEqual(chunks, ['部分答案']);
});

test('server error is propagated even if the same event also has content', async () => {
  await assert.rejects(readGenerationStream(bytes('data: {"content":"partial","error":"上游中断"}\n\n'), () => {}), /上游中断/);
});

test('malformed complete JSON is an error, not a silently skipped chunk', async () => {
  await assert.rejects(readGenerationStream(bytes('data: {invalid}\n\n'), () => {}), /格式异常/);
});

test('cancelling the reader releases a pending read and upstream resources', async () => {
  let cancelled = false;
  const controller = new AbortController();
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const work = readGenerationStream(body, () => {}, controller.signal);
  controller.abort();
  await assert.rejects(work, { name: 'AbortError' });
  assert.equal(cancelled, true);
  assert.equal(body.locked, false);
});

test('heading-like explanation lists are not confirmed at token boundaries', () => {
  const preamble = '我会这样处理：\n1. 标题创作建议：使用疑问句\n2. 正文建议：讲故事\n\n';
  const answer = '## 1. 爆款标题创作\n真正答案';
  const source = preamble + answer;
  for (let i = 1; i < source.length; i++) {
    assert.equal(opening([source.slice(0, i), source.slice(i)]), answer);
  }
  assert.equal(opening(Array.from(source)), answer);
  assert.equal(opening(['前言\n1. 标题']), '## 1. 标题');
});

test('SSE line limits are enforced before forwarding, independent of read chunk size', async () => {
  const oversized = 'data: ' + JSON.stringify({ content: 'x'.repeat(1024 * 1024 + 128) }) + '\n\ndata: [DONE]\n\n';
  for (const split of [oversized.length, 65536]) {
    const output = [];
    await assert.rejects(readGenerationStream(bytes(oversized, split), c => output.push(c)), /响应过大/);
    assert.equal(output.length, 0);
  }
  // The limit is per line, not per stream: ordinary small events can exceed it in total.
  const chunk = 'x'.repeat(10000);
  const wire = ('data: ' + JSON.stringify({ content: chunk }) + '\n\n').repeat(110) + 'data: [DONE]\n\n';
  let size = 0;
  await readGenerationStream(bytes(wire, 65536), c => { size += c.length; });
  assert.equal(size, chunk.length * 110);
});

test('the actual prompt heading with a title count streams before completion at every token boundary', () => {
  for (const suffix of ['(3个)', '（3个）']) {
    const answer = `## 1. 爆款标题创作${suffix}\n标题正文`;
    const source = '说明列表\n1. 标题创作建议：先思考\n' + answer;
    for (let i = 1; i < source.length; i++) assert.equal(opening([source.slice(0, i), source.slice(i)]), answer);
    const start = new GenerationContentStart();
    const output = Array.from(source).map(c => start.push(c)).join('');
    assert.equal(output, answer);
    assert.equal(start.finish(), '');
  }
});
