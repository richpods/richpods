<template>
  <div v-if="error" class="podcast-error">
    <p class="podcast-error__message">{{ $t("podcastSite.loadError") }}</p>
  </div>
  <div v-else-if="podcast">
    <RipoHero>
      <div class="podcast-hero">
        <div class="podcast-hero__cover-wrapper">
          <img
            :src="podcast.coverImageUrl"
            :alt="podcast.title"
            class="podcast-hero__cover"
            loading="eager"
            width="400"
            height="400"
          />
        </div>
        <div class="podcast-hero__title-group">
          <p class="podcast-hero__author">{{ podcast.itunesAuthor }}</p>
          <h1 class="podcast-hero__title">{{ podcast.title }}</h1>
        </div>
      </div>
    </RipoHero>

    <div class="podcast-site">
      <section class="podcast-section podcast-description">
        <p>{{ podcast.description }}</p>
      </section>

      <PodcastSubscribe :podcast="podcast" />

      <section class="podcast-section podcast-episodes">
        <h2>{{ $t("podcastSite.episodes.title") }}</h2>
        <p v-if="episodes.length === 0" class="podcast-episodes__empty">
          {{ $t("podcastSite.episodes.empty") }}
        </p>
        <ol v-else class="podcast-episodes__list">
          <li v-for="episode in episodes" :key="episode.id">
            <PodcastEpisodeItem
              :episode="episode"
              :player-url="expandPlayerUrl(episode.richPodId)"
            />
          </li>
        </ol>
        <div v-if="nextCursor" class="podcast-episodes__more">
          <button
            class="podcast-episodes__more-button"
            :disabled="loadingMore"
            @click="loadMore"
          >
            {{
              loadingMore
                ? $t("podcastSite.episodes.loading")
                : $t("podcastSite.episodes.showMore")
            }}
          </button>
        </div>
      </section>

      <PodcastMeta :podcast="podcast" />

      <section class="podcast-section podcast-report">
        <a class="podcast-report__button" :href="reportMailtoLink">
          {{ $t("podcastSite.report.button") }}
        </a>
        <p class="podcast-report__note">{{ $t("podcastSite.report.note") }}</p>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import PodcastEpisodeItem from "~/components/PodcastEpisodeItem.vue";
import PodcastMeta from "~/components/PodcastMeta.vue";
import PodcastSubscribe from "~/components/PodcastSubscribe.vue";
import RipoHero from "~/components/RipoHero.vue";
import type {
  GraphQLResponse,
  PaginatedEpisodes,
  PublicHostedEpisode,
  PublicHostedPodcast,
} from "~/types";

const EPISODES_PAGE_SIZE = 10;

const PODCAST_QUERY = `
    query PublicHostedPodcast($id: ID!, $first: Int!) {
        publicHostedPodcast(id: $id) {
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
            customWebsite
            platformLinkApplePodcasts
            platformLinkSpotify
            platformLinkAmazonMusic
            platformLinkYouTubeMusic
            coverImageUrl
            feedUrl
        }
        publicHostedPodcastEpisodes(podcastId: $id, first: $first) {
            items {
                id
                richPodId
                title
                description
                publishedAt
                explicit
                audioDurationSeconds
                episodeCoverUrl
            }
            nextCursor
        }
    }
`;

const EPISODES_QUERY = `
    query PublicHostedPodcastEpisodes($id: ID!, $first: Int!, $after: String) {
        publicHostedPodcastEpisodes(podcastId: $id, first: $first, after: $after) {
            items {
                id
                richPodId
                title
                description
                publishedAt
                explicit
                audioDurationSeconds
                episodeCoverUrl
            }
            nextCursor
        }
    }
`;

// Client-only rendering. The deployment target is static hosting so this page
// cannot run on the server at request time. The host must map /podcast/* to
// the SPA shell (Firebase Hosting rewrite, Netlify `_redirects`, etc.). When
// deployed on the full Nuxt stack, remove `ssr: false` to restore SSR and the
// proper 302 redirect for `customWebsite=true`.
definePageMeta({
  ssr: false,
  i18n: {
    paths: {
      de: "/podcast/[id]",
      en: "/podcast/[id]",
    },
  },
});

