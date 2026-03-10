import Joi from "joi";
import { chapterTitleSchema } from "./validator.js";

const cardOpenGraphSchema = Joi.object({
    ogTitle: Joi.string().trim().max(500).optional().allow("", null),
    ogDescription: Joi.string().trim().max(2000).optional().allow("", null),
    ogImageUrl: Joi.string()
        .uri({ scheme: ["http", "https"] })
        .max(1000)
        .optional()
        .allow("", null),
    ogImageWidth: Joi.number().integer().min(1).optional().allow(null),
    ogImageHeight: Joi.number().integer().min(1).optional().allow(null),
});

const linkCardSchema = Joi.object({
    title: Joi.when("visibleAsChapter", {
        is: true,
        then: chapterTitleSchema,
        otherwise: Joi.string().trim().max(200).optional().allow("", null),
    }),
    cardType: Joi.string().valid("LINK").required(),
    visibleAsChapter: Joi.boolean().required(),
    url: Joi.string()
        .uri({ scheme: ["http", "https"] })
        .max(500)
        .optional()
        .allow("", null)
        .messages({
            "string.uri": "URL must be a valid HTTP or HTTPS URL",
            "string.max": "URL cannot exceed 500 characters",
        }),
    description: Joi.string().trim().max(1000).optional().allow("", null),
    openGraph: cardOpenGraphSchema.optional().allow(null),
});

const coverCardSchema = Joi.object({
    title: Joi.when("visibleAsChapter", {
        is: true,
        then: chapterTitleSchema,
        otherwise: Joi.string().trim().max(200).optional().allow("", null),
    }),
    cardType: Joi.string().valid("COVER").required(),
    visibleAsChapter: Joi.boolean().required(),
    coverSource: Joi.string().valid("podcast", "episode").required().messages({
        "any.only": "Cover source must be 'podcast' or 'episode'",
        "any.required": "Cover source is required for cover cards",
    }),
});

const citationCardSchema = Joi.object({
    title: Joi.when("visibleAsChapter", {
        is: true,
        then: chapterTitleSchema,
        otherwise: Joi.string().trim().max(200).optional().allow("", null),
    }),
    cardType: Joi.string().valid("CITATION").required(),
    visibleAsChapter: Joi.boolean().required(),
    quoteText: Joi.string().trim().max(1500).optional().allow("", null).messages({
        "string.max": "Quote text cannot exceed 1500 characters",
    }),
    citationSource: Joi.string().trim().max(100).optional().allow("", null).messages({
        "string.max": "Source cannot exceed 100 characters",
    }),
    citationUrl: Joi.string()
        .uri({ scheme: ["http", "https"] })
        .max(500)
        .optional()
        .allow("", null)
        .messages({
            "string.uri": "Citation URL must be a valid HTTP or HTTPS URL",
            "string.max": "Citation URL cannot exceed 500 characters",
        }),
}).custom((value, helpers) => {
    // A link requires a source to be present
    if (value.citationUrl && !value.citationSource) {
        return helpers.error("any.custom", {
            message: "A citation source is required when a link URL is provided",
        });
    }
    return value;
});

const imageCardSchema = Joi.object({
    title: Joi.when("visibleAsChapter", {
        is: true,
        then: chapterTitleSchema,
        otherwise: Joi.string().trim().max(200).optional().allow("", null),
    }),
    cardType: Joi.string().valid("IMAGE").required(),
    visibleAsChapter: Joi.boolean().required(),
    imageUrl: Joi.string()
        .uri({ scheme: ["http", "https"] })
        .optional()
        .allow("", null)
        .messages({
            "string.uri": "Image URL must be a valid HTTP or HTTPS URL",
        }),
    imageAlt: Joi.string().trim().max(500).optional().allow("", null).messages({
        "string.max": "Image alt text cannot exceed 500 characters",
    }),
    imageLink: Joi.string()
        .uri({ scheme: ["http", "https"] })
        .max(500)
        .optional()
        .allow("", null)
        .messages({
            "string.uri": "Image link must be a valid HTTP or HTTPS URL",
            "string.max": "Image link cannot exceed 500 characters",
        }),
});

const blankCardSchema = Joi.object({
    title: Joi.string().valid("[empty card]").required().messages({
        "any.only": "Blank card title must be '[empty card]'",
        "any.required": "Title is required",
    }),
    cardType: Joi.string().valid("BLANK").required(),
    visibleAsChapter: Joi.boolean().valid(false).required().messages({
        "any.only": "Blank cards can only be invisible",
    }),
});

export const cardEnclosureSchema = Joi.alternatives()
    .conditional(".cardType", {
        switch: [
            { is: "LINK", then: linkCardSchema },
            { is: "COVER", then: coverCardSchema },
            { is: "CITATION", then: citationCardSchema },
            { is: "IMAGE", then: imageCardSchema },
            { is: "BLANK", then: blankCardSchema },
        ],
        otherwise: Joi.object({
            cardType: Joi.string()
                .valid("LINK", "COVER", "CITATION", "IMAGE", "BLANK")
                .required()
                .messages({
                    "any.only": "Card type must be one of: LINK, COVER, CITATION, IMAGE, BLANK",
                    "any.required": "Card type is required",
                }),
        }).unknown(true),
    })
    .messages({
        "alternatives.match": "Invalid card data for the specified card type",
    });
