<template>
    <modal-dialog :aria-labelledby="headingId" ref="dialog">
        <h2 :id="headingId">{{ t("shareDialog.title") }}</h2>
        <p class="share-description">{{ t("shareDialog.description") }}</p>

        <section class="share-section">
            <ShareCopyField :label="t('shareDialog.linkLabel')" :value="shareUrl" />
            <button
                v-if="canNativeShare"
                type="button"
                class="native-share-button"
                @click="nativeShare"
            >
                {{ t("shareDialog.nativeShare") }}
            </button>
        </section>

        <section v-if="!isEmbedded" class="share-section">
            <ShareCopyField
                :label="t('shareDialog.embedLabel')"
                :value="embedCode"
                :copy-label="t('shareDialog.copyEmbed')"
                :hint="t('shareDialog.embedHint')"
                multiline
                :rows="4"
            />
        </section>
    </modal-dialog>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ModalDialog from "./ModalDialog.vue";
import ShareCopyField from "./ShareCopyField.vue";
import { useRichPod } from "../composables/useRichPod.ts";
import { useEmbedMode } from "../composables/useEmbedMode.ts";

const EMBED_HEIGHT = 600;

const { t } = useI18n();
const { richPod } = useRichPod();
const { isEmbedded } = useEmbedMode();

const dialog = useTemplateRef("dialog");
const headingId = `share-dialog-heading-${Math.floor(Math.random() * 1_000_000)}`;

const shareUrl = computed(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.delete("embed");
    return url.toString();
});

const embedUrl = computed(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("embed", "1");
    return url.toString();
});

const shareTitle = computed(() => richPod.value?.title ?? "RichPods Player");

const embedCode = computed(() => {
    const url = embedUrl.value;
    const title = shareTitle.value.replace(/"/g, "&quot;");
    return (
        `<iframe src="${url}" width="100%" height="${EMBED_HEIGHT}" ` +
        `style="border:0;max-width:100%" loading="lazy" ` +
        `referrerpolicy="strict-origin-when-cross-origin" ` +
        `title="${title}"></iframe>`
    );
});

const canNativeShare = computed(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
);

async function nativeShare() {
    if (!canNativeShare.value) return;
    try {
        await navigator.share({
            title: shareTitle.value,
            url: shareUrl.value,
        });
    } catch {
        // User dismissed the share sheet — no action needed.
    }
}

function toggle() {
    dialog.value?.toggle();
}

defineExpose({
    toggle,
});
</script>

<style scoped lang="scss">
h2 {
    font-size: 20px;
    line-height: 26px;
    font-weight: 700;
    letter-spacing: -0.4px;
    margin: 0 0 4px;
}

.share-description {
    font-size: 14px;
    line-height: 20px;
    margin: 0 0 16px;
    opacity: 0.85;
}

.share-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--richpod-border-color, rgba(0, 0, 0, 0.1));

    &:first-of-type {
        margin-top: 12px;
    }
}

.native-share-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 10px;
    padding: 8px 16px;
    border: 1px solid var(--richpod-control-button-border, #fff);
    border-radius: 13px;
    background-color: transparent;
    color: inherit;
    font-family: var(--richpod-font-family-text), sans-serif;
    font-size: 13px;
    line-height: 18px;
    cursor: pointer;

    &:hover {
        opacity: 0.9;
    }
}
</style>
