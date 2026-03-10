import Joi from "joi";
import { chapterTitleSchema, chapterDescriptionSchema } from "./validator.js";

/**
 * Validation schema for Slideshow enclosure
 *
 * Slideshow chapters display a carousel of images with:
 * - A title
 * - An optional description
 * - 1-50 slides, each with an image, alt text, caption, and credit
 */

const slideSchema = Joi.object({
    imageUrl: Joi.string().uri({ scheme: ["http", "https"] }).required().messages({
        "string.uri": "Slide image URL must be a valid HTTP or HTTPS URL",
        "any.required": "Slide image URL is required",
        "string.empty": "Slide image URL is required",
    }),
    imageAlt: Joi.string().trim().max(500).required().allow("").messages({
        "string.max": "Slide alt text cannot exceed 500 characters",
        "any.required": "Slide alt text is required",
    }),
    caption: Joi.string().trim().max(500).required().allow("").messages({
        "string.max": "Slide caption cannot exceed 500 characters",
        "any.required": "Slide caption is required",
    }),
    credit: Joi.string().trim().max(500).required().allow("").messages({
        "string.max": "Slide credit cannot exceed 500 characters",
        "any.required": "Slide credit is required",
    }),
});

export const slideshowEnclosureSchema = Joi.object({
    title: chapterTitleSchema,
    description: chapterDescriptionSchema,
    slides: Joi.array().items(slideSchema).min(1).max(50).required().messages({
        "array.min": "At least one slide is required",
        "array.max": "Maximum of 50 slides allowed",
        "any.required": "Slides array is required",
    }),
});
