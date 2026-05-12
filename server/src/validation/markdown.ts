import Joi from "joi";
import { chapterTitleSchema } from "./validator.js";
import { noHtml } from "./noHtml.js";

const markdownLinkSchema = Joi.object({
    label: Joi.string().trim().min(1).max(50).required().messages({
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

export const markdownEnclosureSchema = Joi.object({
    title: chapterTitleSchema,
    text: noHtml("text").min(1).max(5000).required().messages({
        "string.empty": "Markdown text is required",
        "string.min": "Markdown text is required",
        "string.max": "Text cannot exceed 5000 characters",
        "any.required": "Markdown text is required",
    }),
    links: Joi.array().items(markdownLinkSchema).max(3).default([]).messages({
        "array.max": "Maximum of 3 call-to-action links allowed",
    }),
});
