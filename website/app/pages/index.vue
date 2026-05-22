<template>
<div class="home">
    <RipoHero>
        <h1>{{ $t("home.heroTitle") }}</h1>
        <p class="hero-lead">{{ $t("home.heroLead") }}</p>
        <div class="hero-actions">
            <RipoButton as="nuxt-link" :to="localePath('listen')" size="large">
                <template #icon-left>
                    <svg class="btn-icon-left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16Z"/></svg>
                </template>
                {{ $t("home.heroDiscover") }}
            </RipoButton>
            <RipoButton
                as="link"
                :href="editorUrl"
                size="large"
                variant="secondary"
            >
                <template #icon-left>
                    <svg class="btn-icon-left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48"/><path fill="currentColor" d="M459.94 53.25a16.06 16.06 0 0 0-23.22-.56L424.35 65a8 8 0 0 0 0 11.31l11.34 11.32a8 8 0 0 0 11.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38M399.34 90L218.82 270.2a9 9 0 0 0-2.31 3.93L208.16 299a3.91 3.91 0 0 0 4.86 4.86l24.85-8.35a9 9 0 0 0 3.93-2.31L422 112.66a9 9 0 0 0 0-12.66l-9.95-10a9 9 0 0 0-12.71 0"/></svg>
                </template>
                {{ $t("home.heroCreate") }}
            </RipoButton>
        </div>
    </RipoHero>

    <section class="recent">
        <div class="section-inner">
            <div class="section-head">
                <h2>{{ $t("home.recentTitle") }}</h2>
                <p>{{ $t("home.recentLead") }}</p>
            </div>
            <div
                v-if="recentStatus === 'idle' || recentStatus === 'pending'"
                class="recent-loading"
            >
                <RipoSpinner :size="48" color="var(--hero-color)" :label="$t('listen.loading')" />
            </div>
            <div v-else-if="recentRichPods.length > 0" class="richpods-grid">
                <RichPodCard
                    v-for="pod in recentRichPods"
                    :key="pod.id"
                    :id="pod.id"
                    :title="pod.title"
                    :description="pod.description"
                    :podcast-title="pod.origin.title"
                    :episode-title="pod.origin.episode.title"
                    :artwork-url="
                        pod.origin.episode.artworkUrl ?? pod.origin.artworkUrl ?? undefined
                    "
                    :verified="pod.origin.verified"
                    :created-at="pod.createdAt"
                    :player-url="expandPlayerUrl(pod.id)"
                />
            </div>
            <div class="recent-actions">
                <RipoButton as="nuxt-link" :to="localePath('listen')" size="large">
                    {{ $t("home.recentShowAll") }}
                    <template #icon-right>
                        <svg class="btn-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m268 112l144 144l-144 144m124-144H100"/></svg>
                    </template>
                </RipoButton>
            </div>
        </div>
    </section>

    <section class="features">
        <div class="section-inner">
            <div class="section-head">
                <h2>{{ $t("home.overviewTitle") }}</h2>
                <p>{{ $t("home.overviewLead") }}</p>
            </div>
            <div class="features-grid">
                <FeatureCard
                    :title="$t('home.featureMapsTitle')"
                    :description="$t('home.featureMapsText')"
                >
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M313.27 124.64L198.73 51.36a32 32 0 0 0-29.28.35L56.51 127.49A16 16 0 0 0 48 141.63v295.8a16 16 0 0 0 23.49 14.14l97.82-63.79a32 32 0 0 1 29.5-.24l111.86 73a32 32 0 0 0 29.27-.11l115.43-75.94a16 16 0 0 0 8.63-14.2V74.57a16 16 0 0 0-23.49-14.14l-98 63.86a32 32 0 0 1-29.24.35M328 128v336M184 48v336"/></svg>
                    </template>
                </FeatureCard>
                <FeatureCard
                    :title="$t('home.featureChartsTitle')"
                    :description="$t('home.featureChartsText')"
                >
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M32 32v432a16 16 0 0 0 16 16h432"/><rect width="80" height="192" x="96" y="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" rx="20" ry="20"/><rect width="80" height="240" x="240" y="176" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" rx="20" ry="20"/><rect width="80" height="304" x="383.64" y="112" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" rx="20" ry="20"/></svg>
                    </template>
                </FeatureCard>
                <FeatureCard
                    :title="$t('home.featureInfoTitle')"
                    :description="$t('home.featureInfoText')"
                >
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120m-232 80h160m-160 80h160"/></svg>
                    </template>
                </FeatureCard>
                <FeatureCard
                    :title="$t('home.featureSlideshowsTitle')"
                    :description="$t('home.featureSlideshowsText')"
                >
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M432 112V96a48.14 48.14 0 0 0-48-48H64a48.14 48.14 0 0 0-48 48v256a48.14 48.14 0 0 0 48 48h16"/><rect width="400" height="336" x="96" y="128" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="45.99" ry="45.99"/><ellipse cx="372.92" cy="219.64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="30.77" ry="30.55"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M342.15 372.17L255 285.78a30.93 30.93 0 0 0-42.18-1.21L96 387.64M265.23 464l118.59-117.73a31 31 0 0 1 41.46-1.87L496 402.91"/></svg>
                    </template>
                </FeatureCard>
                <FeatureCard
                    :title="$t('home.featurePollsTitle')"
                    :description="$t('home.featurePollsText')"
                >
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="48" height="160" x="64" y="320" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" rx="8" ry="8"/><rect width="48" height="256" x="288" y="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" rx="8" ry="8"/><rect width="48" height="368" x="400" y="112" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" rx="8" ry="8"/><rect width="48" height="448" x="176" y="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" rx="8" ry="8"/></svg>
                    </template>
                </FeatureCard>
                <FeatureCard
                    :title="$t('home.featureCardsTitle')"
                    :description="$t('home.featureCardsText')"
                >
                    <template #icon>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="36" d="M208 352h-64a96 96 0 0 1 0-192h64m96 0h64a96 96 0 0 1 0 192h-64m-140.71-96h187.42"/></svg>
                    </template>
                </FeatureCard>
            </div>
        </div>
    </section>

    <section class="create">
        <div class="section-inner">
            <div class="section-head">
                <h2>{{ $t("home.createTitle") }}</h2>
                <p>{{ $t("home.createLead") }}</p>
            </div>
            <ol class="steps">
                <li class="step">
                    <span class="step-number">1</span>
                    <div class="step-body">
                        <h3>{{ $t("home.step1Title") }}</h3>
                        <p>{{ $t("home.step1Text") }}</p>
                    </div>
                </li>
                <li class="step">
                    <span class="step-number">2</span>
                    <div class="step-body">
                        <h3>{{ $t("home.step2Title") }}</h3>
                        <p>{{ $t("home.step2Text") }}</p>
                    </div>
                </li>
                <li class="step">
                    <span class="step-number">3</span>
                    <div class="step-body">
                        <h3>{{ $t("home.step3Title") }}</h3>
                        <p>{{ $t("home.step3Text") }}</p>
                    </div>
                </li>
            </ol>
            <div class="create-actions">
                <RipoButton
                    as="link"
                    :href="editorUrl"
                    size="large"
                >
                    {{ $t("home.createCta") }}
                </RipoButton>
            </div>
        </div>
    </section>

    <div class="call-to-action">
        <h2>{{ $t("home.ctaTitle") }}</h2>
        <p>{{ $t("home.ctaText") }}</p>
        <div class="action">
            <client-only>
                <RipoButton as="link" size="large" href="mailto:contact@richpods.org">
                    {{ $t("home.ctaEmail") }}
                </RipoButton>
            </client-only>
            <RipoButton
                as="link"
                size="large"
                variant="secondary"
                href="https://www.netidee.at/richpodsorg"
                target="_blank"
                rel="noopener"
            >
                {{ $t("home.devBlog") }}
            </RipoButton>
        </div>
    </div>
