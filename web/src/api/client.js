const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4100/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  providers: () => request('/tutor/providers'),
  listExercises: () => request('/tutor/exercises'),
  getExercise: (slug) => request(`/tutor/exercises/${slug}`),
  saveCode: (slug, body) => request(`/tutor/exercises/${slug}/code`, { method: 'PUT', body }),
  reset: (slug) => request(`/tutor/exercises/${slug}/reset`, { method: 'POST' }),
};

/**
 * Requests a review or the next hint, streaming the response.
 * Returns an abort function so the caller can stop generation.
 */
export function streamFeedback(slug, { code, kind }, { onStart, onDelta, onDone, onError }) {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${BASE}/tutor/exercises/${slug}/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, kind }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const lines = frame.split('\n');
          const eventLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!dataLine) continue;

          const event = eventLine?.slice(6).trim();
          const payload = JSON.parse(dataLine.slice(5).trim());

          if (event === 'start') onStart?.(payload);
          else if (event === 'delta') onDelta?.(payload.delta);
          else if (event === 'error') onError?.(new Error(payload.message));
          else if (event === 'done') onDone?.(payload);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') onError?.(err);
    }
  })();

  return () => controller.abort();
}