const route = useRoute();
const config = useRuntimeConfig();
const { t } = useI18n();

const podcastId = computed(() => String(route.params.id ?? ""));
const graphqlEndpoint = config.public.graphqlEndpoint.trim();

function expandPlayerUrl(richPodId: string): string {
  return config.public.playerUrlPattern.replace(
    "{ID}",
    encodeURIComponent(richPodId),
  );
}

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  if (!graphqlEndpoint) {
    throw new Error(
      "Missing NUXT_PUBLIC_GRAPHQL_ENDPOINT runtime config value",
    );
  }
  const response = await $fetch<GraphQLResponse<T>>(graphqlEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { query, variables },
  });

  const firstErrorMessage = response.errors
    ?.map((errorItem) => errorItem.message?.trim())
    .find((message) => Boolean(message));
  if (firstErrorMessage) {
    throw new Error(firstErrorMessage);
  }
  if (!response.data) {
    throw new Error("No data received from API");
  }
  return response.data;
}

type InitialData = {
  publicHostedPodcast: PublicHostedPodcast | null;
  publicHostedPodcastEpisodes: PaginatedEpisodes;
};

const { data, error } = await useAsyncData(`podcast-${podcastId.value}`, () =>
  graphqlRequest<InitialData>(PODCAST_QUERY, {
    id: podcastId.value,
    first: EPISODES_PAGE_SIZE,
  }),
);

// If the podcast exists and the owner opted for a custom website, honor it with
// a temporary (302) redirect. Temporary so flipping the toggle back to the
// auto-generated site re-exposes this page without cached permanent redirects.
// Skip if the configured link resolves to this very page, otherwise the browser
// would navigate to itself on every load and the site would become unusable.
function isSelfUrl(candidate: string): boolean {
  if (!import.meta.client) return false;
  try {
    const target = new URL(candidate, window.location.origin);
    return (
      target.origin === window.location.origin &&
      target.pathname.replace(/\/$/, "") ===
        window.location.pathname.replace(/\/$/, "")
    );
  } catch {
    return false;
  }
}

if (
  data.value?.publicHostedPodcast?.customWebsite &&
  data.value.publicHostedPodcast.link
) {
  const customLink = data.value.publicHostedPodcast.link;
  if (!isSelfUrl(customLink)) {
    await navigateTo(customLink, {
      external: true,
      redirectCode: 302,
    });
  }
}

if (!error.value && !data.value?.publicHostedPodcast) {
  throw createError({
    statusCode: 404,
    statusMessage: "Podcast not found",
    fatal: true,
  });
}

const podcast = computed(() => data.value?.publicHostedPodcast ?? null);
const episodes = ref<PublicHostedEpisode[]>(
  data.value?.publicHostedPodcastEpisodes.items ?? [],
);
const nextCursor = ref<string | null>(
  data.value?.publicHostedPodcastEpisodes.nextCursor ?? null,
);
const loadingMore = ref(false);

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return;
  loadingMore.value = true;
  try {
    const page = await graphqlRequest<{
      publicHostedPodcastEpisodes: PaginatedEpisodes;
    }>(EPISODES_QUERY, {
      id: podcastId.value,
      first: EPISODES_PAGE_SIZE,
      after: nextCursor.value,
    });
    episodes.value = [
      ...episodes.value,
      ...page.publicHostedPodcastEpisodes.items,
    ];
    nextCursor.value = page.publicHostedPodcastEpisodes.nextCursor;
  } finally {
    loadingMore.value = false;
  }
}

// Mirrors the fallback used by the player (see player/src/components/InfoDialog.vue).
// Overridable per-deployment via the NUXT_PUBLIC_REPORT_EMAIL runtime config key,
// which must be declared as `reportEmail` in `runtimeConfig.public` (nuxt.config.ts).
const REPORT_EMAIL_FALLBACK = "contact@richpods.org";
const configuredReportEmail = (config.public as { reportEmail?: string })
  .reportEmail;
