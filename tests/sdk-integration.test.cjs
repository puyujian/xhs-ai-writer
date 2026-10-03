const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const OpenAI = require('openai').default;
const { AIManager } = require('../lib/ai-manager.ts');
const { CONFIG } = require('../lib/constants.ts');

// Exercise the real OpenAI SDK against a local fake provider, without real API keys/costs.
test('real SDK: hanging first model is aborted, backup SSE streams successfully', async t => {
  const saved = { ...CONFIG }, originalModel = process.env.AI_MODEL_NAME;
  Object.assign(CONFIG, {
    AI_TIMEOUT_RESPONSE_BUFFER: 20,
    AI_STREAM_MIN_ATTEMPT_TIMEOUT: 50,
    AI_STREAM_TIMEOUT: 200,
    AI_STREAM_FIRST_CHUNK_TIMEOUT: 200,
    AI_STREAM_CONTENT_IDLE_TIMEOUT: 100,
  });
  process.env.AI_MODEL_NAME = 'hang,backup';
  const calls = [];
  let abandoned = false;
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { model } = JSON.parse(body);
    calls.push(model);
    if (model === 'hang') {
      res.on('close', () => { abandoned = true; });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write(`data: ${JSON.stringify({ id: 'test', choices: [{ index: 0, delta: { content: '真实SDK备用正文' }, finish_reason: null }] })}\n\n`);
    res.end('data: [DONE]\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    Object.assign(CONFIG, saved);
    if (originalModel === undefined) delete process.env.AI_MODEL_NAME; else process.env.AI_MODEL_NAME = originalModel;
  });
  const manager = new AIManager();
  manager.client = new OpenAI({
    apiKey: 'local-test-only', baseURL: `http://127.0.0.1:${server.address().port}/v1`, maxRetries: 0,
  });
  const output = [], errors = [];
  await manager.generateStreamWithRetry('test', c => output.push(c), e => errors.push(e), 1200);
  assert.equal(errors.length, 0);
  assert.equal(output.join(''), '真实SDK备用正文');
  assert.deepEqual(calls, ['hang', 'backup']);
  // Request close notification can be delivered after the fallback response.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(abandoned, true);
});
