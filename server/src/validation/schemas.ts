import Joi from "joi";
import { toASCII } from "node:punycode";
import { EnclosureType } from "../types/firestore.js";
import { interactiveChartEnclosureSchema } from "./interactiveChart.js";
import { geoMapEnclosureSchema } from "./geoMap.js";
import { pollEnclosureSchema } from "./poll.js";
import { factboxEnclosureSchema } from "./factbox.js";
import { markdownEnclosureSchema } from "./markdown.js";
import { slideshowEnclosureSchema } from "./slideshow.js";
import { cardEnclosureSchema } from "./card.js";

// Helper: validate http/https URLs and allow internationalized domains (IDN)
const httpUrlUnicode = () =>
    Joi.string().custom((value, helpers) => {
        try {
            const u = new URL(value);
            if (u.protocol !== "http:" && u.protocol !== "https:") {
                return helpers.error("string.uri");
            }
            // Attempt to convert hostname to punycode; empty/invalid becomes invalid
            const ascii = toASCII(u.hostname);
            if (!ascii) return helpers.error("string.uri");
            return value;
        } catch {
            return helpers.error("string.uri");
        }
    }, "http/https URL with IDN support");

// Authentication schemas
export const signUpInputSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(8).required().messages({
        "string.min": "Password must be at least 8 characters long",
        "any.required": "Password is required",
    }),
});

export const signInInputSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
        "any.required": "Password is required",
    }),
});

export const googleIdTokenSchema = Joi.object({
    idToken: Joi.string().required().messages({
        "any.required": "Google ID token is required",
        "string.empty": "Google ID token cannot be empty",
    }),
});

// Profile schemas
export const updateProfileInputSchema = Joi.object({
    publicName: Joi.string().max(50).optional().messages({
        "string.max": "Public name cannot exceed 50 characters",
    }),
    biography: Joi.string().max(500).optional().messages({
        "string.max": "Biography cannot exceed 500 characters",
    }),
    website: httpUrlUnicode().optional().messages({
        "string.uri": "Please provide a valid URL for website",
    }),
    publicEmail: Joi.string().email().optional().messages({
        "string.email": "Please provide a valid email address for public email",
    }),
    editorLanguage: Joi.string().valid("en", "de").optional().messages({
        "any.only": "Editor language must be one of: en, de",
    }),
    socialAccounts: Joi.array()
        .items(
            httpUrlUnicode().messages({
                "string.uri": "Social account URLs must be valid URLs",
            }),
        )
        .max(10)
        .optional()
        .messages({
            "array.max": "Cannot have more than 10 social accounts",
        }),
});

// RichPod schemas
export const podcastMediaInputSchema = Joi.object({
    url: httpUrlUnicode().required().messages({
        "string.uri": "Media URL must be a valid URL",
        "any.required": "Media URL is required",
    }),
    type: Joi.string()
        .valid(
            "audio/mpeg",
            "audio/mp3",
            "audio/mp4",
            "audio/m4a",
            "audio/wav",
            "audio/ogg",
            "audio/aac",
            "audio/flac",
            "audio/x-m4a",
        )
        .required()
        .messages({
            "any.only":
                "Media type must be a valid audio format: audio/mpeg, audio/mp3, audio/mp4, audio/m4a, audio/wav, audio/ogg, audio/aac, audio/flac, audio/x-m4a",
            "any.required": "Media type is required",
        }),
    length: Joi.number().integer().min(1).required().messages({
        "number.base": "Media length must be a number",
        "number.integer": "Media length must be an integer",
        "number.min": "Media length must be greater than 0",
        "any.required": "Media length is required",
    }),
    checksum: Joi.string().required().messages({
        "any.required": "Media checksum is required",
        "string.empty": "Media checksum cannot be empty",
    }),
});

export const podcastEpisodeInputSchema = Joi.object({
    guid: Joi.string().required().messages({
        "any.required": "Episode GUID is required",
        "string.empty": "Episode GUID cannot be empty",
    }),
    title: Joi.string().required().messages({
        "any.required": "Episode title is required",
        "string.empty": "Episode title cannot be empty",
    }),
    artworkUrl: httpUrlUnicode().optional().messages({
        "string.uri": "Episode artwork URL must be a valid URL",
    }),
    link: httpUrlUnicode().optional().allow("").messages({
        "string.uri": "Episode link must be a valid URL",
    }),
    media: podcastMediaInputSchema.required(),
});

export const podcastOriginInputSchema = Joi.object({
    title: Joi.string().required().messages({
        "any.required": "Podcast title is required",
        "string.empty": "Podcast title cannot be empty",
    }),
    link: httpUrlUnicode().optional().allow("").messages({
        "string.uri": "Podcast link must be a valid URL",
    }),
    feedUrl: httpUrlUnicode().required().messages({
        "string.uri": "Feed URL must be a valid URL",
        "any.required": "Feed URL is required",
    }),
    artworkUrl: httpUrlUnicode().optional().messages({
        "string.uri": "Podcast artwork URL must be a valid URL",
    }),
    episode: podcastEpisodeInputSchema.required(),
});

