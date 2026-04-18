export type PublicHostedPodcast = {
    id: string;
    title: string;
    description: string;
    link: string;
    language: string;
    itunesCategory: string;
    itunesExplicit: boolean;
    itunesAuthor: string;
    itunesType: string | null;
    copyright: string | null;
    customWebsite: boolean;
    platformLinkApplePodcasts: string | null;
    platformLinkSpotify: string | null;
    platformLinkAmazonMusic: string | null;
    platformLinkYouTubeMusic: string | null;
    coverImageUrl: string;
    feedUrl: string;
};

export type PublicHostedEpisode = {
    id: string;
    richPodId: string;
    title: string;
    description: string;
    publishedAt: string;
    explicit: boolean;
    audioDurationSeconds: number | null;
    episodeCoverUrl: string | null;
};

export type PaginatedEpisodes = {
    items: PublicHostedEpisode[];
    nextCursor: string | null;
};

export type GraphQLResponse<T> = {
    data?: T | null;
    errors?: Array<{ message?: string | null }> | null;
};
