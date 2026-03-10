import Joi from "joi";

const FORBIDDEN_KEYS = new Set(["prototype", "__proto__", "constructor", "function"]);

/**
 * Recursively checks if an object contains any forbidden property names
 * that could be used for prototype pollution attacks.
 */
const containsForbiddenKey = (value: unknown, path: string[] = []): string | null => {
    if (value === null || typeof value !== "object") {
        return null;
    }

    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const result = containsForbiddenKey(value[i], [...path, `[${i}]`]);
            if (result) return result;
        }
        return null;
    }

    for (const key of Object.keys(value)) {
        if (FORBIDDEN_KEYS.has(key)) {
            const fullPath = [...path, key].join(".");
            return fullPath;
        }
        const result = containsForbiddenKey((value as Record<string, unknown>)[key], [...path, key]);
        if (result) return result;
    }

    return null;
};

/**
 * Creates a Joi schema for validating JSON objects that prevents prototype pollution.
 * Recursively checks all property names to ensure none of the forbidden keys are present:
 * - prototype
 * - __proto__
 * - constructor
 * - function
 */
export const safeJson = (label = "JSON") =>
    Joi.object()
        .custom((value, helpers) => {
            const forbiddenPath = containsForbiddenKey(value);
            if (forbiddenPath) {
                return helpers.error("object.forbiddenKey", { path: forbiddenPath });
            }
            return value;
        })
        .messages({
            "object.forbiddenKey": `"${label}" contains forbidden property name at "{{#path}}"`,
        });
