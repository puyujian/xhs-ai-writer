const test = require('node:test');
const assert = require('node:assert/strict');
const { AIManager } = require('../lib/ai-manager.ts');
const { CONFIG } = require('../lib/constants.ts');
const { BusinessError } = require('../lib/error-handler.ts');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function setup(t, create, models = 'slow,backup') {
  const saved = { ...CONFIG };
  const originalModels = process.env.AI_MODEL_NAME;
  Object.assign(CONFIG, {
    AI_TIMEOUT_RESPONSE_BUFFER: 10,
    AI_STREAM_MIN_ATTEMPT_TIMEOUT: 30,
    AI_STREAM_TIMEOUT: 100,
    AI_STREAM_FIRST_CHUNK_TIMEOUT: 100,
    AI_STREAM_CONTENT_IDLE_TIMEOUT: 50,
    AI_STREAM_REASONING_ONLY_TIMEOUT: 30,
  });
  process.env.AI_MODEL_NAME = models;
  t.after(() => {
    Object.assign(CONFIG, saved);
    if (originalModels === undefined) delete process.env.AI_MODEL_NAME;
    else process.env.AI_MODEL_NAME = originalModels;
  });
  const manager = new AIManager();
  manager.setRetryConfig({ baseDelay: 1 });
  const calls = [];
  manager.client = { chat: { completions: { create: (params, options) => {
    calls.push({ ...params, options });
    return create(params, options);
  } } } };
  return { manager, calls };
}
function stream(chunks, signal) {
  const controller = new AbortController();
  return {
    controller,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (typeof chunk === 'number') { await sleep(chunk); continue; }
        if (chunk instanceof Error) throw chunk;
        yield { choices: [{ delta: { content: chunk }, finish_reason: null }] };
      }
      yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
    },
  };
}
function hangUntilAbort(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
    else signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
}
async function generate(manager, budget = 400, options = {}) {
  const chunks = [], errors = [];
  await manager.generateStreamWithRetry('prompt', c => chunks.push(c), e => errors.push(e), budget, options);
  return { chunks, errors };
}

test('a hanging connection falls back, with a usable timeout and old request aborted', async t => {
  let firstSignal;
  const { manager, calls } = setup(t, (p, o) => {
    if (p.model === 'slow') { firstSignal = o.signal; return hangUntilAbort(o.signal); }
    return Promise.resolve(stream(['## 1. 标题\n成功'], o.signal));
  });
  const result = await generate(manager);
  assert.equal(result.errors.length, 0);
  assert.match(result.chunks.join(''), /成功/);
  assert.deepEqual(calls.map(c => c.model), ['slow', 'backup']);
  assert.ok(firstSignal.aborted);
  assert.ok(calls.every(c => c.options.timeout >= 30));
});

test('reasoning/empty chunks do not reset the first-content deadline', async t => {
  const { manager, calls } = setup(t, (p, o) => {
    if (p.model !== 'slow') return Promise.resolve(stream(['备用正文'], o.signal));
    return Promise.resolve({
      controller: new AbortController(),
      async *[Symbol.asyncIterator]() {
        while (!o.signal.aborted) {
          await sleep(5);
          yield { choices: [{ delta: { reasoning_content: 'thinking', content: '' } }] };
        }
      },
    });
  });
  const result = await generate(manager);
  assert.deepEqual(calls.map(c => c.model), ['slow', 'backup']);
  assert.deepEqual(result.chunks, ['备用正文']);
  assert.equal(result.errors.length, 0);
});

test('connection and first content share one deadline, rather than two budgets', async t => {
  const { manager, calls } = setup(t, async (p, o) => {
    if (p.model !== 'slow') return stream(['备用正文'], o.signal);
    await sleep(60);
    return { controller: new AbortController(), [Symbol.asyncIterator]() {
      return { next: () => hangUntilAbort(o.signal) };
    } };
  });
  const result = await generate(manager, 230);
  assert.equal(result.errors.length, 0);
  assert.deepEqual(calls.map(c => c.model), ['slow', 'backup']);
});

