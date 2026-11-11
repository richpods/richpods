import { parseIntEnv } from "../utils/env.js";

/**
 * Number of reverse proxies in front of the server whose `X-Forwarded-For`
 * entries are trusted when deriving the client IP. Cloud Run adds exactly one.
 */
export const proxyConfig = {
    trustProxyHops: parseIntEnv("TRUST_PROXY_HOPS", 1, { min: 0 }),
};
