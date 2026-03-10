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
    recentPublishedRichPods: Array<RichPod>;
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
    limit?: InputMaybe<Scalars["Int"]["input"]>;
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

export type RichPodQueryVariables = Exact<{
    id: Scalars["ID"]["input"];
}>;

export type RichPodQuery = {
    __typename?: "Query";
    richPod?: {
        __typename?: "RichPod";
        id: string;
        description: string;
        explicit: boolean;
        title: string;
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
                | { __typename: "GeoMap"; description?: string | null; geoJSON: any; title: string }
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
                      description?: string | null;
                      title: string;
                      slides: Array<{
                          __typename?: "Slide";
                          caption: string;
                          credit: string;
                          imageUrl: string;
                          imageAlt: string;
                      }>;
                  };
        }>;
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
                    checksum: string;
                    length: number;
                    type: string;
                    url: string;
                };
            };
        };
        editor?: { __typename?: "User"; publicName?: string | null } | null;
    } | null;
};

export const RichPodDocument = gql`
    query RichPod($id: ID!) {
        richPod(id: $id) {
            id
            chapters {
                begin
                enclosure {
                    ... on Markdown {
                        __typename
                        title
                        text
                    }
                    ... on InteractiveChart {
                        __typename
                        title
                        description
                        chartFormat
                        chart
                    }
                    ... on Slideshow {
                        __typename
                        description
                        slides {
                            caption
                            credit
                            imageUrl
                            imageAlt
                        }
                        title
                    }
                    ... on GeoMap {
                        __typename
                        description
                        geoJSON
                        title
                    }
                    ... on Poll {
                        __typename
                        coloeus {
                            endpoint
                            pollId
                        }
                    }
                    ... on Factbox {
                        __typename
                        title
                        text
                        links {
                            label
                            url
                        }
                    }
                    ... on Card {
                        __typename
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
            description
            explicit
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
                        checksum
                        length
                        type
                        url
                    }
                }
            }
            title
            editor {
                publicName
            }
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
        RichPod(
            variables: RichPodQueryVariables,
            requestHeaders?: GraphQLClientRequestHeaders,
        ): Promise<RichPodQuery> {
            return withWrapper(
                (wrappedRequestHeaders) =>
                    client.request<RichPodQuery>(RichPodDocument, variables, {
                        ...requestHeaders,
                        ...wrappedRequestHeaders,
                    }),
                "RichPod",
                "query",
                variables,
            );
        },
    };
}
export type Sdk = ReturnType<typeof getSdk>;
