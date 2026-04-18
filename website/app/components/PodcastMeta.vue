<template>
    <section class="podcast-meta" :aria-label="$t('podcastSite.meta.title')">
        <dl class="podcast-meta__list">
            <div class="podcast-meta__item">
                <dt>{{ $t("podcastSite.meta.author") }}</dt>
                <dd>{{ podcast.itunesAuthor }}</dd>
            </div>
            <div class="podcast-meta__item">
                <dt>{{ $t("podcastSite.meta.category") }}</dt>
                <dd>{{ podcast.itunesCategory }}</dd>
            </div>
            <div class="podcast-meta__item">
                <dt>{{ $t("podcastSite.meta.language") }}</dt>
                <dd>{{ podcast.language }}</dd>
            </div>
            <div class="podcast-meta__item">
                <dt>{{ $t("podcastSite.meta.explicit") }}</dt>
                <dd>
                    {{
                        podcast.itunesExplicit
                            ? $t("podcastSite.meta.explicitYes")
                            : $t("podcastSite.meta.explicitNo")
                    }}
                </dd>
            </div>
            <div v-if="podcast.itunesType" class="podcast-meta__item">
                <dt>{{ $t("podcastSite.meta.type") }}</dt>
                <dd>{{ $t(`podcastSite.meta.typeValues.${podcast.itunesType}`) }}</dd>
            </div>
            <div v-if="podcast.copyright" class="podcast-meta__item">
                <dt>{{ $t("podcastSite.meta.copyright") }}</dt>
                <dd>{{ podcast.copyright }}</dd>
            </div>
        </dl>
    </section>
</template>
<script setup lang="ts">
import type { PublicHostedPodcast } from "~/types";

defineProps<{
    podcast: PublicHostedPodcast;
}>();
</script>
<style scoped lang="scss">
.podcast-meta {
    margin-top: var(--space-l);
    padding-top: var(--space-l);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.podcast-meta__list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-s);
    margin: 0;
    padding: var(--space-s);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    background-color: #fafafa;
    font-size: var(--step--1);
}

.podcast-meta__item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    dt {
        color: #767676;
        font-size: var(--step--2);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    dd {
        margin: 0;
        color: #222;
        overflow-wrap: anywhere;
    }
}
</style>
