/**
 * Tiny in-memory TTL cache for serverless warm instances.
 * Used to skip repeated auth/tenant database round trips on every request.
 * Entries live only as long as the warm function instance; TTL keeps data fresh.
 */
const store = new Map();

export function cacheGet(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function cacheSet(key, value, ttlMs = 60000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (store.size > 5000) {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.expiresAt < now) store.delete(k);
    }
  }
}

export function cacheDelete(key) {
  store.delete(key);
}
