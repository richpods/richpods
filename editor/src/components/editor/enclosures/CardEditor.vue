<template>
    <div class="space-y-4">
        <!-- Visibility toggle (not for Blank) -->
        <div v-if="cardType !== 'BLANK'" class="flex items-center gap-3">
            <label class="block text-sm font-medium text-gray-700">
                {{ t("cardEditor.visibleAsChapter") }}
            </label>
            <button
                type="button"
                role="switch"
                :aria-checked="visibleAsChapter"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                :class="visibleAsChapter ? 'bg-blue-600' : 'bg-gray-300'"
                @click="toggleVisibility"
            >
                <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="visibleAsChapter ? 'translate-x-6' : 'translate-x-1'"
                />
            </button>
            <span class="text-xs text-gray-500">
                {{ visibleAsChapter ? t("cardEditor.visibleHint") : t("cardEditor.invisibleHint") }}
            </span>
        </div>

        <!-- Title (not for Blank) -->
        <div v-if="cardType !== 'BLANK'">
            <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t("chapterEdit.titleLabel") }}
            </label>
            <input
                v-model="cardTitle"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                @blur="handleBlur"
            />
        </div>

        <!-- Link Card -->
        <template v-if="cardType === 'LINK'">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("cardEditor.link.urlLabel") }}
                </label>
                <div class="flex gap-2">
                    <input
                        v-model="linkUrl"
                        type="url"
                        class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        :placeholder="t('cardEditor.link.urlPlaceholder')"
                        @blur="handleBlur"
                    />
                    <button
                        type="button"
                        class="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        :disabled="!linkUrl || linkUrl.length > 500 || isFetchingOg"
                        @click="fetchOgData"
                    >
                        {{ isFetchingOg ? t("cardEditor.link.fetching") : t("cardEditor.link.fetchOg") }}
                    </button>
                </div>
                <p v-if="linkUrl && linkUrl.length > 500" class="text-xs text-red-500 mt-1">
                    {{ t("cardEditor.link.urlTooLong") }}
                </p>
                <p v-if="ogError" class="text-xs text-red-500 mt-1">{{ ogError }}</p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("cardEditor.link.descriptionLabel") }}
                </label>
                <textarea
                    v-model="linkDescription"
                    rows="2"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    @blur="handleBlur"
                ></textarea>
            </div>
            <!-- OG Preview -->
            <div v-if="hasOgData" class="border border-gray-200 rounded-md p-3 bg-gray-50">
                <p class="text-xs text-gray-500 mb-2">{{ t("cardEditor.link.ogPreview") }}</p>
                <div v-if="ogImageUrl" class="mb-2">
                    <img
                        :src="ogImageUrl"
                        :alt="ogTitle || ''"
                        class="w-full rounded object-cover"
                        :style="ogImageStyle"
                    />
                </div>
                <p v-if="ogTitle" class="text-sm font-medium">{{ ogTitle }}</p>
                <p v-if="ogDescription" class="text-xs text-gray-600 mt-1">{{ ogDescription }}</p>
            </div>
        </template>

        <!-- Cover Card -->
        <template v-if="cardType === 'COVER'">
            <div>
                <template v-if="showCoverSourceChooser">
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        {{ t("cardEditor.cover.sourceLabel") }}
                    </label>
                    <div class="grid grid-cols-2 gap-3">
                        <label
                            class="flex flex-col items-center gap-2 cursor-pointer rounded-lg border p-3"
                            :class="coverSource === 'podcast' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
                        >
                            <div class="flex items-center gap-2 self-start">
                                <input
                                    type="radio"
                                    name="coverSource"
                                    value="podcast"
                                    :checked="coverSource === 'podcast'"
                                    @change="setCoverSource('podcast')"
                                    class="text-blue-600 focus:ring-blue-500"
                                />
                                <span class="text-sm">{{ t("cardEditor.cover.podcastCover") }}</span>
                            </div>
                            <img
                                v-if="podcastArtworkUrl"
                                :src="podcastArtworkUrl"
                                :alt="t('cardEditor.cover.podcastCover')"
                                class="w-full aspect-square rounded object-cover"
                            />
                        </label>
                        <label
                            class="flex flex-col items-center gap-2 cursor-pointer rounded-lg border p-3"
                            :class="coverSource === 'episode' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
                        >
                            <div class="flex items-center gap-2 self-start">
                                <input
                                    type="radio"
                                    name="coverSource"
                                    value="episode"
                                    :checked="coverSource === 'episode'"
                                    @change="setCoverSource('episode')"
                                    class="text-blue-600 focus:ring-blue-500"
                                />
                                <span class="text-sm">{{ t("cardEditor.cover.episodeCover") }}</span>
                            </div>
                            <img
                                v-if="episodeArtworkUrl"
                                :src="episodeArtworkUrl"
                                :alt="t('cardEditor.cover.episodeCover')"
                                class="w-full aspect-square rounded object-cover"
                            />
                        </label>
                    </div>
                </template>
                <div v-else class="rounded-lg border border-gray-200 p-3">
                    <p class="text-sm mb-2">{{ singleCoverLabel }}</p>
                    <img
                        v-if="singleCoverUrl"
                        :src="singleCoverUrl"
                        :alt="singleCoverLabel"
                        class="w-full max-w-sm aspect-square rounded object-cover"
                    />
                </div>
            </div>
        </template>

        <!-- Citation Card -->
        <template v-if="cardType === 'CITATION'">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("cardEditor.citation.quoteLabel") }}
                </label>
                <textarea
                    v-model="quoteText"
                    rows="4"
                    maxlength="1500"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    :placeholder="t('cardEditor.citation.quotePlaceholder')"
                    @blur="handleBlur"
                ></textarea>
                <p class="text-xs text-gray-500 mt-0.5">
                    {{ (quoteText?.length ?? 0) }}/1500
                </p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("cardEditor.citation.sourceLabel") }}
                </label>
                <input
                    v-model="citationSource"
                    type="text"
                    maxlength="100"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    :placeholder="t('cardEditor.citation.sourcePlaceholder')"
                    @blur="handleBlur"
                />
                <p class="text-xs text-gray-500 mt-0.5">
                    {{ (citationSource?.length ?? 0) }}/100
                </p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("cardEditor.citation.linkLabel") }}
                </label>
                <input
                    v-model="citationUrl"
                    type="url"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    :placeholder="t('cardEditor.citation.linkPlaceholder')"
                    @blur="handleBlur"
                />
                <p v-if="citationUrl && !citationSource" class="text-xs text-red-500 mt-1">
                    {{ t("cardEditor.citation.sourceRequiredForLink") }}
                </p>
            </div>
        </template>

        <!-- Image Card -->
        <template v-if="cardType === 'IMAGE'">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("cardEditor.image.altLabel") }}
                </label>
                <input
                    v-model="imageAlt"
                    type="text"
                    maxlength="500"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    :placeholder="t('cardEditor.image.altPlaceholder')"
                    @blur="handleBlur"
                />
                <p class="text-xs text-gray-500 mt-0.5">
                    {{ (imageAlt?.length ?? 0) }}/500 - {{ t("cardEditor.image.altHint") }}
                </p>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("cardEditor.image.imageLabel") }}
                </label>
                <div v-if="imageUrl" class="mb-2">
                    <img
                        :src="imageUrl"
                        :alt="imageAlt || ''"
                        class="max-w-full max-h-48 rounded border border-gray-200"
                    />
                    <button
                        type="button"
                        class="mt-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                        @click="triggerImageUpload"
                        :disabled="uploading"
                    >
                        {{ t("slideshowEditor.changeImage") }}
                    </button>
                </div>
                <div v-else>
                    <button
                        type="button"
                        class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 border border-gray-300 disabled:opacity-50"
                        @click="triggerImageUpload"
                        :disabled="uploading"
                    >
                        {{ uploading ? t("slideshowEditor.uploading") : t("slideshowEditor.chooseImage") }}
                    </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">{{ t("slideshowEditor.acceptedFormats") }}</p>
                <p v-if="uploadError" class="text-xs text-red-500 mt-1">{{ uploadError }}</p>
                <input
                    ref="imageFileInput"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="hidden"
                    @change="handleImageFileChange"
                />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("cardEditor.image.linkLabel") }}
                </label>
                <input
                    v-model="imageLink"
                    type="url"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    :placeholder="t('cardEditor.image.linkPlaceholder')"
                    @blur="handleBlur"
                />
            </div>
        </template>

        <!-- Blank Card -->
        <div v-if="cardType === 'BLANK'" class="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-md p-4 text-center">
            {{ t("cardEditor.blank.description") }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { useValidation } from "@/composables/useValidation";
import { useUpload } from "@/composables/useUpload";
import { auth } from "@/lib/firebase";

const { t } = useI18n();
const richpodStore = useRichPodStore();
const { currentChapter, richpod } = storeToRefs(richpodStore);
const { runValidation } = useValidation();
const { uploadImage, uploading, error: uploadError } = useUpload();

const imageFileInput = ref<HTMLInputElement>();
const isFetchingOg = ref(false);
const ogError = ref<string | null>(null);

const cardType = computed(() => currentChapter.value?.enclosure.cardType ?? "BLANK");

const hasEpisodeArtwork = computed(() => !!richpod.value.origin?.episode?.artworkUrl);

// Computed read/write properties for each card field
const visibleAsChapter = computed(() => currentChapter.value?.enclosure.visibleAsChapter ?? false);

function toggleVisibility() {
    updateField("visibleAsChapter", !visibleAsChapter.value);
    runValidation();
}

const cardTitle = computed({
    get: () => currentChapter.value?.enclosure.title ?? "",
    set: (value: string) => updateField("title", value),
});

// Link card fields
const linkUrl = computed({
    get: () => currentChapter.value?.enclosure.url ?? "",
    set: (value: string) => updateField("url", value),
});

const linkDescription = computed({
    get: () => currentChapter.value?.enclosure.description ?? "",
    set: (value: string) => updateField("description", value),
});

const ogTitle = computed(() => currentChapter.value?.enclosure.openGraph?.ogTitle ?? "");
const ogDescription = computed(() => currentChapter.value?.enclosure.openGraph?.ogDescription ?? "");
const ogImageUrl = computed(() => currentChapter.value?.enclosure.openGraph?.ogImageUrl ?? "");
const hasOgData = computed(() => !!(ogTitle.value || ogDescription.value || ogImageUrl.value));
const ogImageWidth = computed(() => currentChapter.value?.enclosure.openGraph?.ogImageWidth ?? null);
const ogImageHeight = computed(() => currentChapter.value?.enclosure.openGraph?.ogImageHeight ?? null);
const ogImageStyle = computed(() => {
    if (ogImageWidth.value && ogImageHeight.value) {
        return { aspectRatio: `${ogImageWidth.value} / ${ogImageHeight.value}` };
    }
    return { aspectRatio: "1.91 / 1" };
});

// Cover card fields
const coverSource = computed(() => currentChapter.value?.enclosure.coverSource ?? "podcast");
const podcastArtworkUrl = computed(() => richpod.value.origin?.artworkUrl ?? null);
const episodeArtworkUrl = computed(
    () => richpod.value.origin?.episode?.artworkUrl ?? richpod.value.origin?.artworkUrl ?? null,
);
const hasPodcastArtwork = computed(() => !!podcastArtworkUrl.value);
const showCoverSourceChooser = computed(() => hasPodcastArtwork.value && hasEpisodeArtwork.value);
const singleCoverSource = computed<"podcast" | "episode">(() => {
    if (hasPodcastArtwork.value) {
        return "podcast";
    }
    if (hasEpisodeArtwork.value) {
        return "episode";
    }
    return "podcast";
});
const singleCoverUrl = computed(() => {
    if (singleCoverSource.value === "episode") {
        return episodeArtworkUrl.value;
    }
    return podcastArtworkUrl.value;
});
const singleCoverLabel = computed(() =>
    singleCoverSource.value === "episode"
        ? t("cardEditor.cover.episodeCover")
        : t("cardEditor.cover.podcastCover"),
);

function setCoverSource(source: "podcast" | "episode") {
    updateField("coverSource", source);
}

watchEffect(() => {
    if (cardType.value !== "COVER") {
        return;
    }
    if (coverSource.value === "podcast" && !hasPodcastArtwork.value && hasEpisodeArtwork.value) {
        setCoverSource("episode");
        return;
    }
    if (coverSource.value === "episode" && !hasEpisodeArtwork.value && hasPodcastArtwork.value) {
        setCoverSource("podcast");
    }
});

// Citation card fields
const quoteText = computed({
    get: () => currentChapter.value?.enclosure.quoteText ?? "",
    set: (value: string) => updateField("quoteText", value),
});

const citationSource = computed({
    get: () => currentChapter.value?.enclosure.citationSource ?? "",
    set: (value: string) => updateField("citationSource", value),
});

const citationUrl = computed({
    get: () => currentChapter.value?.enclosure.citationUrl ?? "",
    set: (value: string) => updateField("citationUrl", value),
});

// Image card fields
const imageUrl = computed(() => currentChapter.value?.enclosure.imageUrl ?? "");

const imageAlt = computed({
    get: () => currentChapter.value?.enclosure.imageAlt ?? "",
    set: (value: string) => updateField("imageAlt", value),
});

const imageLink = computed({
    get: () => currentChapter.value?.enclosure.imageLink ?? "",
    set: (value: string) => updateField("imageLink", value),
});

function updateField(field: string, value: unknown) {
    richpodStore.updateCurrentChapter((chapter) => ({
        ...chapter,
        enclosure: {
            ...chapter.enclosure,
            [field]: value,
        },
    }));
}

function handleBlur() {
    runValidation();
}

async function fetchOgData() {
    const url = linkUrl.value;
    if (!url || url.length > 500) return;

    isFetchingOg.value = true;
    ogError.value = null;

    try {
        const user = auth.currentUser;
        if (!user) {
            ogError.value = t("upload.authenticationRequired");
            return;
        }

        const token = await user.getIdToken();
        const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || "http://localhost:4000/graphql";
        const apiUrl = graphqlEndpoint.replace(/\/graphql$/, "");

        const response = await fetch(`${apiUrl}/api/v1/og/parse`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            ogError.value = errorData.error || t("cardEditor.link.fetchFailed");
            return;
        }

        const data = await response.json();

        richpodStore.updateCurrentChapter((chapter) => ({
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                openGraph: {
                    ogTitle: data.ogTitle || null,
                    ogDescription: data.ogDescription || null,
                    ogImageUrl: data.ogImageUrl || null,
                    ogImageWidth: data.ogImageWidth || null,
                    ogImageHeight: data.ogImageHeight || null,
                },
            },
        }));
    } catch {
        ogError.value = t("cardEditor.link.fetchFailed");
    } finally {
        isFetchingOg.value = false;
    }
}

function triggerImageUpload() {
    imageFileInput.value?.click();
}

async function handleImageFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const richPodId = richpod.value.id;
    if (!richPodId) return;

    const downloadUrl = await uploadImage(file, richPodId);
    if (downloadUrl) {
        updateField("imageUrl", downloadUrl);
    }

    // Reset input so the same file can be re-selected
    input.value = "";
}
</script>
