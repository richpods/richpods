import { parseIntEnv } from "../utils/env.js";

export const graphqlConfig = {
    maxDepth: parseIntEnv("GRAPHQL_MAX_DEPTH", 12, { min: 1 }),
    rateLimitPerUserPerMinute: parseIntEnv("GRAPHQL_RATE_LIMIT_PER_USER", 200, { min: 1 }),
    rateLimitPerIpPerMinute: parseIntEnv("GRAPHQL_RATE_LIMIT_PER_IP", 500, { min: 1 }),
};
