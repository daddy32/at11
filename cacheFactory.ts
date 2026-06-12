import NodeCache from "node-cache";

export function createStartupCache(cacheExpiration: number): NodeCache {
    const cache = new NodeCache({
        checkperiod: (cacheExpiration / 2),
        useClones: false
    });

    cache.flushAll();

    return cache;
}
