import { DocumentReference, Timestamp } from "@google-cloud/firestore";

export const EnclosureType = {
    MARKDOWN: "Markdown",
    INTERACTIVE_CHART: "InteractiveChart",
    GEO_MAP: "GeoMap",
    SLIDESHOW: "Slideshow",
    POLL: "Poll",
    FACTBOX: "Factbox",
    CARD: "Card",
} as const;

export type EnclosureTypeValue = (typeof EnclosureType)[keyof typeof EnclosureType];

export interface Slide {
    imageUrl: string;
    imageAlt: string;
    caption: string;
    credit: string;
}

export interface ColoeusConfig {
    endpoint: string;
    pollId: string;
}

export interface FactboxLink {
    label: string;
    url: string;
}

export const CardTypeValue = {
    LINK: "LINK",
    COVER: "COVER",
    CITATION: "CITATION",
    IMAGE: "IMAGE",
    BLANK: "BLANK",
} as const;

export type CardType = (typeof CardTypeValue)[keyof typeof CardTypeValue];

export interface CardOpenGraph {
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    ogImageWidth?: number;
    ogImageHeight?: number;
}

export interface Enclosure {
    title: string;
    text?: string; // Markdown, Factbox
    description?: string; // InteractiveChart, GeoMap, Slideshow, Card (Link)
    chartFormat?: "PLAIN_DATA" | "ECHARTS"; // InteractiveChart format discriminator
    chart?: Record<string, unknown>; // InteractiveChart (contains data+metadata or echartsConfig+metadata)
    geoJSON?: Record<string, unknown>; // GeoMap
    slides?: Slide[]; // Slideshow
    coloeus?: ColoeusConfig; // Poll
    links?: FactboxLink[]; // Factbox
    // Card fields
    cardType?: CardType;
    visibleAsChapter?: boolean;
    url?: string; // Card (Link)
    openGraph?: CardOpenGraph; // Card (Link)
    coverSource?: "podcast" | "episode"; // Card (Cover)
    quoteText?: string; // Card (Citation)
    citationSource?: string; // Card (Citation)
    citationUrl?: string; // Card (Citation)
    imageUrl?: string; // Card (Image)
    imageAlt?: string; // Card (Image)
    imageLink?: string; // Card (Image)
}

export interface Chapter {
    begin: string;
    gcsName: string;
    enclosureType: EnclosureTypeValue;
}

export interface ChapterDocument {
    version: number;
    createdAt: Timestamp;
    chapters: Chapter[];
}

export interface PodcastMedia {
    url: string;
    type: string;
    length: number;
    checksum: string;
}

export interface PodcastEpisode {
    guid: string;
    title: string;
    artworkUrl?: string;
    link?: string;
    media: PodcastMedia;
}

export interface PodcastOrigin {
    id: string;
    title: string;
    link?: string;
    feedUrl: string;
    artworkUrl?: string;
    episode: PodcastEpisode;
    gcsFeedName: string;
    verified: boolean;
}

export const RichPodState = {
    PUBLISHED: "published",
    DRAFT: "draft",
    DELETED: "deleted",
} as const;

export type RichPodStateType = (typeof RichPodState)[keyof typeof RichPodState];

export { UserRole, type UserRoleValue } from "@richpods/shared/utils/roles";

export const UserState = {
    ACTIVE: "active",
    BLOCKED: "blocked",
} as const;

export type UserStateType = (typeof UserState)[keyof typeof UserState];

export const VerificationRequestState = {
    PENDING: "pending",
    FAILED: "failed",
    VERIFIED: "verified",
} as const;

export type VerificationRequestStateValue =
    (typeof VerificationRequestState)[keyof typeof VerificationRequestState];

export interface UserDocument {
    publicName?: string;
    biography?: string;
    website?: string;
    publicEmail?: string;
    socialAccounts: string[];
    editorLanguage?: string;
    state: UserStateType;
    firebaseUid: string;
    uploadsQuotaBytes?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface RichPodDocument {
    title: string;
    description: string;
    state: RichPodStateType;
    origin: PodcastOrigin;
    editor: DocumentReference;
    isHosted?: boolean;
    hostedEpisodeId?: string;
    publishedAt?: Timestamp | null;
    explicit?: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface VerificationDocument {
    user: DocumentReference;
    feedUrl: string;
    token: string;
    email: string;
    state: VerificationRequestStateValue;
    createdAt: Timestamp;
    verificationTimestamp?: Timestamp;
}

export const UploadType = {
    IMAGE: "image",
} as const;

export type UploadTypeValue = (typeof UploadType)[keyof typeof UploadType];

export interface UploadDocument {
    user: DocumentReference;
    richPod: DocumentReference;
    type: UploadTypeValue;
    mimeType: string;
    extension: string;
    byteSize: number;
    width: number;
    height: number;
    gcsName: string;
    createdAt: Timestamp;
    originalFilename?: string;
}

// --- Hosted Podcasts ---

export const ValidationStatus = {
    PENDING: "pending",
    VALID: "valid",
    INVALID: "invalid",
} as const;

export type ValidationStatusValue = (typeof ValidationStatus)[keyof typeof ValidationStatus];

export interface HostedPodcastDocument {
    title: string;
    description: string;
    link: string;
    language: string;
    itunesCategory: string;
    itunesExplicit: boolean;
    itunesAuthor: string;
    itunesType: string | null;
    copyright: string | null;
    applePodcastsVerifyTxt: string | null;
    gcsCoverImageName: string;
    coverImageMimeType: string;
    editor: DocumentReference;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface HostedEpisodeDocument {
    hostedPodcast: DocumentReference;
    richPod: DocumentReference;
    gcsAudioName: string;
    audioMimeType: string;
    audioByteSize: number;
    audioDurationSeconds: number | null;
    audioBitrate: number | null;
    audioSampleRate: number | null;
    audioChannels: number | null;
    validationStatus: ValidationStatusValue;
    validationError: string | null;
    gcsEpisodeCoverName: string | null;
    episodeCoverMimeType: string | null;
    itunesExplicit: boolean;
    publishedAt: Timestamp | null;
    editor: DocumentReference;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
