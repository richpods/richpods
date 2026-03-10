import type { GraphQLClient, RequestOptions } from "graphql-request";
import gql from "graphql-tag";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
    [_ in K]?: never;
};
export type Incremental<T> =
    | T
    | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions["requestHeaders"];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    GeoJSON: { input: any; output: any };
    JSON: { input: any; output: any };
};

export type AuthPayload = {
    __typename?: "AuthPayload";
    token: Scalars["String"]["output"];
    user: User;
};

export type BaseEnclosure = {
    title: Scalars["String"]["output"];
};

export type Card = BaseEnclosure & {
    __typename?: "Card";
    cardType: CardType;
    /** Citation card: attribution source */
    citationSource?: Maybe<Scalars["String"]["output"]>;
    /** Citation card: optional link URL */
    citationUrl?: Maybe<Scalars["String"]["output"]>;
    /** Cover card: resolved artwork URL */
    coverImageUrl?: Maybe<Scalars["String"]["output"]>;
    /** Cover card: 'podcast' or 'episode' */
    coverSource?: Maybe<Scalars["String"]["output"]>;
    /** Link card: optional description */
    description?: Maybe<Scalars["String"]["output"]>;
    /** Image card: alt text for accessibility */
    imageAlt?: Maybe<Scalars["String"]["output"]>;
    /** Image card: optional link wrapping the image */
    imageLink?: Maybe<Scalars["String"]["output"]>;
    /** Image card: uploaded image URL */
    imageUrl?: Maybe<Scalars["String"]["output"]>;
    /** Link card: parsed Open Graph metadata */
    openGraph?: Maybe<CardOpenGraph>;
    /** Citation card: the quoted text */
    quoteText?: Maybe<Scalars["String"]["output"]>;
    title: Scalars["String"]["output"];
    /** Link card: the external URL */
    url?: Maybe<Scalars["String"]["output"]>;
    visibleAsChapter: Scalars["Boolean"]["output"];
};

export type CardOpenGraph = {
    __typename?: "CardOpenGraph";
    ogDescription?: Maybe<Scalars["String"]["output"]>;
    ogImageHeight?: Maybe<Scalars["Int"]["output"]>;
    ogImageUrl?: Maybe<Scalars["String"]["output"]>;
    ogImageWidth?: Maybe<Scalars["Int"]["output"]>;
    ogTitle?: Maybe<Scalars["String"]["output"]>;
};

export const CardType = {
    Blank: "BLANK",
    Citation: "CITATION",
    Cover: "COVER",
    Image: "IMAGE",
    Link: "LINK",
} as const;

export type CardType = (typeof CardType)[keyof typeof CardType];
export type Chapter = {
    __typename?: "Chapter";
    begin: Scalars["String"]["output"];
    enclosure: Enclosure;
};

export type ChapterInput = {
    begin: Scalars["String"]["input"];
    enclosure: Scalars["JSON"]["input"];
    enclosureType: EnclosureType;
};

export const ChartFormat = {
    Echarts: "ECHARTS",
    PlainData: "PLAIN_DATA",
} as const;

export type ChartFormat = (typeof ChartFormat)[keyof typeof ChartFormat];
export type Coloeus = {
    __typename?: "Coloeus";
    endpoint: Scalars["String"]["output"];
    pollId: Scalars["String"]["output"];
};

export type CreateHostedPodcastInput = {
    applePodcastsVerifyTxt?: InputMaybe<Scalars["String"]["input"]>;
    copyright?: InputMaybe<Scalars["String"]["input"]>;
    description: Scalars["String"]["input"];
    itunesAuthor: Scalars["String"]["input"];
    itunesCategory: Scalars["String"]["input"];
    itunesExplicit: Scalars["Boolean"]["input"];
    itunesType?: InputMaybe<Scalars["String"]["input"]>;
    language: Scalars["String"]["input"];
    link?: InputMaybe<Scalars["String"]["input"]>;
    title: Scalars["String"]["input"];
};

export type CreateRichPodInput = {
    description: Scalars["String"]["input"];
    origin: PodcastOriginInput;
    title: Scalars["String"]["input"];
};

export type Enclosure = Card | Factbox | GeoMap | InteractiveChart | Markdown | Poll | Slideshow;

export const EnclosureType = {
    Card: "Card",
    Factbox: "Factbox",
    GeoMap: "GeoMap",
    InteractiveChart: "InteractiveChart",
    Markdown: "Markdown",
    Poll: "Poll",
    Slideshow: "Slideshow",
} as const;

export type EnclosureType = (typeof EnclosureType)[keyof typeof EnclosureType];
export type EpisodeInfo = {
    __typename?: "EpisodeInfo";
    artwork: Scalars["String"]["output"];
    checksum: Scalars["String"]["output"];
    guid: Scalars["String"]["output"];
    length: Scalars["Int"]["output"];
    link: Scalars["String"]["output"];
    publicationDate: Scalars["String"]["output"];
    title: Scalars["String"]["output"];
    type: Scalars["String"]["output"];
    url: Scalars["String"]["output"];
};

export type Factbox = BaseEnclosure & {
    __typename?: "Factbox";
    links: Array<FactboxLink>;
    text: Scalars["String"]["output"];
    title: Scalars["String"]["output"];
};

export type FactboxLink = {
    __typename?: "FactboxLink";
    label: Scalars["String"]["output"];
    url: Scalars["String"]["output"];
};

export type GeoMap = BaseEnclosure & {
    __typename?: "GeoMap";
    description?: Maybe<Scalars["String"]["output"]>;
    geoJSON: Scalars["GeoJSON"]["output"];
    title: Scalars["String"]["output"];
};

export type HostedEpisode = {
    __typename?: "HostedEpisode";
    audioBitrate?: Maybe<Scalars["Int"]["output"]>;
    audioByteSize: Scalars["Int"]["output"];
    audioChannels?: Maybe<Scalars["Int"]["output"]>;
    audioDurationSeconds?: Maybe<Scalars["Float"]["output"]>;
    audioSampleRate?: Maybe<Scalars["Int"]["output"]>;
    audioUrl: Scalars["String"]["output"];
    createdAt: Scalars["String"]["output"];
    episodeCoverUrl?: Maybe<Scalars["String"]["output"]>;
    hostedPodcastId: Scalars["ID"]["output"];
    id: Scalars["ID"]["output"];
    itunesExplicit: Scalars["Boolean"]["output"];
    publishedAt?: Maybe<Scalars["String"]["output"]>;
    richPodId: Scalars["ID"]["output"];
    updatedAt: Scalars["String"]["output"];
    validationError?: Maybe<Scalars["String"]["output"]>;
    validationStatus: HostedEpisodeValidationStatus;
};

export const HostedEpisodeValidationStatus = {
    Invalid: "invalid",
    Pending: "pending",
    Valid: "valid",
} as const;

export type HostedEpisodeValidationStatus =
    (typeof HostedEpisodeValidationStatus)[keyof typeof HostedEpisodeValidationStatus];
export type HostedPodcast = {
    __typename?: "HostedPodcast";
    applePodcastsVerifyTxt?: Maybe<Scalars["String"]["output"]>;
    copyright?: Maybe<Scalars["String"]["output"]>;
    coverImageUrl: Scalars["String"]["output"];
    createdAt: Scalars["String"]["output"];
    description: Scalars["String"]["output"];
    episodeCount: Scalars["Int"]["output"];
    feedUrl: Scalars["String"]["output"];
    id: Scalars["ID"]["output"];
    itunesAuthor: Scalars["String"]["output"];
    itunesCategory: Scalars["String"]["output"];
    itunesExplicit: Scalars["Boolean"]["output"];
    itunesType?: Maybe<Scalars["String"]["output"]>;
    language: Scalars["String"]["output"];
    link: Scalars["String"]["output"];
    title: Scalars["String"]["output"];
    updatedAt: Scalars["String"]["output"];
};

export type InstanceInfo = {
    __typename?: "InstanceInfo";
    commitHash: Scalars["String"]["output"];
    serverVersion: Scalars["String"]["output"];
    version: Scalars["String"]["output"];
};