test('404 and rate limiting switch models immediately instead of repeating', async t => {
  for (const status of [404, 429]) {
    const { manager, calls } = setup(t, (p, o) => p.model === 'slow'
      ? Promise.reject(Object.assign(new Error(`HTTP ${status}`), { status }))
      : Promise.resolve(stream(['成功'], o.signal)));
    const result = await generate(manager);
    assert.equal(result.errors.length, 0);
    assert.deepEqual(calls.map(c => c.model), ['slow', 'backup']);
  }
});

test('insufficient budget never sends a doomed zero-second request', async t => {
  const { manager, calls } = setup(t, () => { throw new Error('must not call'); });
  const result = await generate(manager, 15);
  assert.equal(calls.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /没有足够/);
});

test('partial content failure is reported once, never concatenated with a retry', async t => {
  const { manager, calls } = setup(t, (p, o) => Promise.resolve(stream(['部分内容', new Error('broken stream')], o.signal)));
  const result = await generate(manager);
  assert.deepEqual(result.chunks, ['部分内容']);
  assert.equal(calls.length, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].userMessage, /保留部分内容/);
  assert.ok(calls[0].options.signal.aborted);
});

test('idle empty chunks after content cannot keep a broken stream alive', async t => {
  const { manager, calls } = setup(t, (p, o) => Promise.resolve({
    controller: new AbortController(),
    async *[Symbol.asyncIterator]() {
      yield { choices: [{ delta: { content: '部分内容' } }] };
      while (!o.signal.aborted) {
        await sleep(5);
        yield { choices: [{ delta: {} }] };
      }
    },
  }));
  const result = await generate(manager);
  assert.equal(calls.length, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /流中断或超时/);
});

test('user cancellation aborts upstream and never falls back or reports an application error', async t => {
  const controller = new AbortController();
  const { manager, calls } = setup(t, (p, o) => hangUntilAbort(o.signal));
  const work = generate(manager, 400, { signal: controller.signal });
  controller.abort();
  const result = await work;
  assert.equal(calls.length, 1);
  assert.equal(result.errors.length, 0);
  assert.ok(calls[0].options.signal.aborted);
});

test('pre-cancelled generation makes no calls', async t => {
  const { manager, calls } = setup(t, () => { throw new Error('must not call'); });
  const result = await generate(manager, 400, { signal: AbortSignal.abort() });
  assert.equal(calls.length, 0);
  assert.equal(result.errors.length, 0);
});

test('non-retryable configuration error does not traverse every model', async t => {
  const { manager, calls } = setup(t, () => Promise.reject(new BusinessError('config missing', '配置错误', '请配置', false)));
  const result = await generate(manager);
  assert.equal(calls.length, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /实际尝试模型 \[slow\]/);
});

test('blank or duplicate model configuration has a safe fallback', async t => {
  const { manager } = setup(t, (p, o) => Promise.resolve(stream(['成功'], o.signal)), ', ,');
  assert.deepEqual(manager.getModelList(), [CONFIG.DEFAULT_AI_MODEL]);
  process.env.AI_MODEL_NAME = 'one, one,two';
  assert.deepEqual(manager.getModelList(), ['one', 'two']);
});

test('长度截断发生在已有正文之后时保留内容并正常结束', async t => {
  const { manager, calls } = setup(t, (p, o) => Promise.resolve({
    controller: new AbortController(),
    async *[Symbol.asyncIterator]() {
      yield { choices: [{ delta: { content: '部分正文' } }] };
      yield { choices: [{ delta: { content: '更多内容' }, finish_reason: 'length' }] };
    },
  }));
  const result = await generate(manager);
  assert.deepEqual(result.chunks, ['部分正文', '更多内容']);
  assert.equal(result.errors.length, 0);
  assert.equal(calls.length, 1);
});

