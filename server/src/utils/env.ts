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

export function parseBoolEnv(envKey: string, defaultValue: boolean): boolean {
    const raw = process.env[envKey]?.trim().toLowerCase();
    if (!raw) {
        return defaultValue;
    }

    return raw === "true" || raw === "1" || raw === "yes";
}

export function parseListEnv(envKey: string, defaultValue: string[]): string[] {
    const raw = process.env[envKey]?.trim();
    if (!raw) {
        return defaultValue;
    }

    const items = raw
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

    return items.length > 0 ? items : defaultValue;
}