export type InteractiveChart = BaseEnclosure & {
    __typename?: "InteractiveChart";
    chart: Scalars["JSON"]["output"];
    chartFormat: ChartFormat;
    description?: Maybe<Scalars["String"]["output"]>;
    title: Scalars["String"]["output"];
};

export type Markdown = BaseEnclosure & {
    __typename?: "Markdown";
    text: Scalars["String"]["output"];
    title: Scalars["String"]["output"];
};

export type Mutation = {
    __typename?: "Mutation";
    completeRichPodVerification: Verification;
    createRichPod: RichPod;
    deleteHostedEpisode: Scalars["Boolean"]["output"];
    deleteHostedPodcast: Scalars["Boolean"]["output"];
    deleteRichPod: Scalars["Boolean"]["output"];
    setRichPodChapters: RichPod;
    signIn: AuthPayload;
    signInWithGoogle: AuthPayload;
    signUp: AuthPayload;
    startRichPodVerification: Verification;
    updateHostedPodcast: HostedPodcast;
    updateProfile: User;
    updateRichPod: RichPod;
};

export type MutationCompleteRichPodVerificationArgs = {
    code: Scalars["String"]["input"];
    feedUrl: Scalars["String"]["input"];
};

export type MutationCreateRichPodArgs = {
    input: CreateRichPodInput;
};

export type MutationDeleteHostedEpisodeArgs = {
    id: Scalars["ID"]["input"];
};

export type MutationDeleteHostedPodcastArgs = {
    id: Scalars["ID"]["input"];
};

export type MutationDeleteRichPodArgs = {
    id: Scalars["ID"]["input"];
};

export type MutationSetRichPodChaptersArgs = {
    chapters: Array<ChapterInput>;
    id: Scalars["ID"]["input"];
};

export type MutationSignInArgs = {
    input: SignInInput;
};

export type MutationSignInWithGoogleArgs = {
    idToken: Scalars["String"]["input"];
};

export type MutationSignUpArgs = {
    input: SignUpInput;
};

export type MutationStartRichPodVerificationArgs = {
    feedUrl: Scalars["String"]["input"];
};

export type MutationUpdateHostedPodcastArgs = {
    id: Scalars["ID"]["input"];
    input: UpdateHostedPodcastInput;
};

export type MutationUpdateProfileArgs = {
    input: UpdateProfileInput;
};

export type MutationUpdateRichPodArgs = {
    id: Scalars["ID"]["input"];
    input: UpdateRichPodInput;
};

export type PaginatedHostedEpisodes = {
    __typename?: "PaginatedHostedEpisodes";
    items: Array<HostedEpisode>;
    nextCursor?: Maybe<Scalars["String"]["output"]>;
};

export type PaginatedHostedPodcasts = {
    __typename?: "PaginatedHostedPodcasts";
    items: Array<HostedPodcast>;
    nextCursor?: Maybe<Scalars["String"]["output"]>;
};

export type PaginatedRichPods = {
    __typename?: "PaginatedRichPods";
    items: Array<RichPod>;
    nextCursor?: Maybe<Scalars["String"]["output"]>;
};

export type PaginatedVerifications = {
    __typename?: "PaginatedVerifications";
    items: Array<Verification>;
    nextCursor?: Maybe<Scalars["String"]["output"]>;
};

export type PodcastEpisode = {
    __typename?: "PodcastEpisode";
    artworkUrl?: Maybe<Scalars["String"]["output"]>;
    guid: Scalars["String"]["output"];
    link?: Maybe<Scalars["String"]["output"]>;
    media: PodcastMedia;
    title: Scalars["String"]["output"];
};

export type PodcastEpisodeInput = {
    artworkUrl?: InputMaybe<Scalars["String"]["input"]>;
    guid: Scalars["String"]["input"];
    link?: InputMaybe<Scalars["String"]["input"]>;
    media: PodcastMediaInput;
    title: Scalars["String"]["input"];
};

export type PodcastEpisodeSearchResult = {
    __typename?: "PodcastEpisodeSearchResult";
    artwork?: Maybe<Scalars["String"]["output"]>;
    creator?: Maybe<Scalars["String"]["output"]>;
    date?: Maybe<Scalars["String"]["output"]>;
    episodeGuid?: Maybe<Scalars["String"]["output"]>;
    episodeTitle: Scalars["String"]["output"];
    episodeUrl?: Maybe<Scalars["String"]["output"]>;
    feedUrl: Scalars["String"]["output"];
    genre?: Maybe<Scalars["String"]["output"]>;
    podcastTitle: Scalars["String"]["output"];
};

export type PodcastInfo = {
    __typename?: "PodcastInfo";
    artwork: Scalars["String"]["output"];
    description: Scalars["String"]["output"];
    link: Scalars["String"]["output"];
    title: Scalars["String"]["output"];
};

export type PodcastMedia = {
    __typename?: "PodcastMedia";
    checksum: Scalars["String"]["output"];
    length: Scalars["Int"]["output"];
    type: Scalars["String"]["output"];
    url: Scalars["String"]["output"];
};

export type PodcastMediaInput = {
    checksum: Scalars["String"]["input"];
    length: Scalars["Int"]["input"];
    type: Scalars["String"]["input"];
    url: Scalars["String"]["input"];
};

export type PodcastMetadata = {
    __typename?: "PodcastMetadata";
    episodes: Array<EpisodeInfo>;
    podcast: PodcastInfo;
};

export type PodcastOrigin = {
    __typename?: "PodcastOrigin";
    artworkUrl?: Maybe<Scalars["String"]["output"]>;
    episode: PodcastEpisode;
    feedUrl: Scalars["String"]["output"];
    id: Scalars["ID"]["output"];
    link?: Maybe<Scalars["String"]["output"]>;
    title: Scalars["String"]["output"];
    verified: Scalars["Boolean"]["output"];
};

export type PodcastOriginInput = {
    artworkUrl?: InputMaybe<Scalars["String"]["input"]>;
    episode: PodcastEpisodeInput;
    feedUrl: Scalars["String"]["input"];
    link?: InputMaybe<Scalars["String"]["input"]>;
    title: Scalars["String"]["input"];
};

export type Poll = {
    __typename?: "Poll";
    coloeus: Coloeus;
};

export type Query = {
    __typename?: "Query";
    currentUser?: Maybe<User>;
    extractFeedUrl: Scalars["String"]["output"];
    hostedEpisode?: Maybe<HostedEpisode>;
    hostedEpisodes: PaginatedHostedEpisodes;
    hostedPodcast?: Maybe<HostedPodcast>;
    hostedPodcasts: PaginatedHostedPodcasts;
    instanceInfo: InstanceInfo;
    podcastEpisodeSearch: Array<PodcastEpisodeSearchResult>;
    podcastMetadata: PodcastMetadata;
    recentPublishedRichPods: PaginatedRichPods;
    richPod?: Maybe<RichPod>;
    user?: Maybe<User>;
    userRichPods: PaginatedRichPods;
    userVerifications: PaginatedVerifications;
};

export type QueryExtractFeedUrlArgs = {
    url: Scalars["String"]["input"];
};

export type QueryHostedEpisodeArgs = {
    id: Scalars["ID"]["input"];
};

export type QueryHostedEpisodesArgs = {
    after?: InputMaybe<Scalars["String"]["input"]>;
    first?: InputMaybe<Scalars["Int"]["input"]>;
    podcastId: Scalars["ID"]["input"];
};

export type QueryHostedPodcastArgs = {
    id: Scalars["ID"]["input"];
};

export type QueryHostedPodcastsArgs = {
    after?: InputMaybe<Scalars["String"]["input"]>;
    first?: InputMaybe<Scalars["Int"]["input"]>;
};

export type QueryPodcastEpisodeSearchArgs = {
    country?: InputMaybe<Scalars["String"]["input"]>;
    language?: InputMaybe<Scalars["String"]["input"]>;
    query: Scalars["String"]["input"];
};

export type QueryPodcastMetadataArgs = {
    episodeGuid?: InputMaybe<Scalars["String"]["input"]>;
    feedUrl: Scalars["String"]["input"];
};

