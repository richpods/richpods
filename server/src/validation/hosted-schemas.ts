import Joi from "joi";
import { ITUNES_CATEGORIES } from "@richpods/shared/utils/itunesCategories";

export const createHostedPodcastInputSchema = Joi.object({
    title: Joi.string().trim().min(1).max(500).required(),
    description: Joi.string().trim().min(1).max(2000).required(),
    link: Joi.string().trim().uri().max(1000).optional().allow(null, ""),
    language: Joi.string()
        .trim()
        .pattern(/^[a-z]{2}(-[A-Za-z]{2,})?$/)
        .required(),
    itunesCategory: Joi.string()
        .trim()
        .valid(...ITUNES_CATEGORIES)
        .required(),
    itunesExplicit: Joi.boolean().required(),
    itunesAuthor: Joi.string().trim().min(1).max(500).required(),
    itunesType: Joi.string().trim().valid("episodic", "serial").optional().allow(null, ""),
    copyright: Joi.string().trim().max(500).optional().allow(null, ""),
    applePodcastsVerifyTxt: Joi.string().trim().max(500).optional().allow(null, ""),
});

export const updateHostedPodcastInputSchema = Joi.object({
    title: Joi.string().trim().min(1).max(500).optional(),
    description: Joi.string().trim().min(1).max(2000).optional(),
    link: Joi.string().trim().uri().max(1000).optional().allow(null, ""),
    language: Joi.string()
        .trim()
        .pattern(/^[a-z]{2}(-[A-Za-z]{2,})?$/)
        .optional(),
    itunesCategory: Joi.string()
        .trim()
        .valid(...ITUNES_CATEGORIES)
        .optional(),
    itunesExplicit: Joi.boolean().optional(),
    itunesAuthor: Joi.string().trim().min(1).max(500).optional(),
    itunesType: Joi.string().trim().valid("episodic", "serial").optional().allow(null, ""),
    copyright: Joi.string().trim().max(500).optional().allow(null, ""),
    applePodcastsVerifyTxt: Joi.string().trim().max(500).optional().allow(null, ""),
});
