import Joi from "joi";
import { chapterTitleSchema } from "./validator.js";

/**
 * Validation schema for Factbox enclosure
 *
 * Factbox chapters display structured information with:
 * - A title
 * - Markdown-formatted text content
 * - 0-3 call-to-action links
 *
 * Note: HTML is stripped at display time using DOMPurify, so we don't
 * need extensive HTML validation here - just length and format validation.
 */

const factboxLinkSchema = Joi.object({
    label: Joi.string()
        .trim()
        .min(1)
        .max(50)
        .required()
        .messages({
            "string.empty": "Link label is required",
            "string.min": "Link label is required",
            "string.max": "Link label cannot exceed 50 characters",
            "any.required": "Link label is required",
        }),
    url: Joi.string()
        .uri({ scheme: ["http", "https"] })
        .required()
        .messages({
            "string.uri": "Link URL must be a valid HTTP or HTTPS URL",
            "any.required": "Link URL is required",
        }),
});

export const factboxEnclosureSchema = Joi.object({
    title: chapterTitleSchema,
    text: Joi.string()
        .trim()
        .min(1)
        .max(5000)
        .required()
        .messages({
            "string.empty": "Factbox text is required",
            "string.min": "Factbox text is required",
            "string.max": "Text cannot exceed 5000 characters",
            "any.required": "Factbox text is required",
        }),
    links: Joi.array()
        .items(factboxLinkSchema)
        .max(3)
        .required()
        .messages({
            "array.max": "Maximum of 3 call-to-action links allowed",
            "any.required": "Links array is required",
        }),
});
