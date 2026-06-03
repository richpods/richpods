// Firestore collections (kept local — this function is self-contained, like the
// other cloud functions).
export const RICHPODS_COLLECTION = "richpods";
export const CHAPTERS_SUBCOLLECTION = "chapters";
export const HOSTED_EPISODES_COLLECTION = "hosted_episodes";
export const TRANSCRIPTIONS_COLLECTION = "transcriptions";
export const CHAPTER_GENERATIONS_COLLECTION = "chapter_generations";
export const TRANSCRIPT_GENERATIONS_COLLECTION = "transcript_generations";

// Enclosure discriminators this function can produce. Must match the server's
// EnclosureType string values so accepted suggestions validate on save.
export const EnclosureType = {
    MARKDOWN: "Markdown",
    GEO_MAP: "GeoMap",
    CARD: "Card",
} as const;

export type EnclosureTypeValue = (typeof EnclosureType)[keyof typeof EnclosureType];

export const ChapterGenerationState = {
    PENDING: "pending",
    TRANSCRIBING: "transcribing",
    GENERATING: "generating",
    COMPLETED: "completed",
    FAILED: "failed",
} as const;

export type ChapterGenerationStateValue =
    (typeof ChapterGenerationState)[keyof typeof ChapterGenerationState];

export type MarkdownLink = { label: string; url: string };

export type CardOpenGraph = {
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
};

/**
 * Output enclosure shape. Only the fields used by the generated chapter types
 * (Markdown, Card Link/Citation, GeoMap) are populated; the shape matches the
 * server's Enclosure interface so it passes server-side validation on accept.
 */
export type GeneratedEnclosure = {
    title: string;
    text?: string;
    description?: string;
    links?: MarkdownLink[];
    geoJSON?: Record<string, unknown>;
    cardType?: "LINK" | "CITATION";
    visibleAsChapter?: boolean;
    url?: string;
    openGraph?: CardOpenGraph;
    quoteText?: string;
    citationSource?: string;
    citationUrl?: string;
};

export type ChapterSuggestion = {
    begin: string;
    enclosureType: EnclosureTypeValue;
    enclosure: GeneratedEnclosure;
};

export type TranscriptSegment = {
    begin: string;
    end: string;
    text: string;
    language: string;
    emotion: "Happy" | "Sad" | "Angry" | "Informative" | "Neutral";
    speaker?: string;
};

export type Transcript = {
    summary: string;
    language: string;
    segments: TranscriptSegment[];
};

/**
 * The kind of real-world thing a topic refers to. A natural-language signal the
 * model is good at — used to verify and disambiguate the Wikidata candidate
 * server-side, never to derive an identifier.
 */
export const ENTITY_TYPES = ["person", "organization", "place", "work", "concept"] as const;
export type AnalysisEntityType = (typeof ENTITY_TYPES)[number];

export type AnalysisTopic = {
    title: string;
    explainer: string;
    begin: string;
    wikidataQuery?: string;
    entityType?: AnalysisEntityType;
};

/** A Wikidata search hit offered to the model when disambiguating a topic. */
export type WikidataCandidate = {
    qid: string;
    label: string;
    description: string;
};

export type AnalysisQuote = {
    quoteText: string;
    source: string;
    begin: string;
};

export type AnalysisLink = {
    url: string;
    title: string;
    begin: string;
};

export type AnalysisPlace = {
    name: string;
    description?: string;
    /** Precise, fully-qualified query used to geocode the place authoritatively. */
    geocodeQuery?: string;
    /** Model-estimated coordinates, used only as a fallback when geocoding misses. */
    latitude?: number;
    longitude?: number;
    begin: string;
};

/** A resolved point location plus the geocoder's recommended map viewport. */
export type GeocodedLocation = {
    latitude: number;
    longitude: number;
    viewport?: { south: number; west: number; north: number; east: number };
};

export type AnalysisResult = {
    topics: AnalysisTopic[];
    quotes: AnalysisQuote[];
    links: AnalysisLink[];
    places: AnalysisPlace[];
};

export type AudioSource = {
    url: string;
    mimeType: string;
    byteSize: number | null;
    durationSeconds: number | null;
    trusted: boolean;
    /** Set for hosted episodes — audio is downloaded from GCS rather than the URL. */
    gcsAudioName?: string;
};
