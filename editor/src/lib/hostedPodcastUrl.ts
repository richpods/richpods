const DEFAULT_PATTERN = "https://www.richpods.org/podcast/{ID}";

export function hostedPodcastWebsiteUrl(podcastId: string): string {
    const pattern =
        (import.meta.env.VITE_WEBSITE_HOSTED_PODCAST_URL_PATTERN as string | undefined) ??
        DEFAULT_PATTERN;
    return pattern.replaceAll("{ID}", podcastId);
}
