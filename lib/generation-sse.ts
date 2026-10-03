/** Read this API's SSE protocol, retaining partial UTF-8/JSON lines across reads. */
export async function readGenerationStream(
  body: ReadableStream<Uint8Array>,
  onContent: (content: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedContent = false;
  let completed = false;

  const readLine = (line: string) => {
    if (!line.startsWith('data:')) return; // SSE comments/heartbeat
    const data = line.slice(5).trim();
    if (data === '[DONE]') {
      if (!receivedContent) throw new Error('生成结束，但未收到有效内容，请重试');
      completed = true;
      return;
    }
    if (!data) return;
    let parsed: { content?: unknown; error?: unknown };
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new Error('生成响应格式异常，请重试');
    }
    if (!parsed || typeof parsed !== 'object') throw new Error('生成响应格式异常，请重试');
    if (typeof parsed.error === 'string' && parsed.error) throw new Error(parsed.error);
    if (typeof parsed.content === 'string') {
      if (parsed.content.trim()) receivedContent = true;
      onContent(parsed.content);
    }
  };

  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    while (!completed) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        readLine(line);
        if (completed) break;
      }
      if (done) {
        if (!completed && buffer.trim()) readLine(buffer);
        if (!completed) throw new Error('生成连接提前结束，内容可能不完整，请重试');
        break;
      }
      if (buffer.length > 1024 * 1024) throw new Error('生成响应过大，请重试');
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    try { await reader.cancel(); } catch { /* The remote side may already be closed. */ }
    reader.releaseLock();
  }
}
