import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  GeoJSON: { input: any; output: any; }
  JSON: { input: any; output: any; }
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type BaseEnclosure = {
  title: Scalars['String']['output'];
};

export type Card = BaseEnclosure & {
  __typename?: 'Card';
  cardType: CardType;
  /** Citation card: attribution source */
  citationSource?: Maybe<Scalars['String']['output']>;
  /** Citation card: optional link URL */
  citationUrl?: Maybe<Scalars['String']['output']>;
  /** Cover card: resolved artwork URL */
  coverImageUrl?: Maybe<Scalars['String']['output']>;
  /** Cover card: 'podcast' or 'episode' */
  coverSource?: Maybe<Scalars['String']['output']>;
  /** Link card: optional description */
  description?: Maybe<Scalars['String']['output']>;
  /** Image card: alt text for accessibility */
  imageAlt?: Maybe<Scalars['String']['output']>;
  /** Image card: optional link wrapping the image */
  imageLink?: Maybe<Scalars['String']['output']>;
  /** Image card: uploaded image URL */
  imageUrl?: Maybe<Scalars['String']['output']>;
  /** Link card: parsed Open Graph metadata */
  openGraph?: Maybe<CardOpenGraph>;
  /** Citation card: the quoted text */
  quoteText?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  /** Link card: the external URL */
  url?: Maybe<Scalars['String']['output']>;
  visibleAsChapter: Scalars['Boolean']['output'];
};

export type CardOpenGraph = {
  __typename?: 'CardOpenGraph';
  ogDescription?: Maybe<Scalars['String']['output']>;
  ogImageHeight?: Maybe<Scalars['Int']['output']>;
  ogImageUrl?: Maybe<Scalars['String']['output']>;
  ogImageWidth?: Maybe<Scalars['Int']['output']>;
  ogTitle?: Maybe<Scalars['String']['output']>;
};

export enum CardType {
  Blank = 'BLANK',
  Citation = 'CITATION',
  Cover = 'COVER',
  Image = 'IMAGE',
  Link = 'LINK'
}

export type Chapter = {
  __typename?: 'Chapter';
  begin: Scalars['String']['output'];
  enclosure: Enclosure;
};

export type ChapterInput = {
  begin: Scalars['String']['input'];
  enclosure: Scalars['JSON']['input'];
  enclosureType: EnclosureType;
};

export enum ChartFormat {
  Echarts = 'ECHARTS',
  PlainData = 'PLAIN_DATA'
}

export type Coloeus = {
  __typename?: 'Coloeus';
  endpoint: Scalars['String']['output'];
  pollId: Scalars['String']['output'];
};

