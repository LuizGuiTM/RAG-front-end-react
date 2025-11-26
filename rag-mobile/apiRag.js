const BASE = "http://192.168.15.3:3000"; // IP local do backend
const STREAM_PATH = "/chat";
const RETURN_PATH = "/api/returnMessage";

function buildUrl(path) {
  if (!BASE) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE}${path}`;
}

export async function newSession() {
  const url = buildUrl("/api/new-session");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao criar sessão: ${res.status}`);
  const data = await res.json();
  return data?.clientId;
}

export function streamRag(query, messages = [], { onStart, onChunk, onComplete, onError } = {}) {
  const url = buildUrl(STREAM_PATH);
  const controller = new AbortController();
  let assistantMsg = "";
  let buffer = "";

  (async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, messages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        onError?.(new Error(`Erro no fetch: ${res.status}`));
        return;
      }

      onStart?.();

      // Tenta usar streaming se disponível
      if (res.body && typeof res.body.getReader === 'function') {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          buffer += chunk;
          const events = buffer.split(/(?=event:\send)/g);
          const parts = events[0].split(/(?=data:\s)/g);
          buffer = events.length > 1 && parts.length ? parts.pop() : "";
          for (let part of parts) {
            const dataPayload = part.replace(/^data:\s?/, "");
            if (!dataPayload || dataPayload.trim() === "[DONE]") continue;
            const cleanPayload = dataPayload.replace(/\n\n$/, "");
            assistantMsg += cleanPayload;
            onChunk?.(assistantMsg);
          }
        }
        if (buffer.trim()) {
          const events = buffer.split(/(?=event:\send)/g);
          const parts = events[0].split(/(?=data:\s)/g);
          for (let part of parts) {
            const dataPayload = part.replace(/^data:\s?/, "");
            if (!dataPayload || dataPayload.trim() === "[DONE]") continue;
            const cleanPayload = dataPayload.replace(/\n\n$/, "");
            assistantMsg += cleanPayload;
          }
        }
        onComplete?.(assistantMsg);
      } else {
        // Fallback: consome resposta como texto completo (para React Native)
        const text = await res.text();
        onChunk?.(text);
        onComplete?.(text);
      }
    } catch (err) {
      if (err.name !== "AbortError") onError?.(err);
    }
  })();

  return { close: () => controller.abort() };
}

export async function postReturnMessage(query, clientId) {
  const url = buildUrl(RETURN_PATH);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, clientId }),
  });

  if (!res.ok) throw new Error(`Erro no POST: ${res.status}`);
  return await res.json();
}

export default { newSession, streamRag, postReturnMessage };
