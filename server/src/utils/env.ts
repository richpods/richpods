export function parseIntEnv(
    envKey: string,
    defaultValue: number,
    { min }: { min?: number } = {},
): number {
    const raw = process.env[envKey]?.trim();
    if (!raw) {
        return defaultValue;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
        return defaultValue;
    }

    if (min !== undefined && parsed < min) {
        return defaultValue;
    }

    return parsed;
}
