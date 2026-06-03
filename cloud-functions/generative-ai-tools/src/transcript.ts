import Joi from "joi";
import { normalizeTimecode } from "./timecode.js";
import type { Transcript } from "./types.js";

const EMOTIONS = ["Happy", "Sad", "Angry", "Informative", "Neutral"] as const;

// Accepts loose timecode variants (e.g. "mm:ss.mmm" for short episodes) and
// coerces them to canonical "hh:mm:ss.mmm".
const timecodeSchema = Joi.string()
    .custom((value, helpers) => {
        const normalized = normalizeTimecode(value);
        return normalized ?? helpers.error("string.pattern.base");
    }, "timecode hh:mm:ss.mmm")
    .messages({
        "string.pattern.base": "Timestamp must be a valid timecode",
    });

const segmentSchema = Joi.object({
    begin: timecodeSchema.required(),
    end: timecodeSchema.required(),
    text: Joi.string().allow("").required(),
    language: Joi.string().required(),
    emotion: Joi.string()
        .valid(...EMOTIONS)
        .required(),
    speaker: Joi.string().allow("").optional(),
});

export const transcriptSchema = Joi.object({
    summary: Joi.string().allow("").required(),
    language: Joi.string().required(),
    segments: Joi.array().items(segmentSchema).min(1).required(),
});

/**
 * Validate the assembled transcript. Throws on a structurally invalid document
 * so the job is marked failed rather than persisting garbage.
 */
export function validateTranscript(value: unknown): Transcript {
    const { error, value: validated } = transcriptSchema.validate(value, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
    });
    if (error) {
        throw new Error(`Transcript validation failed: ${error.message}`);
    }
    return validated as Transcript;
}