export type QueryRecentPublishedRichPodsArgs = {
    after?: InputMaybe<Scalars["String"]["input"]>;
    first?: InputMaybe<Scalars["Int"]["input"]>;
};

export type QueryRichPodArgs = {
    id: Scalars["ID"]["input"];
};

export type QueryUserArgs = {
    id: Scalars["ID"]["input"];
};

export type QueryUserRichPodsArgs = {
    after?: InputMaybe<Scalars["String"]["input"]>;
    first?: InputMaybe<Scalars["Int"]["input"]>;
    state?: InputMaybe<RichPodState>;
};

export type QueryUserVerificationsArgs = {
    after?: InputMaybe<Scalars["String"]["input"]>;
    first?: InputMaybe<Scalars["Int"]["input"]>;
};

export type RichPod = {
    __typename?: "RichPod";
    chapters: Array<Chapter>;
    createdAt: Scalars["String"]["output"];
    description: Scalars["String"]["output"];
    editor?: Maybe<User>;
    explicit: Scalars["Boolean"]["output"];
    hostedEpisodeId?: Maybe<Scalars["ID"]["output"]>;
    id: Scalars["ID"]["output"];
    isHosted: Scalars["Boolean"]["output"];
    origin: PodcastOrigin;
    publishedAt?: Maybe<Scalars["String"]["output"]>;
    state: RichPodState;
    title: Scalars["String"]["output"];
    updatedAt: Scalars["String"]["output"];
};

export const RichPodState = {
    Draft: "draft",
    Published: "published",
} as const;

export type RichPodState = (typeof RichPodState)[keyof typeof RichPodState];
export const RichPodVerificationStatus = {
    Failed: "failed",
    Pending: "pending",
    Unverified: "unverified",
    Verified: "verified",
} as const;

export type RichPodVerificationStatus =
    (typeof RichPodVerificationStatus)[keyof typeof RichPodVerificationStatus];
export type SignInInput = {
    email: Scalars["String"]["input"];
    password: Scalars["String"]["input"];
};

export type SignUpInput = {
    email: Scalars["String"]["input"];
    password: Scalars["String"]["input"];
};

export type Slide = {
    __typename?: "Slide";
    caption: Scalars["String"]["output"];
    credit: Scalars["String"]["output"];
    imageAlt: Scalars["String"]["output"];
    imageUrl: Scalars["String"]["output"];
};

export type Slideshow = BaseEnclosure & {
    __typename?: "Slideshow";
    description?: Maybe<Scalars["String"]["output"]>;
    slides: Array<Slide>;
    title: Scalars["String"]["output"];
};

