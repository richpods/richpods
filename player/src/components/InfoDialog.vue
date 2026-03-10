<template>
    <modal-dialog :aria-labelledby="headingId" ref="dialog">
        <div v-if="isUnverified" class="unverified-banner" role="alert">
            <svg class="unverified-banner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320V144a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v112m0 0V80a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v160m-64 1V96a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v224m128-80V48a32 32 0 0 0-32-32h0a32 32 0 0 0-32 32v192"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320c0 117.4-64 176-152 176s-123.71-39.6-144-88L83.33 264c-6.66-18.05-3.64-34.79 11.87-43.6h0c15.52-8.82 35.91-4.28 44.31 11.68L176 320"/></svg>
            <span>{{ publisherName ? t("disclaimer.unverified", { publisherName }) : t("disclaimer.unverifiedNoPublisher") }}</span>
        </div>
        <h2 :id="headingId">{{ richPod?.title }}</h2>
        <span v-if="richPod?.explicit" class="explicit-indicator">{{ t("infoDialog.explicit") }}</span>
        <div class="info-content">
            <p class="description">{{ richPod?.description }}</p>

            <div v-if="richPod?.origin" class="podcast-origin">
                <h3>{{ t("infoDialog.originalPodcastTitle") }}</h3>
                <p>{{ richPod.origin.title }}</p>
                <p v-if="richPod.origin.link">
                    <a :href="richPod.origin.link" target="_blank" rel="noopener ugc">{{ richPod.origin.link }}</a>
                </p>

                <h3>{{ t("infoDialog.episode") }}</h3>
                <p>{{ richPod.origin.episode.title }}</p>
                <a
                    v-if="richPod.origin.episode.link"
                    :href="richPod.origin.episode.link"
                    target="_blank"
                    rel="noopener ugc"
                    class="episode-link-button"
                >
                    {{ t("sidebar.openEpisode") }}
                </a>
            </div>
        </div>
    </modal-dialog>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRichPod } from "@/composables/useRichPod.ts";
import ModalDialog from "./ModalDialog.vue";
import { computed, useTemplateRef } from "vue";

const { t } = useI18n();

const dialog = useTemplateRef("dialog");
const headingId = `dialog-heading-${Math.floor(Math.random() * 100)}`;

const {
    richPod,
} = useRichPod();

const isUnverified = computed(() => !richPod.value?.origin.verified);
const publisherName = computed(() => richPod.value?.editor?.publicName);

function toggle() {
    dialog.value?.toggle();
}

defineExpose({
    toggle,
});
</script>
<style scoped lang="scss">
.unverified-banner {
    background-color: var(--richpod-unverified-warning-background);
    color: #fff;
    font-size: 13px;
    line-height: 18px;
    padding: 10px 32px 10px 12px;
    border-radius: 9px 9px 0 0;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -1em -1em 12px;
}

.unverified-banner-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
}

h2 {
    font-size: 20px;
    line-height: 26px;
    font-weight: 700;
    letter-spacing: -0.4px;
    margin: 0 0 4px;
}

.explicit-indicator {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    background-color: var(--richpod-unverified-warning-background, #d32f2f);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 16px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 8px;
}

.info-content {
    font-size: 13px;
    line-height: 18px;

    .description {
        font-size: var(--description-font-size);
        line-height: var(--description-line-height);
    }

    h3 {
        font-size: 14px;
        margin: 16px 0 6px;
    }

    p {
        margin: 4px 0;
        word-break: break-word;
    }

    a:not(.episode-link-button) {
        color: var(--richpod-link-color, #0066cc);
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
}

.podcast-origin {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--richpod-border-color, #e0e0e0);

    h3:first-child {
        margin-top: 0;
    }
}

.episode-link-button {
    display: inline-block;
    margin-top: 0.75rem;
    padding: 6px 16px;
    border: none;
    border-radius: 13px;
    background-color: var(--richpod-chapter-background);
    color: var(--richpod-button-text);
    font-family: var(--richpod-font-family-text), sans-serif;
    font-size: 14px;
    line-height: 18px;
    text-decoration: none;

    &:hover {
        text-decoration: none;
        opacity: 0.9;
    }
}

.chapter-list {
    padding-top: 12px;

    button {
        appearance: none;
        border: none;
        background-color: var(--richpod-chapter-background);
        color: var(--richpod-chapter-color);
        display: grid;
        grid-template-columns: 1fr 8ch;
        width: 100%;
        text-align: left;

        border-radius: 13px;
        min-height: 36px;
        padding: 10px;

        font-family: var(--richpod-font-family-text), sans-serif;
        font-weight: normal;
        font-size: 14px;
        line-height: 18px;
    }

    .chapter-offset {
        text-align: right;
    }

    button + button {
        margin-top: 10px;
    }
}
</style>
