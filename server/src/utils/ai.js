const base = () => process.env.AI_URL || 'http://127.0.0.1:8000';

async function post(path, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(base() + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.AI_PLATFORM_KEY || '' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.detail || `AI service ${r.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const aiChat = (body) => post('/chat', body, 30_000);
export const aiGenerateQuiz = (body) => post('/quiz/generate', body, 120_000);
export const aiInterpretSearch = (body) =>
  post('/search/interpret', body, 30000);