export const createRichPodInputSchema = Joi.object({
    title: Joi.string().min(1).max(200).required().messages({
        "string.min": "Title cannot be empty",
        "string.max": "Title cannot exceed 200 characters",
        "any.required": "Title is required",
    }),
    description: Joi.string().min(1).max(1000).required().messages({
        "string.min": "Description cannot be empty",
        "string.max": "Description cannot exceed 1000 characters",
        "any.required": "Description is required",
    }),
    origin: podcastOriginInputSchema.required(),
});

export const updateRichPodInputSchema = Joi.object({
    title: Joi.string().min(1).max(200).optional().messages({
        "string.min": "Title cannot be empty",
        "string.max": "Title cannot exceed 200 characters",
    }),
    description: Joi.string().min(1).max(1000).optional().messages({
        "string.min": "Description cannot be empty",
        "string.max": "Description cannot exceed 1000 characters",
    }),
    state: Joi.string().valid("draft", "published").optional().messages({
        "any.only": "State must be either 'draft' or 'published'",
    }),
    explicit: Joi.boolean().optional(),
})
    .min(1)
    .messages({
        "object.min": "At least one field must be provided for update",
    });

// ID validation
export const idSchema = Joi.string().required().messages({
    "any.required": "ID is required",
    "string.empty": "ID cannot be empty",
});

// Public query schemas
export const recentPublishedLimitSchema = Joi.number().integer().min(1).max(100).default(24).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
});

// Podcast schemas
export const urlSchema = httpUrlUnicode().required().messages({
    "string.uri": "URL must be a valid URL",
    "any.required": "URL is required",
});

export const podcastSearchSchema = Joi.object({
    query: Joi.string().min(1).max(500).required().messages({
        "string.min": "Search query cannot be empty",
        "string.max": "Search query cannot exceed 500 characters",
        "any.required": "Search query is required",
    }),
    country: Joi.string().length(2).optional().messages({
        "string.length": "Country code must be 2 characters",
    }),
    language: Joi.string().length(2).optional().messages({
        "string.length": "Language code must be 2 characters",
    }),
});

export const podcastMetadataSchema = Joi.object({
    feedUrl: httpUrlUnicode().required().messages({
        "string.uri": "Feed URL must be a valid URL",
        "any.required": "Feed URL is required",
    }),
    episodeGuid: Joi.string().optional().messages({
        "string.empty": "Episode GUID cannot be empty if provided",
    }),
});

// Chapters update schemas
export const timestampSchema = Joi.string()
    .pattern(/^\d{2,}:[0-5][0-9]:[0-5][0-9]\.\d{3}$/)
    .messages({
        "string.pattern.base": "Timestamp must be in the format hh:mm:ss.mmm",
    });

export const chapterInputSchema = Joi.object({
    begin: timestampSchema.required(),
    enclosureType: Joi.string()
        .valid(
            EnclosureType.MARKDOWN,
            EnclosureType.INTERACTIVE_CHART,
            EnclosureType.GEO_MAP,
            EnclosureType.SLIDESHOW,
            EnclosureType.POLL,
            EnclosureType.FACTBOX,
            EnclosureType.CARD,
        )
        .required(),
    enclosure: Joi.when("enclosureType", {
        switch: [
            {
                is: EnclosureType.MARKDOWN,
                then: markdownEnclosureSchema.required(),
            },
            {
                is: EnclosureType.INTERACTIVE_CHART,
                then: interactiveChartEnclosureSchema.required(),
            },
            {
                is: EnclosureType.GEO_MAP,
                then: geoMapEnclosureSchema.required(),
            },
            {
                is: EnclosureType.SLIDESHOW,
                then: slideshowEnclosureSchema.required(),
            },
            {
                is: EnclosureType.POLL,
                then: pollEnclosureSchema.required(),
            },
            {
                is: EnclosureType.FACTBOX,
                then: factboxEnclosureSchema.required(),
            },
            {
                is: EnclosureType.CARD,
                then: cardEnclosureSchema.required(),
            },
        ],
    }).messages({
        "any.required": "Enclosure JSON is required",
    }),
});

export const setChaptersInputSchema = Joi.object({
    chapters: Joi.array().items(chapterInputSchema).min(0).required(),
});

export const startVerificationSchema = Joi.object({
    feedUrl: httpUrlUnicode().required().messages({
        "string.uri": "Feed URL must be a valid URL",
        "any.required": "Feed URL is required",
    }),
});

export const completeVerificationSchema = Joi.object({
    feedUrl: httpUrlUnicode().required().messages({
        "string.uri": "Feed URL must be a valid URL",
        "any.required": "Feed URL is required",
    }),
    code: Joi.string()
        .pattern(/^\d{8}$/)
        .required()
        .messages({
            "string.pattern.base": "Verification code must be 8 digits",
            "any.required": "Verification code is required",
        }),
});

// Pagination schemas
export const paginationFirstSchema = Joi.number().integer().min(1).max(100);
export const paginationAfterSchema = Joi.string().optional().allow(null);
export const richPodStateFilterSchema = Joi.string().valid("draft", "published").optional().allow(null);
