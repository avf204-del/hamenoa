/** Coalesce concurrent reads and keep pre-invalidation requests out of the cache. */
export function createAsyncCache<T>(load: () => Promise<T>, ttlMs: number) {
  let value: { data: T; expires: number } | undefined;
  let pending: Promise<T> | undefined;
  let revision = 0;
  return {
    clear() { revision++; value = undefined; pending = undefined; },
    get(): Promise<T> {
      if (value && Date.now() < value.expires) return Promise.resolve(value.data);
      if (pending) return pending;
      const generation = revision;
      const request = Promise.resolve().then(load).then((data) => {
        if (revision === generation) value = { data, expires: Date.now() + ttlMs };
        return data;
      }).finally(() => {
        if (pending === request) pending = undefined;
      });
      pending = request;
      return request;
    },
  };
}