const reportEmail =
  typeof configuredReportEmail === "string" && configuredReportEmail.length > 0
    ? configuredReportEmail
    : REPORT_EMAIL_FALLBACK;

const reportMailtoLink = computed(() => {
  const p = podcast.value;
  if (!p) return `mailto:${reportEmail}`;
  const subject = encodeURIComponent(`Report podcast ${p.title} (${p.id})`);
  return `mailto:${reportEmail}?subject=${subject}`;
});

useHead(() => {
  const p = podcast.value;
  if (!p) {
    return { title: t("podcastSite.loadError") };
  }
  return {
    title: p.title,
    link: [
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: `${p.title} — RSS`,
        href: p.feedUrl,
      },
    ],
  };
});

useSeoMeta({
  description: () => podcast.value?.description ?? "",
  ogTitle: () => podcast.value?.title ?? "",
  ogDescription: () => podcast.value?.description ?? "",
  ogImage: () => podcast.value?.coverImageUrl ?? "",
  ogImageAlt: () => podcast.value?.title ?? "",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: () => podcast.value?.title ?? "",
  twitterDescription: () => podcast.value?.description ?? "",
  twitterImage: () => podcast.value?.coverImageUrl ?? "",
});
</script>
<style scoped lang="scss">
.podcast-site {
  max-width: var(--content-max-width);
  margin: 0 auto;
  display: grid;
  gap: var(--space-l);
  padding: var(--space-l) 0 var(--space-xl);
}

.podcast-error {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-xl) 0;
  text-align: center;
  color: #c44;
}

.podcast-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-m);
  align-items: start;
  padding: var(--space-m) 0;

  @include mq($from: md) {
    grid-template-columns: minmax(200px, 280px) 1fr;
    gap: var(--space-l);
  }
}

.podcast-hero__cover-wrapper {
  width: 100%;
  max-width: 280px;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  background-color: #f0ebe6;
}

.podcast-hero__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.podcast-hero__title-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  min-width: 0;
}

.podcast-hero__author {
  // Override RipoHero's :deep(p) to keep the author byline secondary.
  // Full --hero-color (#2F2C35) without opacity — keeps contrast ≥ 4.5:1
  // against the gradient's lightest stop (#B2BC57) so it meets WCAG AA.
  font-size: var(--step-0) !important;
  color: var(--hero-color);
  margin: 0;
  padding: 0;
}

.podcast-hero__title {
  line-height: 1.1;
  margin: 0;
  padding: 0;
  overflow-wrap: anywhere;
}

.podcast-section {
  display: grid;
  gap: var(--space-s);

  h2 {
    margin: 0;
    padding: 0;
    font-size: var(--step-3);
  }
}

.podcast-description p {
  font-size: var(--step-1);
  line-height: 1.5;
  white-space: pre-wrap;
  margin: 0;
  padding: 0;
}

.podcast-episodes__empty {
  color: #767676;
  font-style: italic;
}

.podcast-episodes__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-m);
}

.podcast-episodes__more {
  display: flex;
  justify-content: center;
  padding-top: var(--space-s);
}

.podcast-episodes__more-button {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2xs) var(--space-s);
  border-radius: 999px;
  background-color: #2f2c35;
  color: #fff;
  font-family: var(--heading-font-family), serif;
  font-size: var(--step-0);
  border: none;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.85;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.podcast-report {
  align-items: center;
  justify-items: center;
  padding-top: var(--space-m);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  text-align: center;
}

.podcast-report__button {
  display: inline-block;
  padding: var(--space-3xs) var(--space-s);
  border-radius: 999px;
  background-color: #d32f2f;
  color: #fff;
  font-family: var(--heading-font-family), serif;
  font-size: var(--step--1);
  text-decoration: none;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;

  &:hover,
  &:focus-visible {
    opacity: 0.9;
    transform: translateY(-1px);
  }
}

.podcast-report__note {
  margin: 0;
  padding: 0;
  color: #767676;
  font-size: var(--step--2);
  max-width: 52ch;
}
</style>