test('没有任何正文的长度截断直接切换备用模型', async t => {
  const { manager, calls } = setup(t, (p, o) => p.model === 'slow'
    ? Promise.resolve({ controller: new AbortController(), async *[Symbol.asyncIterator]() {
      yield { choices: [{ delta: {}, finish_reason: 'length' }] };
    } })
    : Promise.resolve(stream(['备用正文'], o.signal)));
  const result = await generate(manager);
  assert.deepEqual(calls.map(c => c.model), ['slow', 'backup']);
  assert.equal(result.errors.length, 0);
  assert.equal(result.chunks.join(''), '备用正文');
});

test('whitespace-only answers fall back and do not masquerade as substantive output', async t => {
  const { manager, calls } = setup(t, (p, o) => Promise.resolve(stream(p.model === 'slow' ? [' ', '\n'] : ['\n', '备用正文', '\n'], o.signal)));
  const result = await generate(manager);
  assert.deepEqual(calls.map(c => c.model), ['slow', 'backup']);
  assert.equal(result.errors.length, 0);
  assert.equal(result.chunks.join(''), '\n备用正文\n');
});

function reasoningOnly(signal) {
  return {
    controller: new AbortController(),
    async *[Symbol.asyncIterator]() {
      while (!signal.aborted) {
        await sleep(5);
        yield { choices: [{ delta: { reasoning_content: '正在思考…' } }] };
      }
    },
  };
}

test('只输出思考内容时，提前切换备用模型而不是等满首段预算', async t => {
  const { manager, calls } = setup(t, (p, o) => p.model === 'slow'
    ? Promise.resolve(reasoningOnly(o.signal))
    : Promise.resolve(stream(['## 1. 标题\n备用正文'], o.signal)));
  const result = await generate(manager);
  assert.deepEqual(calls.map(c => c.model), ['slow', 'backup']);
  assert.equal(result.errors.length, 0);
  assert.equal(result.chunks.join(''), '## 1. 标题\n备用正文');
});

test('所有模型都只输出思考内容时，错误信息说明是思考超时', async t => {
  const { manager, calls } = setup(t, (p, o) => Promise.resolve(reasoningOnly(o.signal)), 'slow');
  const result = await generate(manager);
  assert.equal(calls.length, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /思考超时仍未输出正文/);
  assert.match(result.errors[0].message, /实际尝试模型 \[slow\]/);
});

test('a failed model is deferred on the next warm request, then retried after cooldown', async t => {
  const { manager, calls } = setup(t, (p, o) => p.model === 'slow'
    ? Promise.reject(Object.assign(new Error('HTTP 404'), { status: 404 }))
    : Promise.resolve(stream(['成功'], o.signal)));
  assert.equal((await generate(manager)).errors.length, 0);
  assert.equal((await generate(manager)).errors.length, 0);
  assert.deepEqual(calls.map(c => c.model), ['slow', 'backup', 'backup']);
  manager.streamModelCooldowns.set('slow', Date.now() - 1);
  await generate(manager);
  assert.deepEqual(calls.slice(3).map(c => c.model), ['slow', 'backup']);
});

test('deferred models remain available when a healthy model fails', async t => {
  const { manager, calls } = setup(t, (p, o) => p.model === 'backup'
    ? Promise.reject(Object.assign(new Error('HTTP 503'), { status: 503 }))
    : Promise.resolve(stream(['恢复的模型'], o.signal)));
  manager.streamModelCooldowns.set('slow', Date.now() + 60000);
  const result = await generate(manager);
  assert.deepEqual(calls.map(c => c.model), ['backup', 'slow']);
  assert.equal(result.errors.length, 0);
  assert.equal(manager.streamModelCooldowns.has('slow'), false);
});

test('cancellation and content filtering never poison model health', async t => {
  const { manager } = setup(t, () => Promise.resolve({ async *[Symbol.asyncIterator]() {
    yield { choices: [{ delta: {}, finish_reason: 'content_filter' }] };
  } }), 'slow');
  await generate(manager);
  assert.equal(manager.streamModelCooldowns.size, 0);
  await generate(manager, 400, { signal: AbortSignal.abort() });
  assert.equal(manager.streamModelCooldowns.size, 0);
});

