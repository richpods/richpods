import type { RichPodState } from "@/graphql/generated";

// Chart format discriminator
// Values match GraphQL enum (used when receiving from API)
export const ChartFormat = {
    PLAIN_DATA: "PLAIN_DATA",
    ECHARTS: "ECHARTS",
} as const;

export type ChartFormatValue = (typeof ChartFormat)[keyof typeof ChartFormat];

// Plain data chart types (aligned with server validation)
export const PlainDataChartType = {
    BAR_CHART: "BAR_CHART",
    LINE_CHART: "LINE_CHART",
    SMOOTH_LINE_CHART: "SMOOTH_LINE_CHART",
    AREA_CHART: "AREA_CHART",
    PIE_CHART: "PIE_CHART",
    SCATTER_CHART: "SCATTER_CHART",
} as const;

export type PlainDataChartTypeValue = (typeof PlainDataChartType)[keyof typeof PlainDataChartType];

export type ChartMetadata = {
    aspectRatio: string;
};

export type PlainDataChartMetadata = ChartMetadata & {
    type: PlainDataChartTypeValue;
};

/**
 * Chart format is explicitly specified in enclosure.chartFormat
 *
 * Plain-data format (chartFormat: "plain-data"):
 *   chart = { data: [...], metadata: { type, aspectRatio } }
 *
 * ECharts format (chartFormat: "echarts"):
 *   chart = { series: [...], xAxis: {...}, ..., metadata: { aspectRatio } }
 */

export type PlainDataChart = {
    data: (string | number)[][];
    metadata: PlainDataChartMetadata;
};

export type EChartsChartData = Record<string, unknown> & {
    metadata: ChartMetadata;
};

// Type guards for chart format - use explicit chartFormat field

/**
 * Check if an enclosure uses plain-data format
 */
export function isPlainDataEnclosure(enclosure: unknown): boolean {
    if (enclosure === null || typeof enclosure !== "object") return false;
    const enc = enclosure as { chartFormat?: string };
    return enc.chartFormat === ChartFormat.PLAIN_DATA;
}

/**
 * Check if an enclosure uses ECharts format
 */
export function isEChartsEnclosure(enclosure: unknown): boolean {
    if (enclosure === null || typeof enclosure !== "object") return false;
    const enc = enclosure as { chartFormat?: string };
    return enc.chartFormat === ChartFormat.ECHARTS;
}

export type EditorSlide = {
    imageUrl: string;
    imageAlt: string;
    caption: string;
    credit: string;
};

export type EditorColoeus = {
    endpoint: string;
    pollId: string;
};

export type EditorFactboxLink = {
    label: string;
    url: string;
};

export type EditorCardOpenGraph = {
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImageUrl?: string | null;
    ogImageWidth?: number | null;
    ogImageHeight?: number | null;
};

export type EditorEnclosure = {
    __typename: string;
    title?: string;
    text?: string;
    description?: string;
    // For InteractiveChart - format discriminator
    chartFormat?: ChartFormatValue;
    // For InteractiveChart - all chart data is inside this field
    // Plain-data: { data, metadata }
    // ECharts: { series, xAxis, ..., metadata }
    chart?: Record<string, unknown>;
    // For GeoMap
    geoJSON?: Record<string, unknown>;
    // For Slideshow
    slides?: EditorSlide[];
    // For Poll
    coloeus?: EditorColoeus;
    // For Factbox
    links?: EditorFactboxLink[];
    // For Card
    cardType?: "LINK" | "COVER" | "CITATION" | "IMAGE" | "BLANK";
    visibleAsChapter?: boolean;
    url?: string;
    openGraph?: EditorCardOpenGraph;
    coverSource?: "podcast" | "episode";
    quoteText?: string;
    citationSource?: string;
    citationUrl?: string;
    imageUrl?: string;
    imageAlt?: string;
    imageLink?: string;
    [key: string]: unknown;
};

export type EditorChapter = {
    begin: string;
    enclosure: EditorEnclosure;
    _isNew?: boolean; // Marks locally created chapters, stripped when saving
};

export interface PodcastOrigin {
    title: string;
    link?: string | null;
    artworkUrl?: string | null;
    verified: boolean;
    episode?: {
        title: string;
        link?: string | null;
        artworkUrl?: string | null;
        media?: {
            url?: string | null;
            mimeType?: string | null;
            durationInSeconds?: number | null;
        };
    };
}

export interface EnclosureType {
    type: string;
    icon: string;
}

export interface StartTimeAddState {
    disabled: boolean;
    reason: string;
}

export type RichPodForEdit = {
    id?: string;
    title: string;
    description: string;
    state: RichPodState;
    origin: PodcastOrigin | null;
    chapters: EditorChapter[];
    isHosted: boolean;
    hostedEpisodeId?: string | null;
    explicit: boolean;
};
