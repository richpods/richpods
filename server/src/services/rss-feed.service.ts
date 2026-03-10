import { encodeXML } from "entities";
import { getHostedPodcastDocById } from "./hosted-podcast.service.js";
import { getPublishedEpisodesForPodcast } from "./hosted-episode.service.js";
import { getHostedPublicUrl } from "./hosted-storage.service.js";
import { db, RICHPODS_COLLECTION } from "../config/firestore.js";
import type { RichPodDocument, HostedEpisodeDocument } from "../types/firestore.js";

const GENERATOR = "RichPods.org";

function formatRfc2822Date(date: Date): string {
    return date.toUTCString();
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function escapeXml(value: string): string {
    return encodeXML(value);
}

/**
 * Build the <itunes:category> XML element.
 * Category format: "Main" or "Main > Sub"
 * The main category wraps the sub-category if present.
 */
function buildCategoryXml(category: string): string {
    const parts = category.split(" > ");
    const mainCategory = escapeXml(parts[0]);

    if (parts.length === 1) {
        return `    <itunes:category text="${mainCategory}"/>`;
    }

    const subCategory = escapeXml(parts[1]);
    return `    <itunes:category text="${mainCategory}">\n      <itunes:category text="${subCategory}"/>\n    </itunes:category>`;
}

function buildPlayerUrl(richPodId: string): string {
    const playerUrlPattern = process.env.VITE_PLAYER_URL_PATTERN || process.env.PLAYER_URL_PATTERN;
    if (playerUrlPattern) {
        return playerUrlPattern.replace("{id}", richPodId);
    }
    return `https://www.richpods.org/listen?id=${richPodId}`;
}

export async function generateRssFeed(podcastId: string): Promise<string | null> {
    const podcastResult = await getHostedPodcastDocById(podcastId);
    if (!podcastResult) {
        return null;
    }

    const { data: podcast } = podcastResult;
    const episodes = await getPublishedEpisodesForPodcast(podcastId);

    const coverUrl = getHostedPublicUrl(podcast.gcsCoverImageName);
    const feedLink = `${process.env.API_BASE_URL || "http://localhost:4000"}/api/v1/hosted/podcast/${podcastId}/feed.xml`;

    // Build episode items
    const items: string[] = [];
    for (const { data: episode, id: episodeId } of episodes) {
        const richPodDoc = await db.collection(RICHPODS_COLLECTION).doc(episode.richPod.id).get();
        const richPod = richPodDoc.exists ? (richPodDoc.data() as RichPodDocument) : null;

        const episodeTitle = richPod?.title || "Untitled";
        const episodeDescription = richPod?.description || "";
        const audioUrl = getHostedPublicUrl(episode.gcsAudioName);
        const playerLink = buildPlayerUrl(episode.richPod.id);
        const pubDate = episode.publishedAt
            ? formatRfc2822Date(episode.publishedAt.toDate())
            : formatRfc2822Date(new Date());
        const duration = episode.audioDurationSeconds
            ? formatDuration(episode.audioDurationSeconds)
            : null;
        const episodeCoverUrl = episode.gcsEpisodeCoverName
            ? getHostedPublicUrl(episode.gcsEpisodeCoverName)
            : null;
        const explicit = richPod?.explicit ? "true" : "false";

        let itemXml = `    <item>
      <guid isPermaLink="false">${escapeXml(episodeId)}</guid>
      <title>${escapeXml(episodeTitle)}</title>
      <enclosure url="${escapeXml(audioUrl)}" type="audio/mpeg" length="${episode.audioByteSize}"/>
      <link>${escapeXml(playerLink)}</link>
      <description>${escapeXml(episodeDescription)}</description>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <itunes:explicit>${explicit}</itunes:explicit>`;

        if (duration) {
            itemXml += `\n      <itunes:duration>${escapeXml(duration)}</itunes:duration>`;
        }

        if (episodeCoverUrl) {
            itemXml += `\n      <itunes:image href="${escapeXml(episodeCoverUrl)}"/>`;
        }

        itemXml += `\n    </item>`;
        items.push(itemXml);
    }

    // Get managing editor email from the podcast owner
    const editorDoc = await podcast.editor.get();
    const editorData = editorDoc.exists ? editorDoc.data() : null;
    const managingEditor = editorData?.publicEmail || null;

    // Build optional fields
    let optionalFields = "";
    if (podcast.copyright) {
        optionalFields += `\n    <copyright>${escapeXml(podcast.copyright)}</copyright>`;
    }
    if (managingEditor) {
        optionalFields += `\n    <managingEditor>${escapeXml(managingEditor)}</managingEditor>`;
    }
    if (podcast.itunesType) {
        optionalFields += `\n    <itunes:type>${escapeXml(podcast.itunesType)}</itunes:type>`;
    }
    if (podcast.applePodcastsVerifyTxt) {
        optionalFields += `\n    <podcast:txt purpose="applepodcastsverify">${escapeXml(podcast.applePodcastsVerifyTxt)}</podcast:txt>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:podcast="https://podcastindex.org/namespace/1.0"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(podcast.title)}</title>
    <description>${escapeXml(podcast.description)}</description>
    <link>${escapeXml(podcast.link)}</link>
    <language>${escapeXml(podcast.language)}</language>
    <generator>${escapeXml(GENERATOR)}</generator>
    <itunes:image href="${escapeXml(coverUrl)}"/>
${buildCategoryXml(podcast.itunesCategory)}
    <itunes:explicit>${podcast.itunesExplicit ? "true" : "false"}</itunes:explicit>
    <itunes:author>${escapeXml(podcast.itunesAuthor)}</itunes:author>
    <podcast:guid>${escapeXml(podcastId)}</podcast:guid>
    <atom:link href="${escapeXml(feedLink)}" rel="self" type="application/rss+xml"/>${optionalFields}
${items.join("\n")}
  </channel>
</rss>`;

    return xml;
}
