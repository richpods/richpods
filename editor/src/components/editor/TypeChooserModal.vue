<template>
    <dialog
        ref="dialogRef"
        class="p-0 rounded-lg shadow-xl backdrop:bg-black/40 open:flex"
        @close="handleClose"
        @keydown.esc="handleClose"
    >
        <div class="bg-white rounded-lg p-6 w-full max-w-xl">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium">{{ t("typeChooser.title") }}</h3>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 p-1"
                    @click="handleClose"
                    :aria-label="t('common.close')"
                >
                    &#x2715;
                </button>
            </div>

            <div
                class="grid grid-cols-2 gap-4"
                role="group"
                :aria-label="t('typeChooser.chapterTypesAriaLabel')"
            >
                <button
                    v-for="item in visibleMenuItems"
                    :key="itemKey(item)"
                    type="button"
                    class="border rounded-md p-4 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    :class="
                        isItemDisabled(item)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                            : 'hover:bg-gray-50'
                    "
                    @click="!isItemDisabled(item) && handleSelect(item)"
                    :disabled="isItemDisabled(item)"
                    :aria-label="getItemTooltip(item)"
                    :title="getItemTooltip(item)"
                >
                    <Icon :icon="item.icon" class="w-6 h-6 shrink-0" aria-hidden="true" />
                    <span class="text-sm font-medium text-left">{{ t(item.labelKey) }}</span>
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";

const { t } = useI18n();

type CardSubtype = "LINK" | "COVER" | "CITATION" | "IMAGE" | "BLANK";

type ChapterTypeMenuItem =
    | { kind: "type"; type: string; icon: string; labelKey: string }
    | { kind: "card"; cardType: CardSubtype; icon: string; labelKey: string };

const props = defineProps<{
    open: boolean;
    verified?: boolean;
    bypassVerification?: boolean;
    hasPodcastArtwork?: boolean;
    hasEpisodeArtwork?: boolean;
}>();

const emit = defineEmits<{
    (e: "close"): void;
    (e: "choose", type: string): void;
    (e: "chooseCard", cardType: CardSubtype): void;
}>();

const dialogRef = ref<HTMLDialogElement>();

// Single flat, ordered list driving the menu. Reorder these entries to change
// the order in which chapter types appear.
const menuItems: ChapterTypeMenuItem[] = [
    {
        kind: "card",
        cardType: "LINK",
        icon: "ion:link-outline",
        labelKey: "typeChooser.cardTypes.link",
    },
    {
        kind: "card",
        cardType: "COVER",
        icon: "ion:easel-outline",
        labelKey: "typeChooser.cardTypes.cover",
    },
    {
        kind: "type",
        type: "Markdown",
        icon: "ion:document-text-outline",
        labelKey: "typeChooser.types.markdown",
    },
    {
        kind: "type",
        type: "GeoMap",
        icon: "ion:map-outline",
        labelKey: "typeChooser.types.geoMap",
    },
    {
        kind: "card",
        cardType: "IMAGE",
        icon: "ion:image-outline",
        labelKey: "typeChooser.cardTypes.image",
    },
    {
        kind: "type",
        type: "Slideshow",
        icon: "ion:images-outline",
        labelKey: "typeChooser.types.slideshow",
    },
    {
        kind: "type",
        type: "InteractiveChart",
        icon: "ion:bar-chart-outline",
        labelKey: "typeChooser.types.interactiveChart",
    },
    {
        kind: "type",
        type: "Poll",
        icon: "ion:chatbubbles-outline",
        labelKey: "typeChooser.types.poll",
    },
    {
        kind: "card",
        cardType: "CITATION",
        icon: "ion:chatbox-ellipses-outline",
        labelKey: "typeChooser.cardTypes.citation",
    },
    {
        kind: "card",
        cardType: "BLANK",
        icon: "ion:square-outline",
        labelKey: "typeChooser.cardTypes.blank",
    },
];

const visibleMenuItems = computed(() =>
    menuItems.filter((item) => {
        if (item.kind !== "card") {
            return true;
        }
        // Cover requires at least one artwork source
        if (item.cardType === "COVER") {
            return !!props.hasPodcastArtwork || !!props.hasEpisodeArtwork;
        }
        // Image only for privileged users
        if (item.cardType === "IMAGE") {
            return !!props.bypassVerification;
        }
        return true;
    }),
);

watch(
    () => props.open,
    (isOpen) => {
        if (dialogRef.value) {
            if (isOpen && !dialogRef.value.open) {
                dialogRef.value.showModal();
            } else if (!isOpen && dialogRef.value.open) {
                dialogRef.value.close();
            }
        }
    },
);

function itemKey(item: ChapterTypeMenuItem): string {
    return item.kind === "card" ? `card:${item.cardType}` : `type:${item.type}`;
}

function handleClose() {
    emit("close");
}

function handleSelect(item: ChapterTypeMenuItem) {
    if (item.kind === "card") {
        emit("chooseCard", item.cardType);
    } else {
        emit("choose", item.type);
    }
    handleClose();
}

function isItemDisabled(item: ChapterTypeMenuItem): boolean {
    if (item.kind !== "type") {
        return false;
    }
    if (props.bypassVerification) {
        return false;
    }
    if (item.type === "Slideshow" || item.type === "Poll") {
        return !props.verified;
    }
    return false;
}

function getItemTooltip(item: ChapterTypeMenuItem): string {
    if (item.kind === "type" && item.type === "Slideshow" && isItemDisabled(item)) {
        return t("typeChooser.slideshowRequiresVerification");
    }
    if (item.kind === "type" && item.type === "Poll" && isItemDisabled(item)) {
        return t("typeChooser.pollRequiresVerification");
    }
    return t("typeChooser.chooseType", { type: t(item.labelKey) });
}
</script>

<style scoped>
dialog[open] {
    display: flex;
    align-items: center;
    justify-content: center;
}

dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.4);
}
</style>