</div>
</template>
<script setup lang="ts">
import RipoHero from "~/components/RipoHero.vue";
import RipoButton from "~/components/RipoButton.vue";
import RichPodCard from "~/components/RichPodCard.vue";
import FeatureCard from "~/components/FeatureCard.vue";
import RipoSpinner from "@richpods/shared/components/RipoSpinner.vue";
import type { RichPodSummary } from "~/composables/useRecentRichPods";

definePageMeta({
    i18n: {
        paths: {
            de: "/",
            en: "/",
        },
    },
});

const RECENT_LIMIT = 8;

const localePath = useLocalePath();
const { t } = useI18n();
const { fetchRichPodsPage, expandPlayerUrl } = useRecentRichPods();
const editorUrl = useRuntimeConfig().public.editorUrl;

const { data: recentData, status: recentStatus } = await useAsyncData(
    "homeRecentRichPods",
    () => fetchRichPodsPage(RECENT_LIMIT),
    {
        server: false,
        lazy: true,
        default: () => ({ items: [] as RichPodSummary[], nextCursor: null as string | null }),
    },
);

const recentRichPods = computed(() => (recentData.value?.items ?? []).slice(0, RECENT_LIMIT));

useHead({
    titleTemplate: t("meta.siteTitle"),
});

useSeoMeta({
    description: () => t("home.description"),
    ogTitle: () => t("meta.siteTitle"),
    ogDescription: () => t("home.description"),
    twitterTitle: () => t("meta.siteTitle"),
    twitterDescription: () => t("home.description"),
});
</script>
<style scoped lang="scss">
.hero-lead {
    max-width: 46ch;
    margin: 0;
    padding: var(--space-xs) 0 0;
}

.hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
    padding: var(--space-m) 0 var(--space-s);
}

.btn-icon-left {
    width: 1em;
    height: 1em;
    margin-right: var(--space-3xs);
}

.section-inner {
    max-width: var(--content-max-width);
    margin: 0 auto;
}

.section-head {
    max-width: 60ch;
    margin: 0 auto var(--space-l);
    text-align: center;

    h2 {
        font-size: var(--step-4);
        padding: 0 0 var(--space-2xs);
    }

    p {
        font-size: var(--step-1);
        line-height: 1.4;
        padding: 0;
    }
}

.recent {
    background-color: #fffaf5;
    color: var(--hero-color);
    padding: var(--space-2xl) 0;
}

.richpods-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    column-gap: var(--space-s);

    @include mq($from: md) {
        grid-template-columns: repeat(3, 1fr);
        column-gap: var(--space-m);
    }

    @include mq($from: lg) {
        grid-template-columns: repeat(4, 1fr);
    }
}

.recent-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl) 0;
}

.recent-actions {
    display: flex;
    justify-content: center;
    padding: var(--space-l) 0 0;
}

.btn-arrow {
    width: 1em;
    height: 1em;
    margin-left: var(--space-3xs);
}

.features {
    background-color: #2e2c35;
    color: #fffaf6;
    padding: var(--space-2xl) 0;

    @include mq($from: xl) {
        border-bottom-left-radius: calc(2 * var(--space-2xl));
    }

    .section-head h2 {
        color: var(--hero-highlight-color);
    }
}

.features-grid {
    --feature-icon-color: #f89623;

    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-l);

    @include mq($from: md) {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-xl);
    }

    @include mq($from: lg) {
        grid-template-columns: repeat(3, 1fr);
    }
}

.create {
    background-color: #f4efe9;
    color: var(--hero-color);
    padding: var(--space-2xl) 0;
}

.steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-l);

    @include mq($from: md) {
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-xl);
    }
}

.step {
    display: flex;
    gap: var(--space-s);
    align-items: flex-start;
}

.step-number {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.4em;
    height: 2.4em;
    border-radius: 50%;
    background-color: #2e2c35;
    color: #fffaf6;
    font-family: var(--heading-font-family), serif;
    font-size: var(--step-1);
}

.step-body {
    h3 {
        font-size: var(--step-2);
        padding: 0 0 var(--space-3xs);
    }

    p {
        padding: 0;
        line-height: 1.4;
    }
}

.create-actions {
    display: flex;
    justify-content: center;
    padding: var(--space-xl) 0 0;
}

.call-to-action {
    background: linear-gradient(174deg, #9e744a 0%, #b2bc57 100%) 0 0;
    color: var(--hero-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-2xl) var(--space-s);

    h2 {
        max-width: 24ch;
        font-size: var(--step-4);
        padding: 0 0 var(--space-2xs);
    }

    p {
        max-width: 48ch;
        font-size: var(--step-1);
        line-height: 1.4;
        padding: 0;
    }

    .action {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--space-s);
        padding: var(--space-l) 0 0;
    }
}
</style>
