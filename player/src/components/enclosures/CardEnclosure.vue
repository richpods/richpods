<template>
    <div class="card-enclosure" :class="`card-type-${cardType.toLowerCase()}`">
        <div class="card-center">
            <!-- Link Card -->
            <div v-if="cardType === 'LINK' && enclosure.url" class="card-link-wrapper">
                <a
                    :href="enclosure.url"
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    class="card-link"
                >
                    <div class="card-link-content">
                        <img
                            v-if="ogImageUrl"
                            :src="ogImageUrl"
                            :alt="ogTitle || ''"
                            class="card-link-image"
                            :style="ogImageStyle"
                        />
                        <div class="card-link-text">
                            <p v-if="ogTitle" class="card-link-title">{{ ogTitle }}</p>
                            <p v-if="ogDescription" class="card-link-description">{{ ogDescription }}</p>
                            <p v-if="!ogTitle && !ogDescription" class="card-link-url">{{ enclosure.url }}</p>
                        </div>
                    </div>
                </a>
                <a
                    v-if="linkHostname"
                    :href="enclosure.url"
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    class="card-external-link-label"
                >
                    <span>{{ linkHostname }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                </a>
            </div>

            <!-- Cover Card -->
            <div v-else-if="cardType === 'COVER'" class="card-cover">
                <img
                    v-if="coverImageUrl"
                    :src="coverImageUrl"
                    :alt="enclosure.title"
                    class="card-cover-image"
                />
            </div>

            <!-- Citation Card -->
            <figure v-else-if="cardType === 'CITATION'" class="card-citation" role="figure">
                <blockquote class="card-citation-quote">
                    <p v-for="(line, i) in quoteLines" :key="i">{{ line }}</p>
                </blockquote>
                <figcaption v-if="enclosure.citationSource" class="card-citation-source">
                    <span>&mdash; </span>
                    <a
                        v-if="enclosure.citationUrl"
                        :href="enclosure.citationUrl"
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                    >{{ enclosure.citationSource }}</a>
                    <span v-else>{{ enclosure.citationSource }}</span>
                </figcaption>
            </figure>

            <!-- Image Card -->
            <div v-else-if="cardType === 'IMAGE'" class="card-image-wrapper">
                <a
                    v-if="enclosure.imageLink"
                    :href="enclosure.imageLink"
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                >
                    <img
                        v-if="enclosure.imageUrl"
                        :src="enclosure.imageUrl"
                        :alt="enclosure.imageAlt || ''"
                        class="card-image"
                    />
                </a>
                <img
                    v-else-if="enclosure.imageUrl"
                    :src="enclosure.imageUrl"
                    :alt="enclosure.imageAlt || ''"
                    class="card-image"
                />
                <a
                    v-if="enclosure.imageLink && imageLinkHostname"
                    :href="enclosure.imageLink"
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    class="card-image-link-label"
                >
                    <span>{{ imageLinkHostname }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                </a>
            </div>

            <!-- Blank Card -->
            <div v-else-if="cardType === 'BLANK'" class="card-blank" aria-hidden="true"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Card } from "../../graphql/generated.ts";

const props = defineProps<{
    enclosure: Card;
}>();

const cardType = computed(() => props.enclosure.cardType);

// Link card OG data
const ogTitle = computed(() => props.enclosure.openGraph?.ogTitle || props.enclosure.title || null);
const ogDescription = computed(
    () => props.enclosure.openGraph?.ogDescription || props.enclosure.description || null,
);
const ogImageUrl = computed(() => props.enclosure.openGraph?.ogImageUrl || null);

// Use native dimensions if available, otherwise fall back to standard OG ratio
const ogImageStyle = computed(() => {
    const w = props.enclosure.openGraph?.ogImageWidth;
    const h = props.enclosure.openGraph?.ogImageHeight;
    if (w && h) {
        return { aspectRatio: `${w} / ${h}` };
    }
    return { aspectRatio: "1.91 / 1" };
});

// Cover card - resolved by server
const coverImageUrl = computed(() => props.enclosure.coverImageUrl || null);

function extractHostname(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return null;
    }
}

// Link card hostname
const linkHostname = computed(() => extractHostname(props.enclosure.url));

// Image card link hostname
const imageLinkHostname = computed(() => extractHostname(props.enclosure.imageLink));

