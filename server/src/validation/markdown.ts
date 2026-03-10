import Joi from "joi";
import { chapterTitleSchema } from "./validator.js";
import { noHtml } from "./noHtml.js";

/**
 * Validation schema for Markdown enclosure
 *
 * Markdown chapters display rich text content with:
 * - A title
 * - Markdown-formatted text (no raw HTML allowed)
 */
export const markdownEnclosureSchema = Joi.object({
    title: chapterTitleSchema,
    text: noHtml("text")
        .min(1)
        .required()
        .messages({
            "string.empty": "Markdown text is required",
            "string.min": "Markdown text is required",
            "any.required": "Markdown text is required",
        }),
});
