import { graphqlSdk } from "@/lib/graphql";
import i18n from "@/i18n";
import {
    EnclosureType,
    type GetRichPodQuery,
    type RichPodState,
} from "@/graphql/generated";
import type {
    EditorChapter,
    EditorEnclosure,
    EditorSlide,
    PodcastOrigin,
    RichPodForEdit,
} from "@/types/editor";

type GraphQLRichPod = NonNullable<GetRichPodQuery["richPod"]>;

type GraphQLSlideshow = Extract<
    GraphQLRichPod["chapters"][number]["enclosure"],
    { __typename: "Slideshow" }
>;
type GraphQLSlide = GraphQLSlideshow["slides"][number];
const t = i18n.global.t;

function mapSlide(slide: GraphQLSlide): EditorSlide {
    return { ...slide };
}

function mapEnclosure(enclosure: GraphQLRichPod["chapters"][number]["enclosure"]): EditorEnclosure {
    switch (enclosure.__typename) {
        case "Markdown":
            return {
                __typename: enclosure.__typename,
                title: enclosure.title,
                text: enclosure.text,
            };
        case "InteractiveChart":
            // Chart format is explicitly specified in chartFormat field
            // Plain-data: chart = { data, metadata }
            // ECharts: chart = { series, xAxis, ..., metadata }
            return {
                __typename: enclosure.__typename,
                title: enclosure.title,
                description: enclosure.description ?? undefined,
                chartFormat: enclosure.chartFormat,
                chart: enclosure.chart,
            };
        case "GeoMap":
            return {
                __typename: enclosure.__typename,
                title: enclosure.title,
                description: enclosure.description ?? undefined,
                geoJSON: enclosure.geoJSON,
            };
        case "Slideshow":
            return {
                __typename: enclosure.__typename,
                title: enclosure.title,
                description: enclosure.description ?? undefined,
                slides: enclosure.slides.map(mapSlide),
            };
        case "Card":
            return {
                __typename: enclosure.__typename,
                title: enclosure.title,
                cardType: enclosure.cardType,
                visibleAsChapter: enclosure.visibleAsChapter,
                url: enclosure.url ?? undefined,
                openGraph: enclosure.openGraph
                    ? {
                          ogTitle: enclosure.openGraph.ogTitle,
                          ogDescription: enclosure.openGraph.ogDescription,
                          ogImageUrl: enclosure.openGraph.ogImageUrl,
                          ogImageWidth: enclosure.openGraph.ogImageWidth ?? undefined,
                          ogImageHeight: enclosure.openGraph.ogImageHeight ?? undefined,
                      }
                    : undefined,
                description: enclosure.description ?? undefined,
                coverSource: (enclosure.coverSource as "podcast" | "episode" | undefined) ?? undefined,
                quoteText: enclosure.quoteText ?? undefined,
                citationSource: enclosure.citationSource ?? undefined,
                citationUrl: enclosure.citationUrl ?? undefined,
                imageUrl: enclosure.imageUrl ?? undefined,
                imageAlt: enclosure.imageAlt ?? undefined,
                imageLink: enclosure.imageLink ?? undefined,
            };
        default:
            return enclosure as EditorEnclosure;
    }
}

function mapChapter(chapter: GraphQLRichPod["chapters"][number]): EditorChapter {
    return {
        begin: chapter.begin,
        enclosure: mapEnclosure(chapter.enclosure),
    };
}

function mapOrigin(origin: GraphQLRichPod["origin"]): PodcastOrigin {
    return {
        title: origin.title,
        link: origin.link,
        artworkUrl: origin.artworkUrl,
        verified: origin.verified,
        episode: origin.episode
            ? {
                  title: origin.episode.title,
                  link: origin.episode.link,
                  artworkUrl: origin.episode.artworkUrl,
                  media: {
                      url: origin.episode.media.url,
                      mimeType: origin.episode.media.type,
                      durationInSeconds: origin.episode.media.length,
                  },
              }
            : undefined,
    };
}

export async function fetchRichPodById(id: string): Promise<RichPodForEdit> {
    const response = await graphqlSdk.GetRichPod({ id });

    const richpod = response.richPod;
    if (!richpod) {
        throw new Error(t("editor.richPodNotFound"));
    }

    return {
        id: richpod.id,
        title: richpod.title,
        description: richpod.description,
        state: richpod.state as RichPodState,
        origin: mapOrigin(richpod.origin),
        chapters: richpod.chapters.map(mapChapter),
        isHosted: richpod.isHosted,
        hostedEpisodeId: richpod.hostedEpisodeId ?? null,
        explicit: richpod.explicit,
    };
}

function removeUndefined(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(removeUndefined);
    }
    if (value && typeof value === "object") {
        return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
            (acc, [key, val]) => {
                if (val === undefined) {
                    return acc;
                }
                acc[key] = removeUndefined(val);
                return acc;
            },
            {},
        );
    }
    return value;
}

function serializeEnclosure(enclosure: EditorEnclosure): { type: EnclosureType; payload: Record<string, unknown> } {
    const { __typename, ...rest } = enclosure;
    const enclosureType = (__typename ?? "Markdown") as EnclosureType;

    const payloadWithDefaults = __typename === "Factbox"
        ? { ...rest, links: Array.isArray(rest.links) ? rest.links : [] }
        : rest;

    const payloadWithoutOutputOnlyFields = { ...payloadWithDefaults };
    if (__typename === "Card") {
        delete payloadWithoutOutputOnlyFields.coverImageUrl;
    }

    const payload = removeUndefined(payloadWithoutOutputOnlyFields) as Record<string, unknown>;
    return { type: enclosureType, payload };
}

export async function saveRichPod(id: string, richpod: RichPodForEdit): Promise<RichPodForEdit> {
    await graphqlSdk.UpdateRichPod({
        id,
        input: {
            title: richpod.title,
            description: richpod.description,
            state: richpod.state,
            explicit: richpod.explicit,
        },
    });

    const chapters = richpod.chapters.map(({ begin, enclosure }) => {
        const { type, payload } = serializeEnclosure(enclosure);
        return {
            begin,
            enclosureType: type,
            enclosure: payload,
        };
    });

    await graphqlSdk.SetRichPodChapters({
        id,
        chapters,
    });

    return fetchRichPodById(id);
}