export type UpdateHostedPodcastInput = {
    applePodcastsVerifyTxt?: InputMaybe<Scalars["String"]["input"]>;
    copyright?: InputMaybe<Scalars["String"]["input"]>;
    description?: InputMaybe<Scalars["String"]["input"]>;
    itunesAuthor?: InputMaybe<Scalars["String"]["input"]>;
    itunesCategory?: InputMaybe<Scalars["String"]["input"]>;
    itunesExplicit?: InputMaybe<Scalars["Boolean"]["input"]>;
    itunesType?: InputMaybe<Scalars["String"]["input"]>;
    language?: InputMaybe<Scalars["String"]["input"]>;
    link?: InputMaybe<Scalars["String"]["input"]>;
    title?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateProfileInput = {
    biography?: InputMaybe<Scalars["String"]["input"]>;
    editorLanguage?: InputMaybe<Scalars["String"]["input"]>;
    publicEmail?: InputMaybe<Scalars["String"]["input"]>;
    publicName?: InputMaybe<Scalars["String"]["input"]>;
    socialAccounts?: InputMaybe<Array<Scalars["String"]["input"]>>;
    website?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateRichPodInput = {
    description?: InputMaybe<Scalars["String"]["input"]>;
    explicit?: InputMaybe<Scalars["Boolean"]["input"]>;
    state?: InputMaybe<RichPodState>;
    title?: InputMaybe<Scalars["String"]["input"]>;
};

export type User = {
    __typename?: "User";
    biography?: Maybe<Scalars["String"]["output"]>;
    editorLanguage?: Maybe<Scalars["String"]["output"]>;
    id: Scalars["ID"]["output"];
    publicEmail?: Maybe<Scalars["String"]["output"]>;
    publicName?: Maybe<Scalars["String"]["output"]>;
    /** Only populated for the current user (via currentUser query). */
    role?: Maybe<Scalars["String"]["output"]>;
    socialAccounts: Array<Scalars["String"]["output"]>;
    totalQuotaBytes?: Maybe<Scalars["Int"]["output"]>;
    usedQuotaBytes?: Maybe<Scalars["Int"]["output"]>;
    website?: Maybe<Scalars["String"]["output"]>;
};

export type Verification = {
    __typename?: "Verification";
    createdAt: Scalars["String"]["output"];
    email: Scalars["String"]["output"];
    expiresAt: Scalars["String"]["output"];
    feedUrl: Scalars["String"]["output"];
    id: Scalars["ID"]["output"];
    state: RichPodVerificationStatus;
    verificationTimestamp?: Maybe<Scalars["String"]["output"]>;
};

export type SignUpMutationVariables = Exact<{
    input: SignUpInput;
}>;

export type SignUpMutation = {
    __typename?: "Mutation";
    signUp: {
        __typename?: "AuthPayload";
        token: string;
        user: {
            __typename?: "User";
            id: string;
            publicName?: string | null;
            biography?: string | null;
            website?: string | null;
            publicEmail?: string | null;
            socialAccounts: Array<string>;
            editorLanguage?: string | null;
            role?: string | null;
            usedQuotaBytes?: number | null;
            totalQuotaBytes?: number | null;
        };
    };
};

export type SignInMutationVariables = Exact<{
    input: SignInInput;
}>;

export type SignInMutation = {
    __typename?: "Mutation";
    signIn: {
        __typename?: "AuthPayload";
        token: string;
        user: {
            __typename?: "User";
            id: string;
            publicName?: string | null;
            biography?: string | null;
            website?: string | null;
            publicEmail?: string | null;
            socialAccounts: Array<string>;
            editorLanguage?: string | null;
            role?: string | null;
            usedQuotaBytes?: number | null;
            totalQuotaBytes?: number | null;
        };
    };
};

export type SignInWithGoogleMutationVariables = Exact<{
    idToken: Scalars["String"]["input"];
}>;

export type SignInWithGoogleMutation = {
    __typename?: "Mutation";
    signInWithGoogle: {
        __typename?: "AuthPayload";
        token: string;
        user: {
            __typename?: "User";
            id: string;
            publicName?: string | null;
            biography?: string | null;
            website?: string | null;
            publicEmail?: string | null;
            socialAccounts: Array<string>;
            editorLanguage?: string | null;
            role?: string | null;
            usedQuotaBytes?: number | null;
            totalQuotaBytes?: number | null;
        };
    };
};

export type UserFieldsFragment = {
    __typename?: "User";
    id: string;
    publicName?: string | null;
    biography?: string | null;
    website?: string | null;
    publicEmail?: string | null;
    socialAccounts: Array<string>;
    usedQuotaBytes?: number | null;
    totalQuotaBytes?: number | null;
};

export type CurrentUserFieldsFragment = {
    __typename?: "User";
    id: string;
    publicName?: string | null;
    biography?: string | null;
    website?: string | null;
    publicEmail?: string | null;
    socialAccounts: Array<string>;
    editorLanguage?: string | null;
    role?: string | null;
    usedQuotaBytes?: number | null;
    totalQuotaBytes?: number | null;
};

export type RichPodFieldsFragment = {
    __typename?: "RichPod";
    id: string;
    title: string;
    description: string;
    state: RichPodState;
    createdAt: string;
    updatedAt: string;
    isHosted: boolean;
    hostedEpisodeId?: string | null;
    explicit: boolean;
    editor?: {
        __typename?: "User";
        id: string;
        publicName?: string | null;
        biography?: string | null;
        website?: string | null;
        publicEmail?: string | null;
        socialAccounts: Array<string>;
        usedQuotaBytes?: number | null;
        totalQuotaBytes?: number | null;
    } | null;
};

export type ChapterFieldsFragment = {
    __typename?: "Chapter";
    begin: string;
    enclosure:
        | {
              __typename: "Card";
              title: string;
              cardType: CardType;
              visibleAsChapter: boolean;
              url?: string | null;
              description?: string | null;
              coverSource?: string | null;
              coverImageUrl?: string | null;
              quoteText?: string | null;
              citationSource?: string | null;
              citationUrl?: string | null;
              imageUrl?: string | null;
              imageAlt?: string | null;
              imageLink?: string | null;
              openGraph?: {
                  __typename?: "CardOpenGraph";
                  ogTitle?: string | null;
                  ogDescription?: string | null;
                  ogImageUrl?: string | null;
                  ogImageWidth?: number | null;
                  ogImageHeight?: number | null;
              } | null;
          }
        | {
              __typename: "Factbox";
              title: string;
              text: string;
              links: Array<{ __typename?: "FactboxLink"; label: string; url: string }>;
          }
        | { __typename: "GeoMap"; title: string; description?: string | null; geoJSON: any }
        | {
              __typename: "InteractiveChart";
              title: string;
              description?: string | null;
              chartFormat: ChartFormat;
              chart: any;
          }
        | { __typename: "Markdown"; title: string; text: string }
        | {
              __typename: "Poll";
              coloeus: { __typename?: "Coloeus"; endpoint: string; pollId: string };
          }
        | {
              __typename: "Slideshow";
              title: string;
              description?: string | null;
              slides: Array<{
                  __typename?: "Slide";
                  imageUrl: string;
                  imageAlt: string;
                  caption: string;
                  credit: string;
              }>;
          };
};

export type HostedPodcastsQueryVariables = Exact<{
    first?: InputMaybe<Scalars["Int"]["input"]>;
    after?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type HostedPodcastsQuery = {
    __typename?: "Query";
    hostedPodcasts: {
        __typename?: "PaginatedHostedPodcasts";
        nextCursor?: string | null;
        items: Array<{
            __typename?: "HostedPodcast";
            id: string;
            title: string;
            description: string;
            link: string;
            language: string;
            itunesCategory: string;
            itunesExplicit: boolean;
            itunesAuthor: string;
            itunesType?: string | null;
            copyright?: string | null;
            applePodcastsVerifyTxt?: string | null;
            coverImageUrl: string;
            episodeCount: number;
            feedUrl: string;
            createdAt: string;
            updatedAt: string;
        }>;
    };
};

export type HostedPodcastQueryVariables = Exact<{
    id: Scalars["ID"]["input"];
}>;

export type HostedPodcastQuery = {
    __typename?: "Query";
    hostedPodcast?: {
        __typename?: "HostedPodcast";
        id: string;
        title: string;
        description: string;
        link: string;
        language: string;
        itunesCategory: string;
        itunesExplicit: boolean;
        itunesAuthor: string;
        itunesType?: string | null;
        copyright?: string | null;
        applePodcastsVerifyTxt?: string | null;
        coverImageUrl: string;
        episodeCount: number;
        feedUrl: string;
        createdAt: string;
        updatedAt: string;
    } | null;
};

export type HostedEpisodesQueryVariables = Exact<{
    podcastId: Scalars["ID"]["input"];
    first?: InputMaybe<Scalars["Int"]["input"]>;
    after?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type HostedEpisodesQuery = {
    __typename?: "Query";
    hostedEpisodes: {
        __typename?: "PaginatedHostedEpisodes";
        nextCursor?: string | null;
        items: Array<{
            __typename?: "HostedEpisode";
            id: string;
            hostedPodcastId: string;
            richPodId: string;
            audioUrl: string;
            audioByteSize: number;
            audioDurationSeconds?: number | null;
            audioBitrate?: number | null;
            audioSampleRate?: number | null;
            audioChannels?: number | null;
            validationStatus: HostedEpisodeValidationStatus;
            validationError?: string | null;
            episodeCoverUrl?: string | null;
            itunesExplicit: boolean;
            publishedAt?: string | null;
            createdAt: string;
            updatedAt: string;
        }>;
    };
};

export type HostedEpisodeQueryVariables = Exact<{
    id: Scalars["ID"]["input"];
}>;

export type HostedEpisodeQuery = {
    __typename?: "Query";
    hostedEpisode?: {
        __typename?: "HostedEpisode";
        id: string;
        hostedPodcastId: string;
        richPodId: string;
        audioUrl: string;
        audioByteSize: number;
        audioDurationSeconds?: number | null;
        audioBitrate?: number | null;
        audioSampleRate?: number | null;
        audioChannels?: number | null;
        validationStatus: HostedEpisodeValidationStatus;
        validationError?: string | null;
        episodeCoverUrl?: string | null;
        itunesExplicit: boolean;
        publishedAt?: string | null;
        createdAt: string;
        updatedAt: string;
    } | null;
};

export type UpdateHostedPodcastMutationVariables = Exact<{
    id: Scalars["ID"]["input"];
    input: UpdateHostedPodcastInput;
}>;

export type UpdateHostedPodcastMutation = {
    __typename?: "Mutation";
    updateHostedPodcast: {
        __typename?: "HostedPodcast";
        id: string;
        title: string;
        description: string;
        link: string;
        language: string;
        itunesCategory: string;
        itunesExplicit: boolean;
        itunesAuthor: string;
        itunesType?: string | null;
        copyright?: string | null;
        applePodcastsVerifyTxt?: string | null;
        coverImageUrl: string;
        episodeCount: number;
        feedUrl: string;
        createdAt: string;
        updatedAt: string;
    };
};

export type DeleteHostedPodcastMutationVariables = Exact<{
    id: Scalars["ID"]["input"];
}>;

export type DeleteHostedPodcastMutation = { __typename?: "Mutation"; deleteHostedPodcast: boolean };

export type DeleteHostedEpisodeMutationVariables = Exact<{
    id: Scalars["ID"]["input"];
}>;

export type DeleteHostedEpisodeMutation = { __typename?: "Mutation"; deleteHostedEpisode: boolean };

export type PodcastEpisodeSearchQueryVariables = Exact<{
    query: Scalars["String"]["input"];
    country?: InputMaybe<Scalars["String"]["input"]>;
    language?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type PodcastEpisodeSearchQuery = {
    __typename?: "Query";
    podcastEpisodeSearch: Array<{
        __typename?: "PodcastEpisodeSearchResult";
        feedUrl: string;
        podcastTitle: string;
        episodeTitle: string;
        episodeGuid?: string | null;
        creator?: string | null;
        artwork?: string | null;
        date?: string | null;
        genre?: string | null;
    }>;
};

export type ExtractFeedUrlQueryVariables = Exact<{
    url: Scalars["String"]["input"];
}>;

export type ExtractFeedUrlQuery = { __typename?: "Query"; extractFeedUrl: string };

export type PodcastMetadataQueryVariables = Exact<{
    feedUrl: Scalars["String"]["input"];
    episodeGuid?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type PodcastMetadataQuery = {
    __typename?: "Query";
    podcastMetadata: {
        __typename?: "PodcastMetadata";
        podcast: {
            __typename?: "PodcastInfo";
            title: string;
            description: string;
            artwork: string;
            link: string;
        };
        episodes: Array<{
            __typename?: "EpisodeInfo";
            guid: string;
            title: string;
            publicationDate: string;
            artwork: string;
            link: string;
            url: string;
            type: string;
            length: number;
            checksum: string;
        }>;
    };
};

export type CreateRichPodMutationVariables = Exact<{
    input: CreateRichPodInput;
}>;

export type CreateRichPodMutation = {
    __typename?: "Mutation";
    createRichPod: {
        __typename?: "RichPod";
        id: string;
        title: string;
        description: string;
        state: RichPodState;
        createdAt: string;
        updatedAt: string;
        isHosted: boolean;
        hostedEpisodeId?: string | null;
        explicit: boolean;
        origin: {
            __typename?: "PodcastOrigin";
            id: string;
            title: string;
            link?: string | null;
            feedUrl: string;
            artworkUrl?: string | null;
            verified: boolean;
            episode: {
                __typename?: "PodcastEpisode";
                guid: string;
                title: string;
                artworkUrl?: string | null;
                link?: string | null;
                media: {
                    __typename?: "PodcastMedia";
                    url: string;
                    type: string;
                    length: number;
                    checksum: string;
                };
            };
        };
        chapters: Array<{
            __typename?: "Chapter";
            begin: string;
            enclosure:
                | {
                      __typename: "Card";
                      title: string;
                      cardType: CardType;
                      visibleAsChapter: boolean;
                      url?: string | null;
                      description?: string | null;
                      coverSource?: string | null;
                      coverImageUrl?: string | null;
                      quoteText?: string | null;
                      citationSource?: string | null;
                      citationUrl?: string | null;
                      imageUrl?: string | null;
                      imageAlt?: string | null;
                      imageLink?: string | null;
                      openGraph?: {
                          __typename?: "CardOpenGraph";
                          ogTitle?: string | null;
                          ogDescription?: string | null;
                          ogImageUrl?: string | null;
                          ogImageWidth?: number | null;
                          ogImageHeight?: number | null;
                      } | null;
                  }
                | {
                      __typename: "Factbox";
                      title: string;
                      text: string;
                      links: Array<{ __typename?: "FactboxLink"; label: string; url: string }>;
                  }
                | { __typename: "GeoMap"; title: string; description?: string | null; geoJSON: any }
                | {
                      __typename: "InteractiveChart";
                      title: string;
                      description?: string | null;
                      chartFormat: ChartFormat;
                      chart: any;
                  }
                | { __typename: "Markdown"; title: string; text: string }
                | {
                      __typename: "Poll";
                      coloeus: { __typename?: "Coloeus"; endpoint: string; pollId: string };
                  }
                | {
                      __typename: "Slideshow";
                      title: string;
                      description?: string | null;
                      slides: Array<{
                          __typename?: "Slide";
                          imageUrl: string;
                          imageAlt: string;
                          caption: string;
                          credit: string;
                      }>;
                  };
        }>;
        editor?: {
            __typename?: "User";
            id: string;
            publicName?: string | null;
            biography?: string | null;
            website?: string | null;
            publicEmail?: string | null;
            socialAccounts: Array<string>;
            usedQuotaBytes?: number | null;
            totalQuotaBytes?: number | null;
        } | null;
    };
};

export type UpdateRichPodMutationVariables = Exact<{
    id: Scalars["ID"]["input"];
    input: UpdateRichPodInput;
}>;

export type UpdateRichPodMutation = {
    __typename?: "Mutation";
    updateRichPod: {
        __typename?: "RichPod";
        id: string;
        title: string;
        description: string;
        state: RichPodState;
        createdAt: string;
        updatedAt: string;
        isHosted: boolean;
        hostedEpisodeId?: string | null;
        explicit: boolean;
        origin: {
            __typename?: "PodcastOrigin";
            id: string;
            title: string;
            link?: string | null;
            feedUrl: string;
            artworkUrl?: string | null;
            verified: boolean;
            episode: {
                __typename?: "PodcastEpisode";
                guid: string;
                title: string;
                artworkUrl?: string | null;
                link?: string | null;
                media: {
                    __typename?: "PodcastMedia";
                    url: string;
                    type: string;
                    length: number;
                    checksum: string;
                };
            };
        };
        chapters: Array<{
            __typename?: "Chapter";
            begin: string;
            enclosure:
                | {
                      __typename: "Card";
                      title: string;
                      cardType: CardType;
                      visibleAsChapter: boolean;
                      url?: string | null;
                      description?: string | null;
                      coverSource?: string | null;
                      coverImageUrl?: string | null;
                      quoteText?: string | null;
                      citationSource?: string | null;
                      citationUrl?: string | null;
                      imageUrl?: string | null;
                      imageAlt?: string | null;
                      imageLink?: string | null;
                      openGraph?: {
                          __typename?: "CardOpenGraph";
                          ogTitle?: string | null;
                          ogDescription?: string | null;
                          ogImageUrl?: string | null;
                          ogImageWidth?: number | null;
                          ogImageHeight?: number | null;
                      } | null;
                  }
                | {
                      __typename: "Factbox";
                      title: string;
                      text: string;
                      links: Array<{ __typename?: "FactboxLink"; label: string; url: string }>;
                  }
                | { __typename: "GeoMap"; title: string; description?: string | null; geoJSON: any }
                | {
                      __typename: "InteractiveChart";
                      title: string;
                      description?: string | null;
                      chartFormat: ChartFormat;
                      chart: any;
                  }
                | { __typename: "Markdown"; title: string; text: string }
                | {
                      __typename: "Poll";
                      coloeus: { __typename?: "Coloeus"; endpoint: string; pollId: string };
                  }
                | {
                      __typename: "Slideshow";
                      title: string;
                      description?: string | null;
                      slides: Array<{
                          __typename?: "Slide";
                          imageUrl: string;
                          imageAlt: string;
                          caption: string;
                          credit: string;
                      }>;
                  };
        }>;
        editor?: {
            __typename?: "User";
            id: string;
            publicName?: string | null;
            biography?: string | null;
            website?: string | null;
            publicEmail?: string | null;
            socialAccounts: Array<string>;
            usedQuotaBytes?: number | null;
            totalQuotaBytes?: number | null;
        } | null;
    };
};

export type DeleteRichPodMutationVariables = Exact<{
    id: Scalars["ID"]["input"];
}>;

export type DeleteRichPodMutation = { __typename?: "Mutation"; deleteRichPod: boolean };

export type SetRichPodChaptersMutationVariables = Exact<{
    id: Scalars["ID"]["input"];
    chapters: Array<ChapterInput> | ChapterInput;
}>;

export type SetRichPodChaptersMutation = {
    __typename?: "Mutation";
    setRichPodChapters: {
        __typename?: "RichPod";
        id: string;
        title: string;
        description: string;
        state: RichPodState;
        createdAt: string;
        updatedAt: string;
        isHosted: boolean;
        hostedEpisodeId?: string | null;
        explicit: boolean;
        origin: {
            __typename?: "PodcastOrigin";
            id: string;
            title: string;
            link?: string | null;
            feedUrl: string;
            artworkUrl?: string | null;
            verified: boolean;
            episode: {
                __typename?: "PodcastEpisode";
                guid: string;
                title: string;
                artworkUrl?: string | null;
                link?: string | null;
                media: {
                    __typename?: "PodcastMedia";
                    url: string;
                    type: string;
                    length: number;
                    checksum: string;
                };
            };
        };
        chapters: Array<{
            __typename?: "Chapter";
            begin: string;
            enclosure:
                | {
                      __typename: "Card";
                      title: string;
                      cardType: CardType;
                      visibleAsChapter: boolean;
                      url?: string | null;
                      description?: string | null;
                      coverSource?: string | null;
                      coverImageUrl?: string | null;
                      quoteText?: string | null;
                      citationSource?: string | null;
                      citationUrl?: string | null;
                      imageUrl?: string | null;
                      imageAlt?: string | null;
                      imageLink?: string | null;
                      openGraph?: {
                          __typename?: "CardOpenGraph";
                          ogTitle?: string | null;
                          ogDescription?: string | null;
                          ogImageUrl?: string | null;
                          ogImageWidth?: number | null;
                          ogImageHeight?: number | null;
                      } | null;
                  }
                | {
                      __typename: "Factbox";
                      title: string;
                      text: string;
                      links: Array<{ __typename?: "FactboxLink"; label: string; url: string }>;
                  }
                | { __typename: "GeoMap"; title: string; description?: string | null; geoJSON: any }
                | {
                      __typename: "InteractiveChart";
                      title: string;
                      description?: string | null;
                      chartFormat: ChartFormat;
                      chart: any;
                  }
                | { __typename: "Markdown"; title: string; text: string }
                | {
                      __typename: "Poll";
                      coloeus: { __typename?: "Coloeus"; endpoint: string; pollId: string };
                  }
                | {
                      __typename: "Slideshow";
                      title: string;
                      description?: string | null;
                      slides: Array<{
                          __typename?: "Slide";
                          imageUrl: string;
                          imageAlt: string;
                          caption: string;
                          credit: string;
                      }>;
                  };
        }>;
        editor?: {
            __typename?: "User";
            id: string;
            publicName?: string | null;
            biography?: string | null;
            website?: string | null;
            publicEmail?: string | null;
            socialAccounts: Array<string>;
            usedQuotaBytes?: number | null;
            totalQuotaBytes?: number | null;
        } | null;
    };
};

export type GetRichPodQueryVariables = Exact<{
    id: Scalars["ID"]["input"];
}>;

export type GetRichPodQuery = {
    __typename?: "Query";
    richPod?: {
        __typename?: "RichPod";
        id: string;
        title: string;
        description: string;
        state: RichPodState;
        createdAt: string;
        updatedAt: string;
        isHosted: boolean;
        hostedEpisodeId?: string | null;
        explicit: boolean;
        origin: {
            __typename?: "PodcastOrigin";
            id: string;
            title: string;
            link?: string | null;
            feedUrl: string;
            artworkUrl?: string | null;
            verified: boolean;
            episode: {
                __typename?: "PodcastEpisode";
                guid: string;
                title: string;
                artworkUrl?: string | null;
                link?: string | null;
                media: {
                    __typename?: "PodcastMedia";
                    url: string;
                    type: string;
                    length: number;
                    checksum: string;
                };
            };
        };
        chapters: Array<{
            __typename?: "Chapter";
            begin: string;
            enclosure:
                | {
                      __typename: "Card";
                      title: string;
                      cardType: CardType;
                      visibleAsChapter: boolean;
                      url?: string | null;
                      description?: string | null;
                      coverSource?: string | null;
                      coverImageUrl?: string | null;
                      quoteText?: string | null;
                      citationSource?: string | null;
                      citationUrl?: string | null;
                      imageUrl?: string | null;
                      imageAlt?: string | null;
                      imageLink?: string | null;
                      openGraph?: {
                          __typename?: "CardOpenGraph";
                          ogTitle?: string | null;
                          ogDescription?: string | null;
                          ogImageUrl?: string | null;
                          ogImageWidth?: number | null;
                          ogImageHeight?: number | null;
                      } | null;
                  }
                | {
                      __typename: "Factbox";
                      title: string;
                      text: string;
                      links: Array<{ __typename?: "FactboxLink"; label: string; url: string }>;
                  }
                | { __typename: "GeoMap"; title: string; description?: string | null; geoJSON: any }
                | {
                      __typename: "InteractiveChart";
                      title: string;
                      description?: string | null;
                      chartFormat: ChartFormat;
                      chart: any;
                  }
                | { __typename: "Markdown"; title: string; text: string }
                | {
                      __typename: "Poll";
                      coloeus: { __typename?: "Coloeus"; endpoint: string; pollId: string };
                  }
                | {
                      __typename: "Slideshow";
                      title: string;
                      description?: string | null;
                      slides: Array<{
                          __typename?: "Slide";
                          imageUrl: string;
                          imageAlt: string;
                          caption: string;
                          credit: string;
                      }>;
                  };
        }>;
        editor?: {
            __typename?: "User";
            id: string;
            publicName?: string | null;
            biography?: string | null;
            website?: string | null;
            publicEmail?: string | null;
            socialAccounts: Array<string>;
            usedQuotaBytes?: number | null;
            totalQuotaBytes?: number | null;
        } | null;
    } | null;
};

export type UserRichPodsQueryVariables = Exact<{
    first?: InputMaybe<Scalars["Int"]["input"]>;
    after?: InputMaybe<Scalars["String"]["input"]>;
    state?: InputMaybe<RichPodState>;
}>;

export type UserRichPodsQuery = {
    __typename?: "Query";
    userRichPods: {
        __typename?: "PaginatedRichPods";
        nextCursor?: string | null;
        items: Array<{
            __typename?: "RichPod";
            id: string;
            title: string;
            description: string;
            state: RichPodState;
            isHosted: boolean;
            createdAt: string;
            updatedAt: string;
            origin: {
                __typename?: "PodcastOrigin";
                title: string;
                link?: string | null;
                feedUrl: string;
                artworkUrl?: string | null;
                verified: boolean;
                episode: {
                    __typename?: "PodcastEpisode";
                    guid: string;
                    title: string;
                    artworkUrl?: string | null;
                    link?: string | null;
                };
            };
            editor?: { __typename?: "User"; publicName?: string | null } | null;
        }>;
    };
};

export type GetCurrentUserQueryVariables = Exact<{ [key: string]: never }>;

export type GetCurrentUserQuery = {
    __typename?: "Query";
    currentUser?: {
        __typename?: "User";
        id: string;
        publicName?: string | null;
        biography?: string | null;
        website?: string | null;
        publicEmail?: string | null;
        socialAccounts: Array<string>;
        editorLanguage?: string | null;
        role?: string | null;
        usedQuotaBytes?: number | null;
        totalQuotaBytes?: number | null;
    } | null;
};

export type UpdateProfileMutationVariables = Exact<{
    input: UpdateProfileInput;
}>;

export type UpdateProfileMutation = {
    __typename?: "Mutation";
    updateProfile: {
        __typename?: "User";
        id: string;
        publicName?: string | null;
        biography?: string | null;
        website?: string | null;
        publicEmail?: string | null;
        socialAccounts: Array<string>;
        editorLanguage?: string | null;
        role?: string | null;
        usedQuotaBytes?: number | null;
        totalQuotaBytes?: number | null;
    };
};

export type UserVerificationsQueryVariables = Exact<{
    first?: InputMaybe<Scalars["Int"]["input"]>;
    after?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type UserVerificationsQuery = {
    __typename?: "Query";
    userVerifications: {
        __typename?: "PaginatedVerifications";
        nextCursor?: string | null;
        items: Array<{
            __typename?: "Verification";
            id: string;
            feedUrl: string;
            email: string;
            state: RichPodVerificationStatus;
            createdAt: string;
            verificationTimestamp?: string | null;
            expiresAt: string;
        }>;
    };
};

export type StartRichPodVerificationMutationVariables = Exact<{
    feedUrl: Scalars["String"]["input"];
}>;

export type StartRichPodVerificationMutation = {
    __typename?: "Mutation";
    startRichPodVerification: {
        __typename?: "Verification";
        id: string;
        feedUrl: string;
        email: string;
        state: RichPodVerificationStatus;
        createdAt: string;
        verificationTimestamp?: string | null;
        expiresAt: string;
    };
};

export type CompleteRichPodVerificationMutationVariables = Exact<{
    feedUrl: Scalars["String"]["input"];
    code: Scalars["String"]["input"];
}>;

export type CompleteRichPodVerificationMutation = {
    __typename?: "Mutation";
    completeRichPodVerification: {
        __typename?: "Verification";
        id: string;
        feedUrl: string;
        email: string;
        state: RichPodVerificationStatus;
        createdAt: string;
        verificationTimestamp?: string | null;
        expiresAt: string;
    };
};

export const CurrentUserFieldsFragmentDoc = gql`
    fragment CurrentUserFields on User {
        id
        publicName
        biography
        website
        publicEmail
        socialAccounts
        editorLanguage
        role
        usedQuotaBytes
        totalQuotaBytes
    }
`;
export const UserFieldsFragmentDoc = gql`
    fragment UserFields on User {
        id
        publicName
        biography
        website
        publicEmail
        socialAccounts
        usedQuotaBytes
        totalQuotaBytes
    }
`;
export const RichPodFieldsFragmentDoc = gql`
    fragment RichPodFields on RichPod {
        id
        title
        description
        state
        createdAt
        updatedAt
        isHosted
        hostedEpisodeId
        explicit
        editor {
            ...UserFields
        }
    }
    ${UserFieldsFragmentDoc}
`;
export const ChapterFieldsFragmentDoc = gql`
    fragment ChapterFields on Chapter {
        begin
        enclosure {
            __typename
            ... on Markdown {
                title
                text
            }
            ... on InteractiveChart {
                title
                description
                chartFormat
                chart
            }
            ... on GeoMap {
                title
                description
                geoJSON
            }
            ... on Slideshow {
                title
                description
                slides {
                    imageUrl
                    imageAlt
                    caption
                    credit
                }
            }
            ... on Poll {
                coloeus {
                    endpoint
                    pollId
                }
            }
            ... on Factbox {
                title
                text
                links {
                    label
                    url
                }
            }
            ... on Card {
                title
                cardType
                visibleAsChapter
                url
                openGraph {
                    ogTitle
                    ogDescription
                    ogImageUrl
                    ogImageWidth
                    ogImageHeight
                }
                description
                coverSource
                coverImageUrl
                quoteText
                citationSource
                citationUrl
                imageUrl
                imageAlt
                imageLink
            }
        }
    }
`;
export const SignUpDocument = gql`
    mutation SignUp($input: SignUpInput!) {
        signUp(input: $input) {
            token
            user {
                ...CurrentUserFields
            }
        }
    }
    ${CurrentUserFieldsFragmentDoc}
`;
export const SignInDocument = gql`
    mutation SignIn($input: SignInInput!) {
        signIn(input: $input) {
            token
            user {
                ...CurrentUserFields
            }
        }
    }
    ${CurrentUserFieldsFragmentDoc}
`;
export const SignInWithGoogleDocument = gql`
    mutation SignInWithGoogle($idToken: String!) {
        signInWithGoogle(idToken: $idToken) {
            token
            user {
                ...CurrentUserFields
            }
        }
    }
    ${CurrentUserFieldsFragmentDoc}
`;
export const HostedPodcastsDocument = gql`
    query HostedPodcasts($first: Int, $after: String) {
        hostedPodcasts(first: $first, after: $after) {
            items {
                id
                title
                description
                link
                language
                itunesCategory
                itunesExplicit
                itunesAuthor
                itunesType
                copyright
                applePodcastsVerifyTxt
                coverImageUrl
                episodeCount
                feedUrl
                createdAt
                updatedAt
            }
            nextCursor
        }
    }
`;
export const HostedPodcastDocument = gql`
    query HostedPodcast($id: ID!) {
        hostedPodcast(id: $id) {
            id
            title
            description
            link
            language
            itunesCategory
            itunesExplicit
            itunesAuthor
            itunesType
            copyright
            applePodcastsVerifyTxt
            coverImageUrl
            episodeCount
            feedUrl
            createdAt
            updatedAt
        }
    }
`;
export const HostedEpisodesDocument = gql`
    query HostedEpisodes($podcastId: ID!, $first: Int, $after: String) {
        hostedEpisodes(podcastId: $podcastId, first: $first, after: $after) {
            items {
                id
                hostedPodcastId
                richPodId
                audioUrl
                audioByteSize
                audioDurationSeconds
                audioBitrate
                audioSampleRate
                audioChannels
                validationStatus
                validationError
                episodeCoverUrl
                itunesExplicit
                publishedAt
                createdAt
                updatedAt
            }
            nextCursor
        }
    }
`;
export const HostedEpisodeDocument = gql`
    query HostedEpisode($id: ID!) {
        hostedEpisode(id: $id) {
            id
            hostedPodcastId
            richPodId
            audioUrl
            audioByteSize
            audioDurationSeconds
            audioBitrate
            audioSampleRate
            audioChannels
            validationStatus
            validationError
            episodeCoverUrl
            itunesExplicit
            publishedAt
            createdAt
            updatedAt
        }
    }
`;
export const UpdateHostedPodcastDocument = gql`
    mutation UpdateHostedPodcast($id: ID!, $input: UpdateHostedPodcastInput!) {
        updateHostedPodcast(id: $id, input: $input) {
            id
            title
            description
            link
            language
            itunesCategory
            itunesExplicit
            itunesAuthor
            itunesType
            copyright
            applePodcastsVerifyTxt
            coverImageUrl
            episodeCount
            feedUrl
            createdAt
            updatedAt
        }
    }
`;
export const DeleteHostedPodcastDocument = gql`
    mutation DeleteHostedPodcast($id: ID!) {
        deleteHostedPodcast(id: $id)
    }
`;
export const DeleteHostedEpisodeDocument = gql`
    mutation DeleteHostedEpisode($id: ID!) {
        deleteHostedEpisode(id: $id)
    }
`;
export const PodcastEpisodeSearchDocument = gql`
    query PodcastEpisodeSearch($query: String!, $country: String, $language: String) {
        podcastEpisodeSearch(query: $query, country: $country, language: $language) {
            feedUrl
            podcastTitle
            episodeTitle
            episodeGuid
            creator
            artwork
            date
            genre
        }
    }
`;
export const ExtractFeedUrlDocument = gql`
    query ExtractFeedUrl($url: String!) {
        extractFeedUrl(url: $url)
    }
`;
export const PodcastMetadataDocument = gql`
    query PodcastMetadata($feedUrl: String!, $episodeGuid: String) {
        podcastMetadata(feedUrl: $feedUrl, episodeGuid: $episodeGuid) {
            podcast {
                title
                description
                artwork
                link
            }
            episodes {
                guid
                title
                publicationDate
                artwork
                link
                url
                type
                length
                checksum
            }
        }
    }
`;
export const CreateRichPodDocument = gql`
    mutation CreateRichPod($input: CreateRichPodInput!) {
        createRichPod(input: $input) {
            ...RichPodFields
            origin {
                id
                title
                link
                feedUrl
                artworkUrl
                verified
                episode {
                    guid
                    title
                    artworkUrl
                    link
                    media {
                        url
                        type
                        length
                        checksum
                    }
                }
            }
            chapters {
                ...ChapterFields
            }
        }
    }
    ${RichPodFieldsFragmentDoc}
    ${ChapterFieldsFragmentDoc}
`;
export const UpdateRichPodDocument = gql`
    mutation UpdateRichPod($id: ID!, $input: UpdateRichPodInput!) {
        updateRichPod(id: $id, input: $input) {
            ...RichPodFields
            origin {
                id
                title
                link
                feedUrl
                artworkUrl
                verified
                episode {
                    guid
                    title
                    artworkUrl
                    link
                    media {
                        url
                        type
                        length
                        checksum
                    }
                }
            }
            chapters {
                ...ChapterFields
            }
        }
    }
    ${RichPodFieldsFragmentDoc}
    ${ChapterFieldsFragmentDoc}
`;
export const DeleteRichPodDocument = gql`
    mutation DeleteRichPod($id: ID!) {
        deleteRichPod(id: $id)
    }
`;
export const SetRichPodChaptersDocument = gql`
    mutation SetRichPodChapters($id: ID!, $chapters: [ChapterInput!]!) {
        setRichPodChapters(id: $id, chapters: $chapters) {
            ...RichPodFields
            origin {
                id
                title
                link
                feedUrl
                artworkUrl
                verified
                episode {
                    guid
                    title
                    artworkUrl
                    link
                    media {
                        url
                        type
                        length
                        checksum
                    }
                }
            }
            chapters {
                ...ChapterFields
            }
        }
    }
    ${RichPodFieldsFragmentDoc}
    ${ChapterFieldsFragmentDoc}
`;
export const GetRichPodDocument = gql`
    query GetRichPod($id: ID!) {
        richPod(id: $id) {
            ...RichPodFields
            origin {
                id
                title
                link
                feedUrl
                artworkUrl
                verified
                episode {
                    guid
                    title
                    artworkUrl
                    link
                    media {
                        url
                        type
                        length
                        checksum
                    }
                }
            }
            chapters {
                ...ChapterFields
            }
        }
    }
    ${RichPodFieldsFragmentDoc}
    ${ChapterFieldsFragmentDoc}
`;
export const UserRichPodsDocument = gql`
    query UserRichPods($first: Int, $after: String, $state: RichPodState) {
        userRichPods(first: $first, after: $after, state: $state) {
            items {
                id
                title
                description
                state
                isHosted
                origin {
                    title
                    link
                    feedUrl
                    artworkUrl
                    verified
                    episode {
                        guid
                        title
                        artworkUrl
                        link
                    }
                }
                editor {
                    publicName
                }
                createdAt
                updatedAt
            }
            nextCursor
        }
    }
`;
export const GetCurrentUserDocument = gql`
    query GetCurrentUser {
        currentUser {
            ...CurrentUserFields
        }
    }
    ${CurrentUserFieldsFragmentDoc}
`;
export const UpdateProfileDocument = gql`
    mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
            ...CurrentUserFields
        }
    }
    ${CurrentUserFieldsFragmentDoc}
`;
export const UserVerificationsDocument = gql`
    query UserVerifications($first: Int, $after: String) {
        userVerifications(first: $first, after: $after) {
            items {
                id
                feedUrl
                email
                state
                createdAt
                verificationTimestamp
                expiresAt
            }
            nextCursor
        }
    }
`;
export const StartRichPodVerificationDocument = gql`
    mutation StartRichPodVerification($feedUrl: String!) {
        startRichPodVerification(feedUrl: $feedUrl) {
            id
            feedUrl
            email
            state
            createdAt
            verificationTimestamp
            expiresAt
        }
    }
`;
export const CompleteRichPodVerificationDocument = gql`
    mutation CompleteRichPodVerification($feedUrl: String!, $code: String!) {
        completeRichPodVerification(feedUrl: $feedUrl, code: $code) {
            id
            feedUrl
            email
            state
            createdAt
            verificationTimestamp
            expiresAt
        }
    }
`;

export type SdkFunctionWrapper = <T>(
    action: (requestHeaders?: Record<string, string>) => Promise<T>,
    operationName: string,
    operationType?: string,
    variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) =>
    action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
    return {
        SignUp(
            variables: SignUpMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<SignUpMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<SignUpMutation>(SignUpDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "SignUp",
                "mutation",
                variables,
            );
        },
        SignIn(
            variables: SignInMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<SignInMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<SignInMutation>(SignInDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "SignIn",
                "mutation",
                variables,
            );
        },
        SignInWithGoogle(
            variables: SignInWithGoogleMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<SignInWithGoogleMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<SignInWithGoogleMutation>(SignInWithGoogleDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "SignInWithGoogle",
                "mutation",
                variables,
            );
        },
        HostedPodcasts(
            variables?: HostedPodcastsQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<HostedPodcastsQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<HostedPodcastsQuery>(HostedPodcastsDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "HostedPodcasts",
                "query",
                variables,
            );
        },
        HostedPodcast(
            variables: HostedPodcastQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<HostedPodcastQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<HostedPodcastQuery>(HostedPodcastDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "HostedPodcast",
                "query",
                variables,
            );
        },
        HostedEpisodes(
            variables: HostedEpisodesQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<HostedEpisodesQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<HostedEpisodesQuery>(HostedEpisodesDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "HostedEpisodes",
                "query",
                variables,
            );
        },
        HostedEpisode(
            variables: HostedEpisodeQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<HostedEpisodeQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<HostedEpisodeQuery>(HostedEpisodeDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "HostedEpisode",
                "query",
                variables,
            );
        },
        UpdateHostedPodcast(
            variables: UpdateHostedPodcastMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<UpdateHostedPodcastMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<UpdateHostedPodcastMutation>(
                        UpdateHostedPodcastDocument,
                        variables,
                        { ...requestHeaders, ...wrappedRequestHeaders },
                    ),
                "UpdateHostedPodcast",
                "mutation",
                variables,
            );
        },
        DeleteHostedPodcast(
            variables: DeleteHostedPodcastMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<DeleteHostedPodcastMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<DeleteHostedPodcastMutation>(
                        DeleteHostedPodcastDocument,
                        variables,
                        { ...requestHeaders, ...wrappedRequestHeaders },
                    ),
                "DeleteHostedPodcast",
                "mutation",
                variables,
            );
        },
        DeleteHostedEpisode(
            variables: DeleteHostedEpisodeMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<DeleteHostedEpisodeMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<DeleteHostedEpisodeMutation>(
                        DeleteHostedEpisodeDocument,
                        variables,
                        { ...requestHeaders, ...wrappedRequestHeaders },
                    ),
                "DeleteHostedEpisode",
                "mutation",
                variables,
            );
        },
        PodcastEpisodeSearch(
            variables: PodcastEpisodeSearchQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<PodcastEpisodeSearchQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<PodcastEpisodeSearchQuery>(
                        PodcastEpisodeSearchDocument,
                        variables,
                        { ...requestHeaders, ...wrappedRequestHeaders },
                    ),
                "PodcastEpisodeSearch",
                "query",
                variables,
            );
        },
        ExtractFeedUrl(
            variables: ExtractFeedUrlQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<ExtractFeedUrlQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<ExtractFeedUrlQuery>(ExtractFeedUrlDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "ExtractFeedUrl",
                "query",
                variables,
            );
        },
        PodcastMetadata(
            variables: PodcastMetadataQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<PodcastMetadataQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<PodcastMetadataQuery>(PodcastMetadataDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "PodcastMetadata",
                "query",
                variables,
            );
        },
        CreateRichPod(
            variables: CreateRichPodMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<CreateRichPodMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<CreateRichPodMutation>(CreateRichPodDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "CreateRichPod",
                "mutation",
                variables,
            );
        },
        UpdateRichPod(
            variables: UpdateRichPodMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<UpdateRichPodMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<UpdateRichPodMutation>(UpdateRichPodDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "UpdateRichPod",
                "mutation",
                variables,
            );
        },
        DeleteRichPod(
            variables: DeleteRichPodMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<DeleteRichPodMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<DeleteRichPodMutation>(DeleteRichPodDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "DeleteRichPod",
                "mutation",
                variables,
            );
        },
        SetRichPodChapters(
            variables: SetRichPodChaptersMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<SetRichPodChaptersMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<SetRichPodChaptersMutation>(
                        SetRichPodChaptersDocument,
                        variables,
                        { ...requestHeaders, ...wrappedRequestHeaders },
                    ),
                "SetRichPodChapters",
                "mutation",
                variables,
            );
        },
        GetRichPod(
            variables: GetRichPodQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<GetRichPodQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<GetRichPodQuery>(GetRichPodDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "GetRichPod",
                "query",
                variables,
            );
        },
        UserRichPods(
            variables?: UserRichPodsQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<UserRichPodsQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<UserRichPodsQuery>(UserRichPodsDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "UserRichPods",
                "query",
                variables,
            );
        },
        GetCurrentUser(
            variables?: GetCurrentUserQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<GetCurrentUserQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<GetCurrentUserQuery>(GetCurrentUserDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "GetCurrentUser",
                "query",
                variables,
            );
        },
        UpdateProfile(
            variables: UpdateProfileMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<UpdateProfileMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<UpdateProfileMutation>(UpdateProfileDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "UpdateProfile",
                "mutation",
                variables,
            );
        },
        UserVerifications(
            variables?: UserVerificationsQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<UserVerificationsQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<UserVerificationsQuery>(UserVerificationsDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "UserVerifications",
                "query",
                variables,
            );
        },
        StartRichPodVerification(
            variables: StartRichPodVerificationMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<StartRichPodVerificationMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<StartRichPodVerificationMutation>(
                        StartRichPodVerificationDocument,
                        variables,
                        { ...requestHeaders, ...wrappedRequestHeaders },
                    ),
                "StartRichPodVerification",
                "mutation",
                variables,
            );
        },
        CompleteRichPodVerification(
            variables: CompleteRichPodVerificationMutationVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<CompleteRichPodVerificationMutation> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<CompleteRichPodVerificationMutation>(
                        CompleteRichPodVerificationDocument,
                        variables,
                        { ...requestHeaders, ...wrappedRequestHeaders },
                    ),
                "CompleteRichPodVerification",
                "mutation",
                variables,
            );
        },
    };
}
export type Sdk = ReturnType<typeof getSdk>;
