export interface ImageLike {
    url?: string;
    href?: string;
}

export type ImageValue = string | ImageLike;

export type GuidLike = string | { _: string };

export interface EnclosureHeader {
    url: string;
    type: string;
    length: string;
}

export interface ParsedEpisode {
    title?: string;
    description?: string;
    guid?: GuidLike;
    link?: string;
    pubDate?: string;
    enclosure?: EnclosureHeader;
    image?: ImageValue;
    "itunes:image"?: ImageLike;
}

export interface ParsedPodcast {
    title: string;
    description: string;
    image?: ImageValue;
    link?: string;
    items?: ParsedEpisode[];
}

export interface ITunesResult {
    collectionId: number;
    episodeGuid: string;
    collectionName: string;
    trackName: string;
    artistName: string;
    feedUrl: string;
    artworkUrl100: string;
    artworkUrl600: string;
    releaseDate: string;
    collectionViewUrl: string;
    trackViewUrl: string;
    country: string;
    primaryGenreName: string;
    episodeUrl?: string;
}

export interface ITunesSearchResponse {
    resultCount: number;
    results: ITunesResult[];
}