// Citation card - split on newlines
const quoteLines = computed(() => {
    const text = props.enclosure.quoteText || "";
    return text.split("\n").filter((line) => line.length > 0);
});
</script>

<style lang="scss">
.card-enclosure {
    display: grid;
    place-items: center;
    min-height: 100%;
    padding: 16px;
}

.card-center {
    width: 100%;
    max-width: 600px;
}

/* Link Card */
.card-link-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.card-link {
    display: block;
    width: 100%;
    text-decoration: none;
    color: inherit;
    border: 1px solid var(--richpod-border-color, #e5e7eb);
    border-radius: 12px;
    overflow: hidden;
    transition: box-shadow 0.15s ease;

    &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    &:hover + .card-external-link-label {
        color: var(--richpod-link-hover-color, #1d4ed8);
    }

    &:focus-visible {
        outline: 2px solid var(--richpod-focus-color, #3b82f6);
        outline-offset: 2px;
    }
}

.card-link-content {
    display: flex;
    flex-direction: column;
}

.card-link-image {
    width: 100%;
    object-fit: cover;
    display: block;
}

.card-link-text {
    padding: 12px 16px;
}

.card-link-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
    font-family: var(--richpod-font-family-text), sans-serif;
}

.card-link-description {
    margin: 4px 0 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--richpod-text-secondary-color, #6b7280);
    font-family: var(--richpod-font-family-text), sans-serif;
}

.card-link-url {
    margin: 0;
    font-size: 0.875rem;
    color: var(--richpod-link-color, #2563eb);
    word-break: break-all;
    font-family: var(--richpod-font-family-text), sans-serif;
}

.card-external-link-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    font-size: 0.8125rem;
    color: var(--richpod-text-secondary-color, #6b7280);
    text-decoration: none;
    font-family: var(--richpod-font-family-text), sans-serif;

    &:hover {
        color: var(--richpod-link-hover-color, #1d4ed8);
    }

    &:focus-visible {
        outline: 2px solid var(--richpod-focus-color, #3b82f6);
        outline-offset: 2px;
    }
}

/* Cover Card */
.card-cover {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.card-cover-image {
    max-width: 90%;
    max-height: calc(60dvh - 100px);
    border-radius: 8px;
    object-fit: contain;
}

/* Citation Card */
.card-citation {
    margin: 0;
    padding: 24px;
}

.card-citation-quote {
    margin: 0;
    padding: 0 0 0 20px;
    border-left: 4px solid var(--richpod-background-color, #2F2C35);
    font-size: 1.125rem;
    line-height: 1.7;
    font-style: italic;
    font-family: var(--richpod-font-family-text), serif;
    color: var(--richpod-text-color, #1f2937);

    p {
        margin: 0 0 0.5em;

        &:last-child {
            margin-bottom: 0;
        }
    }
}

.card-citation-source {
    margin-top: 16px;
    font-size: 1rem;
    color: var(--richpod-text-secondary-color, #6b7280);
    font-family: var(--richpod-font-family-text), sans-serif;

    a {
        color: var(--richpod-link-color, #2563eb);
        text-decoration: underline;
        text-underline-offset: 2px;

        &:hover {
            color: var(--richpod-link-hover-color, #1d4ed8);
        }

        &:focus-visible {
            outline: 2px solid var(--richpod-focus-color, #3b82f6);
            outline-offset: 2px;
        }
    }
}

/* Image Card */
.card-image-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;

    > a:first-child {
        display: block;

        &:hover .card-image {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        &:hover + .card-image-link-label {
            color: var(--richpod-link-hover-color, #1d4ed8);
        }

        &:focus-visible {
            outline: 2px solid var(--richpod-focus-color, #3b82f6);
            outline-offset: 2px;
        }
    }
}

.card-image {
    max-width: 100%;
    max-height: calc(100vh - 120px);
    border-radius: 4px;
    object-fit: contain;
}

.card-image-link-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    font-size: 0.8125rem;
    color: var(--richpod-text-secondary-color, #6b7280);
    text-decoration: none;
    font-family: var(--richpod-font-family-text), sans-serif;

    &:hover {
        color: var(--richpod-link-hover-color, #1d4ed8);
    }

    &:focus-visible {
        outline: 2px solid var(--richpod-focus-color, #3b82f6);
        outline-offset: 2px;
    }
}

/* Blank Card */
.card-blank {
    min-height: 100px;
}
</style>
