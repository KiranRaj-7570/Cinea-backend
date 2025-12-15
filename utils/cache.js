import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 600,      // 10 minutes
  checkperiod: 120,
});

export const getCache = (key) => cache.get(key);
export const setCache = (key, value, ttl = 600) => cache.set(key, value, ttl);
export const delCache = (key) => cache.del(key);