export type CreateHostedPodcastInput = {
  applePodcastsVerifyTxt?: InputMaybe<Scalars['String']['input']>;
  copyright?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  itunesAuthor: Scalars['String']['input'];
  itunesCategory: Scalars['String']['input'];
  itunesExplicit: Scalars['Boolean']['input'];
  itunesType?: InputMaybe<Scalars['String']['input']>;
  language: Scalars['String']['input'];
  link?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateRichPodInput = {
  description: Scalars['String']['input'];
  origin: PodcastOriginInput;
  title: Scalars['String']['input'];
};

export type Enclosure = Card | Factbox | GeoMap | InteractiveChart | Markdown | Poll | Slideshow;

export enum EnclosureType {
  Card = 'Card',
  Factbox = 'Factbox',
  GeoMap = 'GeoMap',
  InteractiveChart = 'InteractiveChart',
  Markdown = 'Markdown',
  Poll = 'Poll',
  Slideshow = 'Slideshow'
}

export type EpisodeInfo = {
  __typename?: 'EpisodeInfo';
  artwork: Scalars['String']['output'];
  checksum: Scalars['String']['output'];
  guid: Scalars['String']['output'];
  length: Scalars['Int']['output'];
  link: Scalars['String']['output'];
  publicationDate: Scalars['String']['output'];
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type Factbox = BaseEnclosure & {
  __typename?: 'Factbox';
  links: Array<FactboxLink>;
  text: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type FactboxLink = {
  __typename?: 'FactboxLink';
  label: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type GeoMap = BaseEnclosure & {
  __typename?: 'GeoMap';
  description?: Maybe<Scalars['String']['output']>;
  geoJSON: Scalars['GeoJSON']['output'];
  title: Scalars['String']['output'];
};

export type HostedEpisode = {
  __typename?: 'HostedEpisode';
  audioBitrate?: Maybe<Scalars['Int']['output']>;
  audioByteSize: Scalars['Int']['output'];
  audioChannels?: Maybe<Scalars['Int']['output']>;
  audioDurationSeconds?: Maybe<Scalars['Float']['output']>;
  audioSampleRate?: Maybe<Scalars['Int']['output']>;
  audioUrl: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  episodeCoverUrl?: Maybe<Scalars['String']['output']>;
  hostedPodcastId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  itunesExplicit: Scalars['Boolean']['output'];
  publishedAt?: Maybe<Scalars['String']['output']>;
  richPodId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
  validationError?: Maybe<Scalars['String']['output']>;
  validationStatus: HostedEpisodeValidationStatus;
};

export enum HostedEpisodeValidationStatus {
  Invalid = 'invalid',
  Pending = 'pending',
  Valid = 'valid'
}

export type HostedPodcast = {
  __typename?: 'HostedPodcast';
  applePodcastsVerifyTxt?: Maybe<Scalars['String']['output']>;
  copyright?: Maybe<Scalars['String']['output']>;
  coverImageUrl: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  episodeCount: Scalars['Int']['output'];
  feedUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  itunesAuthor: Scalars['String']['output'];
  itunesCategory: Scalars['String']['output'];
  itunesExplicit: Scalars['Boolean']['output'];
  itunesType?: Maybe<Scalars['String']['output']>;
  language: Scalars['String']['output'];
  link: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type InstanceInfo = {
  __typename?: 'InstanceInfo';
  commitHash: Scalars['String']['output'];
  serverVersion: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type InteractiveChart = BaseEnclosure & {
  __typename?: 'InteractiveChart';
  chart: Scalars['JSON']['output'];
  chartFormat: ChartFormat;
  description?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type Markdown = BaseEnclosure & {
  __typename?: 'Markdown';
  text: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  completeRichPodVerification: Verification;
  createRichPod: RichPod;
  deleteHostedEpisode: Scalars['Boolean']['output'];
  deleteHostedPodcast: Scalars['Boolean']['output'];
  deleteRichPod: Scalars['Boolean']['output'];
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
  code: Scalars['String']['input'];
  feedUrl: Scalars['String']['input'];
};


export type MutationCreateRichPodArgs = {
  input: CreateRichPodInput;
};


export type MutationDeleteHostedEpisodeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteHostedPodcastArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteRichPodArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetRichPodChaptersArgs = {
  chapters: Array<ChapterInput>;
  id: Scalars['ID']['input'];
};


export type MutationSignInArgs = {
  input: SignInInput;
};


export type MutationSignInWithGoogleArgs = {
  idToken: Scalars['String']['input'];
};


export type MutationSignUpArgs = {
  input: SignUpInput;
};


export type MutationStartRichPodVerificationArgs = {
  feedUrl: Scalars['String']['input'];
};


export type MutationUpdateHostedPodcastArgs = {
  id: Scalars['ID']['input'];
  input: UpdateHostedPodcastInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateRichPodArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRichPodInput;
};

export type PaginatedHostedEpisodes = {
  __typename?: 'PaginatedHostedEpisodes';
  items: Array<HostedEpisode>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginatedHostedPodcasts = {
  __typename?: 'PaginatedHostedPodcasts';
  items: Array<HostedPodcast>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginatedRichPods = {
  __typename?: 'PaginatedRichPods';
  items: Array<RichPod>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginatedVerifications = {
  __typename?: 'PaginatedVerifications';
  items: Array<Verification>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type PodcastEpisode = {
  __typename?: 'PodcastEpisode';
  artworkUrl?: Maybe<Scalars['String']['output']>;
  guid: Scalars['String']['output'];
  link?: Maybe<Scalars['String']['output']>;
  media: PodcastMedia;
  title: Scalars['String']['output'];
};

export type PodcastEpisodeInput = {
  artworkUrl?: InputMaybe<Scalars['String']['input']>;
  guid: Scalars['String']['input'];
  link?: InputMaybe<Scalars['String']['input']>;
  media: PodcastMediaInput;
  title: Scalars['String']['input'];
};

export type PodcastEpisodeSearchResult = {
  __typename?: 'PodcastEpisodeSearchResult';
  artwork?: Maybe<Scalars['String']['output']>;
  creator?: Maybe<Scalars['String']['output']>;
  date?: Maybe<Scalars['String']['output']>;
  episodeGuid?: Maybe<Scalars['String']['output']>;
  episodeTitle: Scalars['String']['output'];
  episodeUrl?: Maybe<Scalars['String']['output']>;
  feedUrl: Scalars['String']['output'];
  genre?: Maybe<Scalars['String']['output']>;
  podcastTitle: Scalars['String']['output'];
};

export type PodcastInfo = {
  __typename?: 'PodcastInfo';
  artwork: Scalars['String']['output'];
  description: Scalars['String']['output'];
  link: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type PodcastMedia = {
  __typename?: 'PodcastMedia';
  checksum: Scalars['String']['output'];
  length: Scalars['Int']['output'];
  type: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type PodcastMediaInput = {
  checksum: Scalars['String']['input'];
  length: Scalars['Int']['input'];
  type: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type PodcastMetadata = {
  __typename?: 'PodcastMetadata';
  episodes: Array<EpisodeInfo>;
  podcast: PodcastInfo;
};

export type PodcastOrigin = {
  __typename?: 'PodcastOrigin';
  artworkUrl?: Maybe<Scalars['String']['output']>;
  episode: PodcastEpisode;
  feedUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  link?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  verified: Scalars['Boolean']['output'];
};

export type PodcastOriginInput = {
  artworkUrl?: InputMaybe<Scalars['String']['input']>;
  episode: PodcastEpisodeInput;
  feedUrl: Scalars['String']['input'];
  link?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type Poll = {
  __typename?: 'Poll';
  coloeus: Coloeus;
};

export type Query = {
  __typename?: 'Query';
  currentUser?: Maybe<User>;
  extractFeedUrl: Scalars['String']['output'];
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
  url: Scalars['String']['input'];
};


export type QueryHostedEpisodeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHostedEpisodesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  podcastId: Scalars['ID']['input'];
};


export type QueryHostedPodcastArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHostedPodcastsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPodcastEpisodeSearchArgs = {
  country?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  query: Scalars['String']['input'];
};


export type QueryPodcastMetadataArgs = {
  episodeGuid?: InputMaybe<Scalars['String']['input']>;
  feedUrl: Scalars['String']['input'];
};


export type QueryRecentPublishedRichPodsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRichPodArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserRichPodsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  state?: InputMaybe<RichPodState>;
};


export type QueryUserVerificationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type RichPod = {
  __typename?: 'RichPod';
  chapters: Array<Chapter>;
  createdAt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  editor?: Maybe<User>;
  explicit: Scalars['Boolean']['output'];
  hostedEpisodeId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  isHosted: Scalars['Boolean']['output'];
  origin: PodcastOrigin;
  publishedAt?: Maybe<Scalars['String']['output']>;
  state: RichPodState;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export enum RichPodState {
  Draft = 'draft',
  Published = 'published'
}

export enum RichPodVerificationStatus {
  Failed = 'failed',
  Pending = 'pending',
  Unverified = 'unverified',
  Verified = 'verified'
}

export type SignInInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SignUpInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type Slide = {
  __typename?: 'Slide';
  caption: Scalars['String']['output'];
  credit: Scalars['String']['output'];
  imageAlt: Scalars['String']['output'];
  imageUrl: Scalars['String']['output'];
};

export type Slideshow = BaseEnclosure & {
  __typename?: 'Slideshow';
  description?: Maybe<Scalars['String']['output']>;
  slides: Array<Slide>;
  title: Scalars['String']['output'];
};

export type UpdateHostedPodcastInput = {
  applePodcastsVerifyTxt?: InputMaybe<Scalars['String']['input']>;
  copyright?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  itunesAuthor?: InputMaybe<Scalars['String']['input']>;
  itunesCategory?: InputMaybe<Scalars['String']['input']>;
  itunesExplicit?: InputMaybe<Scalars['Boolean']['input']>;
  itunesType?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  link?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProfileInput = {
  biography?: InputMaybe<Scalars['String']['input']>;
  editorLanguage?: InputMaybe<Scalars['String']['input']>;
  publicEmail?: InputMaybe<Scalars['String']['input']>;
  publicName?: InputMaybe<Scalars['String']['input']>;
  socialAccounts?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRichPodInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  explicit?: InputMaybe<Scalars['Boolean']['input']>;
  state?: InputMaybe<RichPodState>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  biography?: Maybe<Scalars['String']['output']>;
  editorLanguage?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  publicEmail?: Maybe<Scalars['String']['output']>;
  publicName?: Maybe<Scalars['String']['output']>;
  /** Only populated for the current user (via currentUser query). */
  role?: Maybe<Scalars['String']['output']>;
  socialAccounts: Array<Scalars['String']['output']>;
  totalQuotaBytes?: Maybe<Scalars['Int']['output']>;
  usedQuotaBytes?: Maybe<Scalars['Int']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type Verification = {
  __typename?: 'Verification';
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  expiresAt: Scalars['String']['output'];
  feedUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  state: RichPodVerificationStatus;
  verificationTimestamp?: Maybe<Scalars['String']['output']>;
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  Enclosure: ( Card ) | ( Factbox ) | ( GeoMap ) | ( InteractiveChart ) | ( Markdown ) | ( Poll ) | ( Slideshow );
};

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  BaseEnclosure: ( Card ) | ( Factbox ) | ( GeoMap ) | ( InteractiveChart ) | ( Markdown ) | ( Slideshow );
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AuthPayload: ResolverTypeWrapper<AuthPayload>;
  BaseEnclosure: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['BaseEnclosure']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Card: ResolverTypeWrapper<Card>;
  CardOpenGraph: ResolverTypeWrapper<CardOpenGraph>;
  CardType: CardType;
  Chapter: ResolverTypeWrapper<Omit<Chapter, 'enclosure'> & { enclosure: ResolversTypes['Enclosure'] }>;
  ChapterInput: ChapterInput;
  ChartFormat: ChartFormat;
  Coloeus: ResolverTypeWrapper<Coloeus>;
  CreateHostedPodcastInput: CreateHostedPodcastInput;
  CreateRichPodInput: CreateRichPodInput;
  Enclosure: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['Enclosure']>;
  EnclosureType: EnclosureType;
  EpisodeInfo: ResolverTypeWrapper<EpisodeInfo>;
  Factbox: ResolverTypeWrapper<Factbox>;
  FactboxLink: ResolverTypeWrapper<FactboxLink>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GeoJSON: ResolverTypeWrapper<Scalars['GeoJSON']['output']>;
  GeoMap: ResolverTypeWrapper<GeoMap>;
  HostedEpisode: ResolverTypeWrapper<HostedEpisode>;
  HostedEpisodeValidationStatus: HostedEpisodeValidationStatus;
  HostedPodcast: ResolverTypeWrapper<HostedPodcast>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  InstanceInfo: ResolverTypeWrapper<InstanceInfo>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InteractiveChart: ResolverTypeWrapper<InteractiveChart>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Markdown: ResolverTypeWrapper<Markdown>;
  Mutation: ResolverTypeWrapper<{}>;
  PaginatedHostedEpisodes: ResolverTypeWrapper<PaginatedHostedEpisodes>;
  PaginatedHostedPodcasts: ResolverTypeWrapper<PaginatedHostedPodcasts>;
  PaginatedRichPods: ResolverTypeWrapper<Omit<PaginatedRichPods, 'items'> & { items: Array<ResolversTypes['RichPod']> }>;
  PaginatedVerifications: ResolverTypeWrapper<PaginatedVerifications>;
  PodcastEpisode: ResolverTypeWrapper<PodcastEpisode>;
  PodcastEpisodeInput: PodcastEpisodeInput;
  PodcastEpisodeSearchResult: ResolverTypeWrapper<PodcastEpisodeSearchResult>;
  PodcastInfo: ResolverTypeWrapper<PodcastInfo>;
  PodcastMedia: ResolverTypeWrapper<PodcastMedia>;
  PodcastMediaInput: PodcastMediaInput;
  PodcastMetadata: ResolverTypeWrapper<PodcastMetadata>;
  PodcastOrigin: ResolverTypeWrapper<PodcastOrigin>;
  PodcastOriginInput: PodcastOriginInput;
  Poll: ResolverTypeWrapper<Poll>;
  Query: ResolverTypeWrapper<{}>;
  RichPod: ResolverTypeWrapper<Omit<RichPod, 'chapters'> & { chapters: Array<ResolversTypes['Chapter']> }>;
  RichPodState: RichPodState;
  RichPodVerificationStatus: RichPodVerificationStatus;
  SignInInput: SignInInput;
  SignUpInput: SignUpInput;
  Slide: ResolverTypeWrapper<Slide>;
  Slideshow: ResolverTypeWrapper<Slideshow>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateHostedPodcastInput: UpdateHostedPodcastInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateRichPodInput: UpdateRichPodInput;
  User: ResolverTypeWrapper<User>;
  Verification: ResolverTypeWrapper<Verification>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AuthPayload: AuthPayload;
  BaseEnclosure: ResolversInterfaceTypes<ResolversParentTypes>['BaseEnclosure'];
  Boolean: Scalars['Boolean']['output'];
  Card: Card;
  CardOpenGraph: CardOpenGraph;
  Chapter: Omit<Chapter, 'enclosure'> & { enclosure: ResolversParentTypes['Enclosure'] };
  ChapterInput: ChapterInput;
  Coloeus: Coloeus;
  CreateHostedPodcastInput: CreateHostedPodcastInput;
  CreateRichPodInput: CreateRichPodInput;
  Enclosure: ResolversUnionTypes<ResolversParentTypes>['Enclosure'];
  EpisodeInfo: EpisodeInfo;
  Factbox: Factbox;
  FactboxLink: FactboxLink;
  Float: Scalars['Float']['output'];
  GeoJSON: Scalars['GeoJSON']['output'];
  GeoMap: GeoMap;
  HostedEpisode: HostedEpisode;
  HostedPodcast: HostedPodcast;
  ID: Scalars['ID']['output'];
  InstanceInfo: InstanceInfo;
  Int: Scalars['Int']['output'];
  InteractiveChart: InteractiveChart;
  JSON: Scalars['JSON']['output'];
  Markdown: Markdown;
  Mutation: {};
  PaginatedHostedEpisodes: PaginatedHostedEpisodes;
  PaginatedHostedPodcasts: PaginatedHostedPodcasts;
  PaginatedRichPods: Omit<PaginatedRichPods, 'items'> & { items: Array<ResolversParentTypes['RichPod']> };
  PaginatedVerifications: PaginatedVerifications;
  PodcastEpisode: PodcastEpisode;
  PodcastEpisodeInput: PodcastEpisodeInput;
  PodcastEpisodeSearchResult: PodcastEpisodeSearchResult;
  PodcastInfo: PodcastInfo;
  PodcastMedia: PodcastMedia;
  PodcastMediaInput: PodcastMediaInput;
  PodcastMetadata: PodcastMetadata;
  PodcastOrigin: PodcastOrigin;
  PodcastOriginInput: PodcastOriginInput;
  Poll: Poll;
  Query: {};
  RichPod: Omit<RichPod, 'chapters'> & { chapters: Array<ResolversParentTypes['Chapter']> };
  SignInInput: SignInInput;
  SignUpInput: SignUpInput;
  Slide: Slide;
  Slideshow: Slideshow;
  String: Scalars['String']['output'];
  UpdateHostedPodcastInput: UpdateHostedPodcastInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateRichPodInput: UpdateRichPodInput;
  User: User;
  Verification: Verification;
};

export type AuthPayloadResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = {
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BaseEnclosureResolvers<ContextType = any, ParentType extends ResolversParentTypes['BaseEnclosure'] = ResolversParentTypes['BaseEnclosure']> = {
  __resolveType: TypeResolveFn<'Card' | 'Factbox' | 'GeoMap' | 'InteractiveChart' | 'Markdown' | 'Slideshow', ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type CardResolvers<ContextType = any, ParentType extends ResolversParentTypes['Card'] = ResolversParentTypes['Card']> = {
  cardType?: Resolver<ResolversTypes['CardType'], ParentType, ContextType>;
  citationSource?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  citationUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  coverImageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  coverSource?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  imageAlt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  imageLink?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  openGraph?: Resolver<Maybe<ResolversTypes['CardOpenGraph']>, ParentType, ContextType>;
  quoteText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  visibleAsChapter?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CardOpenGraphResolvers<ContextType = any, ParentType extends ResolversParentTypes['CardOpenGraph'] = ResolversParentTypes['CardOpenGraph']> = {
  ogDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ogImageHeight?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  ogImageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ogImageWidth?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  ogTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChapterResolvers<ContextType = any, ParentType extends ResolversParentTypes['Chapter'] = ResolversParentTypes['Chapter']> = {
  begin?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  enclosure?: Resolver<ResolversTypes['Enclosure'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ColoeusResolvers<ContextType = any, ParentType extends ResolversParentTypes['Coloeus'] = ResolversParentTypes['Coloeus']> = {
  endpoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pollId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EnclosureResolvers<ContextType = any, ParentType extends ResolversParentTypes['Enclosure'] = ResolversParentTypes['Enclosure']> = {
  __resolveType: TypeResolveFn<'Card' | 'Factbox' | 'GeoMap' | 'InteractiveChart' | 'Markdown' | 'Poll' | 'Slideshow', ParentType, ContextType>;
};

export type EpisodeInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['EpisodeInfo'] = ResolversParentTypes['EpisodeInfo']> = {
  artwork?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  checksum?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  guid?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  link?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  publicationDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FactboxResolvers<ContextType = any, ParentType extends ResolversParentTypes['Factbox'] = ResolversParentTypes['Factbox']> = {
  links?: Resolver<Array<ResolversTypes['FactboxLink']>, ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FactboxLinkResolvers<ContextType = any, ParentType extends ResolversParentTypes['FactboxLink'] = ResolversParentTypes['FactboxLink']> = {
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface GeoJsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['GeoJSON'], any> {
  name: 'GeoJSON';
}

export type GeoMapResolvers<ContextType = any, ParentType extends ResolversParentTypes['GeoMap'] = ResolversParentTypes['GeoMap']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  geoJSON?: Resolver<ResolversTypes['GeoJSON'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type HostedEpisodeResolvers<ContextType = any, ParentType extends ResolversParentTypes['HostedEpisode'] = ResolversParentTypes['HostedEpisode']> = {
  audioBitrate?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  audioByteSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  audioChannels?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  audioDurationSeconds?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  audioSampleRate?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  audioUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  episodeCoverUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hostedPodcastId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  itunesExplicit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  richPodId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  validationError?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  validationStatus?: Resolver<ResolversTypes['HostedEpisodeValidationStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type HostedPodcastResolvers<ContextType = any, ParentType extends ResolversParentTypes['HostedPodcast'] = ResolversParentTypes['HostedPodcast']> = {
  applePodcastsVerifyTxt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  copyright?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  coverImageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  episodeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  feedUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  itunesAuthor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  itunesCategory?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  itunesExplicit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  itunesType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  link?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InstanceInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['InstanceInfo'] = ResolversParentTypes['InstanceInfo']> = {
  commitHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  serverVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InteractiveChartResolvers<ContextType = any, ParentType extends ResolversParentTypes['InteractiveChart'] = ResolversParentTypes['InteractiveChart']> = {
  chart?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  chartFormat?: Resolver<ResolversTypes['ChartFormat'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MarkdownResolvers<ContextType = any, ParentType extends ResolversParentTypes['Markdown'] = ResolversParentTypes['Markdown']> = {
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  completeRichPodVerification?: Resolver<ResolversTypes['Verification'], ParentType, ContextType, RequireFields<MutationCompleteRichPodVerificationArgs, 'code' | 'feedUrl'>>;
  createRichPod?: Resolver<ResolversTypes['RichPod'], ParentType, ContextType, RequireFields<MutationCreateRichPodArgs, 'input'>>;
  deleteHostedEpisode?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteHostedEpisodeArgs, 'id'>>;
  deleteHostedPodcast?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteHostedPodcastArgs, 'id'>>;
  deleteRichPod?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteRichPodArgs, 'id'>>;
  setRichPodChapters?: Resolver<ResolversTypes['RichPod'], ParentType, ContextType, RequireFields<MutationSetRichPodChaptersArgs, 'chapters' | 'id'>>;
  signIn?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationSignInArgs, 'input'>>;
  signInWithGoogle?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationSignInWithGoogleArgs, 'idToken'>>;
  signUp?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationSignUpArgs, 'input'>>;
  startRichPodVerification?: Resolver<ResolversTypes['Verification'], ParentType, ContextType, RequireFields<MutationStartRichPodVerificationArgs, 'feedUrl'>>;
  updateHostedPodcast?: Resolver<ResolversTypes['HostedPodcast'], ParentType, ContextType, RequireFields<MutationUpdateHostedPodcastArgs, 'id' | 'input'>>;
  updateProfile?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateProfileArgs, 'input'>>;
  updateRichPod?: Resolver<ResolversTypes['RichPod'], ParentType, ContextType, RequireFields<MutationUpdateRichPodArgs, 'id' | 'input'>>;
};

export type PaginatedHostedEpisodesResolvers<ContextType = any, ParentType extends ResolversParentTypes['PaginatedHostedEpisodes'] = ResolversParentTypes['PaginatedHostedEpisodes']> = {
  items?: Resolver<Array<ResolversTypes['HostedEpisode']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PaginatedHostedPodcastsResolvers<ContextType = any, ParentType extends ResolversParentTypes['PaginatedHostedPodcasts'] = ResolversParentTypes['PaginatedHostedPodcasts']> = {
  items?: Resolver<Array<ResolversTypes['HostedPodcast']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PaginatedRichPodsResolvers<ContextType = any, ParentType extends ResolversParentTypes['PaginatedRichPods'] = ResolversParentTypes['PaginatedRichPods']> = {
  items?: Resolver<Array<ResolversTypes['RichPod']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PaginatedVerificationsResolvers<ContextType = any, ParentType extends ResolversParentTypes['PaginatedVerifications'] = ResolversParentTypes['PaginatedVerifications']> = {
  items?: Resolver<Array<ResolversTypes['Verification']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PodcastEpisodeResolvers<ContextType = any, ParentType extends ResolversParentTypes['PodcastEpisode'] = ResolversParentTypes['PodcastEpisode']> = {
  artworkUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  guid?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  link?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  media?: Resolver<ResolversTypes['PodcastMedia'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PodcastEpisodeSearchResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['PodcastEpisodeSearchResult'] = ResolversParentTypes['PodcastEpisodeSearchResult']> = {
  artwork?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  creator?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  date?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  episodeGuid?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  episodeTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  episodeUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  feedUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  genre?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  podcastTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PodcastInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['PodcastInfo'] = ResolversParentTypes['PodcastInfo']> = {
  artwork?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  link?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PodcastMediaResolvers<ContextType = any, ParentType extends ResolversParentTypes['PodcastMedia'] = ResolversParentTypes['PodcastMedia']> = {
  checksum?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PodcastMetadataResolvers<ContextType = any, ParentType extends ResolversParentTypes['PodcastMetadata'] = ResolversParentTypes['PodcastMetadata']> = {
  episodes?: Resolver<Array<ResolversTypes['EpisodeInfo']>, ParentType, ContextType>;
  podcast?: Resolver<ResolversTypes['PodcastInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PodcastOriginResolvers<ContextType = any, ParentType extends ResolversParentTypes['PodcastOrigin'] = ResolversParentTypes['PodcastOrigin']> = {
  artworkUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  episode?: Resolver<ResolversTypes['PodcastEpisode'], ParentType, ContextType>;
  feedUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  link?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PollResolvers<ContextType = any, ParentType extends ResolversParentTypes['Poll'] = ResolversParentTypes['Poll']> = {
  coloeus?: Resolver<ResolversTypes['Coloeus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  currentUser?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  extractFeedUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<QueryExtractFeedUrlArgs, 'url'>>;
  hostedEpisode?: Resolver<Maybe<ResolversTypes['HostedEpisode']>, ParentType, ContextType, RequireFields<QueryHostedEpisodeArgs, 'id'>>;
  hostedEpisodes?: Resolver<ResolversTypes['PaginatedHostedEpisodes'], ParentType, ContextType, RequireFields<QueryHostedEpisodesArgs, 'podcastId'>>;
  hostedPodcast?: Resolver<Maybe<ResolversTypes['HostedPodcast']>, ParentType, ContextType, RequireFields<QueryHostedPodcastArgs, 'id'>>;
  hostedPodcasts?: Resolver<ResolversTypes['PaginatedHostedPodcasts'], ParentType, ContextType, Partial<QueryHostedPodcastsArgs>>;
  instanceInfo?: Resolver<ResolversTypes['InstanceInfo'], ParentType, ContextType>;
  podcastEpisodeSearch?: Resolver<Array<ResolversTypes['PodcastEpisodeSearchResult']>, ParentType, ContextType, RequireFields<QueryPodcastEpisodeSearchArgs, 'query'>>;
  podcastMetadata?: Resolver<ResolversTypes['PodcastMetadata'], ParentType, ContextType, RequireFields<QueryPodcastMetadataArgs, 'feedUrl'>>;
  recentPublishedRichPods?: Resolver<ResolversTypes['PaginatedRichPods'], ParentType, ContextType, Partial<QueryRecentPublishedRichPodsArgs>>;
  richPod?: Resolver<Maybe<ResolversTypes['RichPod']>, ParentType, ContextType, RequireFields<QueryRichPodArgs, 'id'>>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUserArgs, 'id'>>;
  userRichPods?: Resolver<ResolversTypes['PaginatedRichPods'], ParentType, ContextType, Partial<QueryUserRichPodsArgs>>;
  userVerifications?: Resolver<ResolversTypes['PaginatedVerifications'], ParentType, ContextType, Partial<QueryUserVerificationsArgs>>;
};

export type RichPodResolvers<ContextType = any, ParentType extends ResolversParentTypes['RichPod'] = ResolversParentTypes['RichPod']> = {
  chapters?: Resolver<Array<ResolversTypes['Chapter']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  editor?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  explicit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hostedEpisodeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isHosted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  origin?: Resolver<ResolversTypes['PodcastOrigin'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  state?: Resolver<ResolversTypes['RichPodState'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SlideResolvers<ContextType = any, ParentType extends ResolversParentTypes['Slide'] = ResolversParentTypes['Slide']> = {
  caption?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  credit?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  imageAlt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  imageUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SlideshowResolvers<ContextType = any, ParentType extends ResolversParentTypes['Slideshow'] = ResolversParentTypes['Slideshow']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slides?: Resolver<Array<ResolversTypes['Slide']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  biography?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  editorLanguage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  publicEmail?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  publicName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  socialAccounts?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  totalQuotaBytes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  usedQuotaBytes?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  website?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VerificationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Verification'] = ResolversParentTypes['Verification']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  feedUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['RichPodVerificationStatus'], ParentType, ContextType>;
  verificationTimestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  BaseEnclosure?: BaseEnclosureResolvers<ContextType>;
  Card?: CardResolvers<ContextType>;
  CardOpenGraph?: CardOpenGraphResolvers<ContextType>;
  Chapter?: ChapterResolvers<ContextType>;
  Coloeus?: ColoeusResolvers<ContextType>;
  Enclosure?: EnclosureResolvers<ContextType>;
  EpisodeInfo?: EpisodeInfoResolvers<ContextType>;
  Factbox?: FactboxResolvers<ContextType>;
  FactboxLink?: FactboxLinkResolvers<ContextType>;
  GeoJSON?: GraphQLScalarType;
  GeoMap?: GeoMapResolvers<ContextType>;
  HostedEpisode?: HostedEpisodeResolvers<ContextType>;
  HostedPodcast?: HostedPodcastResolvers<ContextType>;
  InstanceInfo?: InstanceInfoResolvers<ContextType>;
  InteractiveChart?: InteractiveChartResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Markdown?: MarkdownResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PaginatedHostedEpisodes?: PaginatedHostedEpisodesResolvers<ContextType>;
  PaginatedHostedPodcasts?: PaginatedHostedPodcastsResolvers<ContextType>;
  PaginatedRichPods?: PaginatedRichPodsResolvers<ContextType>;
  PaginatedVerifications?: PaginatedVerificationsResolvers<ContextType>;
  PodcastEpisode?: PodcastEpisodeResolvers<ContextType>;
  PodcastEpisodeSearchResult?: PodcastEpisodeSearchResultResolvers<ContextType>;
  PodcastInfo?: PodcastInfoResolvers<ContextType>;
  PodcastMedia?: PodcastMediaResolvers<ContextType>;
  PodcastMetadata?: PodcastMetadataResolvers<ContextType>;
  PodcastOrigin?: PodcastOriginResolvers<ContextType>;
  Poll?: PollResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RichPod?: RichPodResolvers<ContextType>;
  Slide?: SlideResolvers<ContextType>;
  Slideshow?: SlideshowResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  Verification?: VerificationResolvers<ContextType>;
};

