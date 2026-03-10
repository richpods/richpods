<template>
    <dialog
        ref="dialogRef"
        class="p-0 rounded-lg shadow-xl backdrop:bg-black/40 open:flex"
        @close="handleClose"
        @keydown.esc="handleClose"
    >
        <div class="bg-white rounded-lg p-6 w-full max-w-xl">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <button
                        v-if="cardSubtypeView"
                        type="button"
                        class="text-gray-500 hover:text-gray-700 p-1"
                        @click="backToMainTypes"
                        :aria-label="t('common.back')"
                    >
                        &larr;
                    </button>
                    <h3 class="text-lg font-medium">
                        {{ cardSubtypeView ? t("typeChooser.chooseCardType") : t("typeChooser.title") }}
                    </h3>
                </div>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 p-1"
                    @click="handleClose"
                    :aria-label="t('common.close')"
                >
                    &#x2715;
                </button>
            </div>

            <!-- Main type chooser -->
            <div
                v-if="!cardSubtypeView"
                class="grid grid-cols-2 gap-4"
                role="group"
                :aria-label="t('typeChooser.chapterTypesAriaLabel')"
            >
                <button
                    v-for="t in enclosureTypes"
                    :key="t.type"
                    type="button"
                    class="border rounded-md p-4 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    :class="isTypeDisabled(t.type)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                        : 'hover:bg-gray-50'"
                    @click="!isTypeDisabled(t.type) && handleChoose(t.type)"
                    :disabled="isTypeDisabled(t.type)"
                    :aria-label="getDisabledTooltip(t.type)"
                    :title="getDisabledTooltip(t.type)"
                >
                    <span class="text-2xl" aria-hidden="true">{{ t.icon }}</span>
                    <span class="text-sm font-medium">{{ getTypeLabel(t.type) }}</span>
                </button>
            </div>

            <!-- Card subtype chooser -->
            <div
                v-else
                class="grid grid-cols-2 gap-4"
                role="group"
                :aria-label="t('typeChooser.cardTypesAriaLabel')"
            >
                <button
                    v-for="ct in availableCardTypes"
                    :key="ct.cardType"
                    type="button"
                    class="border rounded-md p-4 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    :class="isCardTypeDisabled(ct.cardType)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                        : 'hover:bg-gray-50'"
                    @click="!isCardTypeDisabled(ct.cardType) && handleChooseCardType(ct.cardType)"
                    :disabled="isCardTypeDisabled(ct.cardType)"
                    :title="getCardTypeTooltip(ct.cardType)"
                >
                    <span class="text-2xl" aria-hidden="true">{{ ct.icon }}</span>
                    <span class="text-sm font-medium">{{ getCardTypeLabel(ct.cardType) }}</span>
                </button>
            </div>
        </div>
    </dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import type { EnclosureType } from "@/types/editor";

const { t } = useI18n();

type CardSubtype = "LINK" | "COVER" | "CITATION" | "IMAGE" | "BLANK";

type CardTypeOption = {
    cardType: CardSubtype;
    icon: string;
};

const props = defineProps<{
    open: boolean;
    enclosureTypes: EnclosureType[];
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
const cardSubtypeView = ref(false);

const allCardTypes: CardTypeOption[] = [
    { cardType: "LINK", icon: "\uD83D\uDD17" },
    { cardType: "COVER", icon: "\uD83C\uDFA8" },
    { cardType: "CITATION", icon: "\u201C" },
    { cardType: "IMAGE", icon: "\uD83D\uDDBC\uFE0F" },
    { cardType: "BLANK", icon: "\u25A1" },
];

const availableCardTypes = computed(() => {
    return allCardTypes.filter((ct) => {
        // Cover requires at least one artwork source
        if (ct.cardType === "COVER") {
            return !!props.hasPodcastArtwork || !!props.hasEpisodeArtwork;
        }
        // Image only for privileged users
        if (ct.cardType === "IMAGE") {
            return !!props.bypassVerification;
        }
        return true;
    });
});

watch(
    () => props.open,
    (isOpen) => {
        if (dialogRef.value) {
            if (isOpen && !dialogRef.value.open) {
                dialogRef.value.showModal();
                cardSubtypeView.value = false;
            } else if (!isOpen && dialogRef.value.open) {
                dialogRef.value.close();
            }
        }
    }
);

function handleClose() {
    cardSubtypeView.value = false;
    emit("close");
}

function handleChoose(type: string) {
    if (type === "Card") {
        cardSubtypeView.value = true;
        return;
    }
    emit("choose", type);
    handleClose();
}

function handleChooseCardType(cardType: CardSubtype) {
    emit("chooseCard", cardType);
    handleClose();
}

function backToMainTypes() {
    cardSubtypeView.value = false;
}

function isTypeDisabled(type: string): boolean {
    if (props.bypassVerification) {
        return false;
    }
    if (type === "Slideshow" || type === "Poll") {
        return !props.verified;
    }
    return false;
}

function isCardTypeDisabled(_cardType: CardSubtype): boolean {
    return false;
}

function getTypeLabel(type: string): string {
    switch (type) {
        case "Markdown":
            return t("typeChooser.types.markdown");
        case "Slideshow":
            return t("typeChooser.types.slideshow");
        case "InteractiveChart":
            return t("typeChooser.types.interactiveChart");
        case "GeoMap":
            return t("typeChooser.types.geoMap");
        case "Poll":
            return t("typeChooser.types.poll");
        case "Factbox":
            return t("typeChooser.types.factbox");
        case "Card":
            return t("typeChooser.types.card");
        default:
            return type;
    }
}

function getCardTypeLabel(cardType: CardSubtype): string {
    switch (cardType) {
        case "LINK":
            return t("typeChooser.cardTypes.link");
        case "COVER":
            return t("typeChooser.cardTypes.cover");
        case "CITATION":
            return t("typeChooser.cardTypes.citation");
        case "IMAGE":
            return t("typeChooser.cardTypes.image");
        case "BLANK":
            return t("typeChooser.cardTypes.blank");
        default:
            return cardType;
    }
}

function getDisabledTooltip(type: string): string {
    if (type === "Slideshow" && isTypeDisabled(type)) {
        return t("typeChooser.slideshowRequiresVerification");
    }
    if (type === "Poll" && isTypeDisabled(type)) {
        return t("typeChooser.pollRequiresVerification");
    }
    return t("typeChooser.chooseType", { type: getTypeLabel(type) });
}

function getCardTypeTooltip(cardType: CardSubtype): string {
    return t("typeChooser.chooseType", { type: getCardTypeLabel(cardType) });
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