test('stop finishes a normal answer without waiting for a hanging proxy EOF', async t => {
  const { manager, calls } = setup(t, (p, o) => Promise.resolve({ async *[Symbol.asyncIterator]() {
    yield { choices: [{ delta: { content: '完整正文' }, finish_reason: 'stop' }] };
    await hangUntilAbort(o.signal);
  } }));
  const result = await generate(manager);
  assert.deepEqual(result.chunks, ['完整正文']);
  assert.equal(result.errors.length, 0);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].options.signal.aborted);
});

test('upstream EOF without a finish reason retains partial content and reports truncation once', async t => {
  const { manager, calls } = setup(t, () => Promise.resolve({ async *[Symbol.asyncIterator]() {
    yield { choices: [{ delta: { content: '部分正文' }, finish_reason: null }] };
  } }));
  const result = await generate(manager);
  assert.deepEqual(result.chunks, ['部分正文']);
  assert.equal(calls.length, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /提前结束/);
});

test('connection, reasoning and idle timeouts preserve their cause despite synchronous abort rejection', async t => {
  for (const [kind, expected] of [['connection', /连接超时/], ['reasoning', /思考超时/], ['idle', /正文流中断或超时/]]) {
    const { manager, calls } = setup(t, (p, o) => {
      if (kind === 'connection') return hangUntilAbort(o.signal);
      return Promise.resolve({ async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: kind === 'reasoning' ? { reasoning_content: 'thinking' } : { content: '正文' } }] };
        await hangUntilAbort(o.signal);
      } });
    }, 'slow');
    const result = await generate(manager);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].message, expected);
    assert.ok(calls[0].options.signal.aborted);
  }
});

test('JSON response validation rejects primitives and arrays without TypeError or raw output logging', async t => {
  const { manager } = setup(t, () => {});
  const logs = [];
  for (const level of ['log', 'warn', 'error']) t.mock.method(console, level, (...args) => logs.push(args.join(' ')));
  manager.validateJsonResponse('{"secret":"user-private-sentinel", invalid}', ['ok']);
  for (const content of ['null', 'true', '123', '"private text"', '[]', '{invalid']) {
    const result = manager.validateJsonResponse(content, ['ok']);
    assert.equal(result.isValid, false);
    assert.equal(result.data, null);
    assert.match(result.errors[0], /JSON对象/);
  }
  assert.equal(manager.validateJsonResponse('{"ok":true}', ['ok']).isValid, true);
  assert.doesNotMatch(logs.join('\n'), /user-private-sentinel|private text|原始内容/);
});

test('pre-cancelled analysis never calls upstream', async t => {
  const { manager, calls } = setup(t, () => { throw new Error('must not call'); });
  await assert.rejects(manager.analyzeWithRetry('prompt', ['ok'], 400, { signal: AbortSignal.abort() }), { name: 'AbortError' });
  assert.equal(calls.length, 0);
});

test('cancelling pending analysis aborts its request and skips retries', async t => {
  const { manager, calls } = setup(t, (p, o) => hangUntilAbort(o.signal));
  const controller = new AbortController();
  const work = manager.analyzeWithRetry('prompt', ['ok'], 400, { signal: controller.signal });
  controller.abort();
  await assert.rejects(work, { name: 'AbortError' });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].options.signal.aborted);
});

test('cancelling analysis during backoff prevents a new request', async t => {
  const { manager, calls } = setup(t, () => Promise.reject(new Error('network failure')));
  manager.setRetryConfig({ baseDelay: 200 });
  const controller = new AbortController();
  const work = manager.analyzeWithRetry('prompt', ['ok'], 400, { signal: controller.signal });
  const timer = setTimeout(() => controller.abort(), 5);
  t.after(() => clearTimeout(timer));
  await assert.rejects(work, { name: 'AbortError' });
  assert.equal(calls.length, 1);
});
