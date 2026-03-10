import Joi from "joi";

/** Shared Joi schema for chapter titles across all enclosure types. */
export const chapterTitleSchema = Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Title is required",
    "string.min": "Title is required",
    "string.max": "Title cannot exceed 200 characters",
    "any.required": "Title is required",
});

/** Shared Joi schema for optional chapter descriptions across all enclosure types. */
export const chapterDescriptionSchema = Joi.string().trim().max(1000).optional().allow("").messages({
    "string.max": "Description cannot exceed 1000 characters",
});

export class ValidationError extends Error {
    public details: string[];

    constructor(message: string, details: string[]) {
        super(message);
        this.name = "ValidationError";
        this.details = details;
    }
}

export function validate<T>(schema: Joi.ObjectSchema, data: any): T {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
    });

    if (error) {
        const details = error.details.map((detail) => detail.message);
        throw new ValidationError("Validation failed", details);
    }

    return value;
}

export function validateField<T = any>(schema: Joi.Schema, data: any, fieldName: string): T {
    const { error, value } = schema.validate(data, {
        convert: true,
    });

    if (error) {
        const details = error.details.map((detail) => `${fieldName}: ${detail.message}`);
        throw new ValidationError(`Validation failed for ${fieldName}`, details);
    }

    return value as T;
}
