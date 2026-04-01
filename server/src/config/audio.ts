import { parseIntEnv } from "../utils/env.js";

export const audioConfig = {
    rateLimitPerIpPerMinute: parseIntEnv("AUDIO_RATE_LIMIT_PER_IP", 30, { min: 1 }),
};
