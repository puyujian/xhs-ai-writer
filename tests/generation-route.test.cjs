const test = require('node:test');
const assert = require('node:assert/strict');
process.env.ENABLE_SCRAPING = 'false';
const { POST } = require('../app/api/generate-combined/route.ts');
const { aiManager } = require('../lib/ai-manager.ts');
const { BusinessError } = require('../lib/error-handler.ts');
const { readGenerationStream } = require('../lib/generation-sse.ts');

function mock(t, work) {
  const original = aiManager.generateStreamWithRetry;
  aiManager.generateStreamWithRetry = work;
  t.after(() => { aiManager.generateStreamWithRetry = original; });
}
function request(input = { keyword: '主题', user_info: '素材' }, options = {}) {
  return new Request('http://localhost/api/generate-combined', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), ...options,
  });
}

test('invalid JSON, null, incorrect types, blank and oversized input return 400 without calling AI', async t => {
  mock(t, () => { throw new Error('must not call AI'); });
  for (const input of [null, [], {}, { keyword: 12, user_info: '素材' }, { keyword: '主题', user_info: {} },
    { keyword: '   ', user_info: '素材' }, { keyword: '主题', user_info: 'x'.repeat(20001) }]) {
    assert.equal((await POST(request(input))).status, 400);
  }
  assert.equal((await POST(request({}, { body: '{invalid' }))).status, 400);
});

test('route preserves a split heading and emojis through SSE', async t => {
  mock(t, async (prompt, chunk) => {
    for (const text of ['##', ' ', '1', '.', ' 爆款标题创作\n', '中文🌟正文']) chunk(text);
  });
  const response = await POST(request());
  const chunks = [];
  await readGenerationStream(response.body, c => chunks.push(c));
  assert.equal(chunks.join(''), '## 1. 爆款标题创作\n中文🌟正文');
  assert.match(response.headers.get('Cache-Control'), /no-transform/);
});

test('route does not discard a valid answer lacking exact Markdown headings', async t => {
  mock(t, async (prompt, chunk) => chunk('1. 爆款标题创作\n答案\n2. 正文内容\n正文'));
  const chunks = [];
  await readGenerationStream((await POST(request())).body, c => chunks.push(c));
  assert.match(chunks.join(''), /^## 1\. 爆款标题创作/);
});

test('route preserves nonempty answers with unexpected formatting', async t => {
  mock(t, async (prompt, chunk) => chunk('没有标题标记，但正文不能消失'));
  const chunks = [];
  await readGenerationStream((await POST(request())).body, c => chunks.push(c));
  assert.equal(chunks.join(''), '没有标题标记，但正文不能消失');
});

test('route produces an error instead of DONE for empty answers', async t => {
  mock(t, async () => {});
  const wire = await (await POST(request())).text();
  assert.match(wire, /"error"/);
  assert.doesNotMatch(wire, /\[DONE\]/);
});

test('upstream error is a public message, not a leaked internal URL or model list', async t => {
  mock(t, async (prompt, chunk, error) => error(new BusinessError(
    'sensitive upstream URL and model list', '生成失败', '请重试', true
  )));
  const wire = await (await POST(request())).text();
  assert.match(wire, /生成失败/);
  assert.doesNotMatch(wire, /sensitive upstream|\[DONE\]/);
});

test('unexpected start failure becomes an SSE error rather than a broken response', async t => {
  mock(t, async () => { throw new Error('unexpected failure'); });
  const wire = await (await POST(request())).text();
  assert.match(wire, /"error"/);
  assert.doesNotMatch(wire, /\[DONE\]/);
});

test('client disconnect cancels generation without writing to a closed controller', async t => {
  let signal;
  let finished;
  const done = new Promise(resolve => { finished = resolve; });
  mock(t, async (prompt, chunk, error, budget, options) => {
    signal = options.signal;
    await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    chunk('late content must be ignored');
    finished();
  });
  const response = await POST(request());
  await response.body.cancel();
  await done;
  assert.ok(signal.aborted);
});

test('cron stays fail-closed when the secret is missing or invalid', async t => {
  const { GET } = require('../app/api/cron/clean-cache/route.ts');
  const oldEnv = process.env.NODE_ENV, oldSecret = process.env.CRON_SECRET;
  t.after(() => {
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    if (oldSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = oldSecret;
  });
  process.env.NODE_ENV = 'production';
  delete process.env.CRON_SECRET;
  assert.equal((await GET(new Request('http://localhost/api/cron/clean-cache'))).status, 500);
  process.env.CRON_SECRET = 'test-only-secret';
  assert.equal((await GET(new Request('http://localhost/api/cron/clean-cache'))).status, 401);
});

test('a failed generation flushes buffered nonstandard partial content before its error', async t => {
  let partial;
  mock(t, async (prompt, chunk, error) => {
    chunk(partial);
    error(new BusinessError('broken stream', '生成中断，已保留部分内容', '请重试', true));
  });
  for (partial of ['没有标题标记，但正文不能消失', '## 1. 标题\n部分正文']) {
    const chunks = [];
    await assert.rejects(readGenerationStream((await POST(request())).body, c => chunks.push(c)), /已保留部分内容/);
    assert.equal(chunks.join(''), partial);
  }
});
