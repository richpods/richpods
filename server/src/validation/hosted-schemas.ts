import Joi from "joi";
import { ITUNES_CATEGORIES } from "@richpods/shared/utils/itunesCategories";

const APPLE_PODCASTS_URL_PATTERN = /^https:\/\/(itunes|podcasts)\.apple\.com\//i;
const SPOTIFY_URL_PATTERN = /^https:\/\/open\.spotify\.com\//i;
const YOUTUBE_MUSIC_URL_PATTERN = /^https:\/\/(www|music)\.youtube\.com\//i;
// Amazon Music regional TLDs. Multi-level TLDs must come before their single-level
// counterparts in the alternation so the longer match is preferred.
const AMAZON_MUSIC_URL_PATTERN =
    /^https:\/\/music\.amazon\.(co\.za|com\.br|com\.mx|co\.jp|com\.tr|com\.be|co\.uk|com\.au|com|eg|ca|cn|in|sa|sg|ae|fr|de|ie|it|nl|pl|es|se)\//i;

function platformUrl(pattern: RegExp) {
    return Joi.string().trim().uri().max(1000).pattern(pattern).optional().allow(null, "");
}

export const createHostedPodcastInputSchema = Joi.object({
    title: Joi.string().trim().min(1).max(500).required(),
    description: Joi.string().trim().min(1).max(2000).required(),
    link: Joi.when("customWebsite", {
        is: true,
        then: Joi.string().trim().uri().min(1).max(1000).required(),
        otherwise: Joi.string().trim().uri().max(1000).optional().allow(null, ""),
    }),
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
    customWebsite: Joi.boolean().optional(),
    platformLinkApplePodcasts: platformUrl(APPLE_PODCASTS_URL_PATTERN),
    platformLinkSpotify: platformUrl(SPOTIFY_URL_PATTERN),
    platformLinkAmazonMusic: platformUrl(AMAZON_MUSIC_URL_PATTERN),
    platformLinkYouTubeMusic: platformUrl(YOUTUBE_MUSIC_URL_PATTERN),
});

export const createEpisodeSchema = Joi.object({
    audioByteSize: Joi.number().integer().positive().required(),
});

export const updateHostedPodcastInputSchema = Joi.object({
    title: Joi.string().trim().min(1).max(500).optional(),
    description: Joi.string().trim().min(1).max(2000).optional(),
    // When the client flips customWebsite to true in this update, link must be
    // sent in the same request with a valid non-empty URL. If customWebsite is not
    // part of the update, link is plain-optional.
    link: Joi.when("customWebsite", {
        is: true,
        then: Joi.string().trim().uri().min(1).max(1000).required(),
        otherwise: Joi.string().trim().uri().max(1000).optional().allow(null, ""),
    }),
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
    customWebsite: Joi.boolean().optional(),
    platformLinkApplePodcasts: platformUrl(APPLE_PODCASTS_URL_PATTERN),
    platformLinkSpotify: platformUrl(SPOTIFY_URL_PATTERN),
    platformLinkAmazonMusic: platformUrl(AMAZON_MUSIC_URL_PATTERN),
    platformLinkYouTubeMusic: platformUrl(YOUTUBE_MUSIC_URL_PATTERN),
});
