// Tiny in-memory sliding-window limiter for public forms and sign-in. Per-process: fine for one instance
// (see TDD "what I cut": a shared store such as Redis is needed when scaling out).
const hits = new Map();

export function allow(key, limit, windowMs, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
