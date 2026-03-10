<template>
    <div class="space-y-4">
        <div>
            <label for="slideshow-title" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t("slideshowEditor.title") }}
            </label>
            <input
                id="slideshow-title"
                v-model="slideshowTitle"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                @blur="handleBlur"
            />
        </div>

        <div>
            <label for="slideshow-description" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t("slideshowEditor.description") }}
            </label>
            <textarea
                id="slideshow-description"
                v-model="slideshowDescription"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                @blur="handleBlur"
            ></textarea>
        </div>

        <div
            v-if="!canUseVerificationGatedFeatures"
            class="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800"
            role="alert"
        >
            <strong>{{ t("slideshowEditor.verificationRequired") }}</strong> {{ t("slideshowEditor.verificationHint") }}
        </div>

        <div v-else>
            <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-medium text-gray-700">
                    {{ t("slideshowEditor.slides") }} {{ slides.length > 0 ? `(${slides.length}/50)` : "" }}
                </h4>
                <button
                    type="button"
                    @click="addSlide"
                    :disabled="slides.length >= 50 || uploadingSlideIndex !== null"
                    class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {{ t("slideshowEditor.addSlide") }}
                </button>
            </div>

            <div
                v-if="slides.length >= 50"
                class="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 mb-3"
                role="status"
            >
                {{ t("slideshowEditor.maxSlidesReached") }}
            </div>

            <div v-if="slides.length === 0" class="text-sm text-gray-500 text-center py-8">
                {{ t("slideshowEditor.noSlides") }}
            </div>

            <div v-else ref="slidesContainer" class="space-y-2">
                <div
                    v-for="(slide, index) in slides"
                    :key="index"
                    :data-slide-index="index"
                    class="slide-item border border-gray-300 rounded-md bg-white"
                >
                    <button
                        type="button"
                        @click="toggleSlide(index)"
                        class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        :class="{ 'bg-red-50': !slide.imageUrl }"
                        :aria-expanded="openSlideIndex === index"
                        :aria-controls="`slide-content-${index}`"
                    >
                        <div class="flex items-center gap-3">
                            <span
                                class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                :aria-label="t('slideshowEditor.dragToReorder')"
                            >
                                <Icon icon="ion:menu" class="w-5 h-5" />
                            </span>
                            <span
                                class="text-sm font-medium"
                                :class="!slide.imageUrl ? 'text-red-700' : 'text-gray-700'"
                            >
                                {{ t("slideshowEditor.slideN", { n: index + 1 }) }}
                                <span v-if="!slide.imageUrl" class="text-red-600 font-normal">
                                    - {{ t("slideshowEditor.missingImage") }}
                                </span>
                                <span v-else-if="slide.caption" class="text-gray-500 font-normal">
                                    - {{ slide.caption.slice(0, 40)
                                    }}{{ slide.caption.length > 40 ? t("common.ellipsis") : "" }}
                                </span>
                            </span>
                        </div>
                        <Icon
                            :icon="openSlideIndex === index ? 'ion:chevron-up' : 'ion:chevron-down'"
                            class="w-5 h-5 text-gray-400"
                        />
                    </button>

                    <div
                        v-show="openSlideIndex === index"
                        :id="`slide-content-${index}`"
                        class="px-4 pb-4 space-y-3 border-t border-gray-200"
                    >
                        <div>
                            <label
                                :for="`slide-caption-${index}`"
                                class="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {{ t("slideshowEditor.slideCaption") }}
                            </label>
                            <input
                                :id="`slide-caption-${index}`"
                                :value="slide.caption"
                                type="text"
                                maxlength="500"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                @input="onSlideCaptionInput($event, index)"
                                @blur="handleBlur"
                            />
                            <p class="text-xs text-gray-500 mt-1">
                                {{ slide.caption?.length ?? 0 }}/500
                            </p>
                        </div>

                        <div>
                            <label
                                :for="`slide-alt-${index}`"
                                class="block text-sm font-medium text-gray-700 mb-1"
                            >
                                {{ t("slideshowEditor.imageAlt") }}
                            </label>
                            <input
                                :id="`slide-alt-${index}`"
                                :value="slide.imageAlt"
                                type="text"
                                maxlength="500"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                :placeholder="t('slideshowEditor.imageAltPlaceholder')"
                                @input="onSlideAltInput($event, index)"
                                @blur="handleBlur"
                            />
                            <p class="text-xs text-gray-500 mt-1">
                                {{ slide.imageAlt?.length ?? 0 }}/500 - {{ t("slideshowEditor.imageAltHint") }}
                            </p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                {{ t("slideshowEditor.imageLabel") }}
                            </label>

                            <div v-if="slide.imageUrl" class="mb-3">
                                <img
                                    :src="slide.imageUrl"
                                    :alt="slide.imageAlt || t('slideshowEditor.slideImageAlt')"
                                    class="max-w-full h-auto max-h-64 rounded-md border border-gray-200"
                                    @error="(e) => handleImageError(e, index)"
                                />
                            </div>

                            <div class="flex gap-2">
                                <input
                                    :id="`slide-image-${index}`"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    @change="(e) => handleImageUpload(e, index)"
                                    class="hidden"
                                    :disabled="uploadingSlideIndex === index"
                                />
                                <label
                                    :for="`slide-image-${index}`"
                                    class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    :class="{
                                        'opacity-50 cursor-not-allowed':
                                            uploadingSlideIndex === index,
                                    }"
                                >
                                    <Icon
                                        :icon="
                                            uploadingSlideIndex === index
                                                ? 'ion:hourglass-outline'
                                                : 'ion:cloud-upload-outline'
                                        "
                                        class="w-4 h-4"
                                    />
                                    {{
                                        uploadingSlideIndex === index
                                            ? t("slideshowEditor.uploading")
                                            : slide.imageUrl
                                              ? t("slideshowEditor.changeImage")
                                              : t("slideshowEditor.chooseImage")
                                    }}
                                </label>
                            </div>

                            <div
                                v-if="uploadError && uploadErrorSlideIndex === index"
                                class="mt-2 text-sm text-red-600"
                                role="alert"
                            >
                                {{ uploadError }}
                            </div>

                            <p class="text-xs text-gray-500 mt-2">
                                {{ t("slideshowEditor.acceptedFormats") }}
                                <span v-if="quotaInfo && !hasPrivilegedRole()">
                                    {{ t("slideshowEditor.quotaRemaining", { remaining: formattedRemaining }) }}
                                </span>
                            </p>
                        </div>

                        <div class="pt-2">
                            <button
                                type="button"
                                @click="deleteSlide(index)"
                                class="px-3 py-2 bg-white border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50"
                            >
                                {{ t("slideshowEditor.deleteSlide") }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { useUpload } from "@/composables/useUpload";
import { useQuota } from "@/composables/useQuota";
import { useValidation } from "@/composables/useValidation";
import { useCurrentUserRole } from "@/composables/useCurrentUserRole";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";
import type { EditorSlide } from "@/types/editor";

const { t } = useI18n();

const richpodStore = useRichPodStore();
const { currentChapter, isVerified, richpod } = storeToRefs(richpodStore);
const { runValidation } = useValidation();
const { hasPrivilegedRole } = useCurrentUserRole();

const richpodId = computed(() => richpod.value.id ?? "");

const canUseVerificationGatedFeatures = computed(() => isVerified.value || hasPrivilegedRole());

const slides = computed<EditorSlide[]>(() => {
    const chapter = currentChapter.value;
    if (chapter?.enclosure.__typename === "Slideshow") {
        return chapter.enclosure.slides ?? [];
    }
    return [];
});

const slideshowTitle = computed({
    get: () => {
        const chapter = currentChapter.value;
        if (chapter?.enclosure.__typename !== "Slideshow") {
            return "";
        }
        return chapter.enclosure.title ?? "";
    },
    set: (value: string) => {
        richpodStore.updateCurrentChapter((chapter) => {
            if (chapter.enclosure.__typename !== "Slideshow") {
                return chapter;
            }
            return {
                ...chapter,
                enclosure: {
                    ...chapter.enclosure,
                    title: value,
                },
            };
        });
    },
});

const slideshowDescription = computed({
    get: () => {
        const chapter = currentChapter.value;
        if (chapter?.enclosure.__typename !== "Slideshow") {
            return "";
        }
        return chapter.enclosure.description ?? "";
    },
    set: (value: string) => {
        richpodStore.updateCurrentChapter((chapter) => {
            if (chapter.enclosure.__typename !== "Slideshow") {
                return chapter;
            }
            return {
                ...chapter,
                enclosure: {
                    ...chapter.enclosure,
                    description: value,
                },
            };
        });
    },
});

function handleBlur() {
    richpodStore.updateCurrentChapter((chapter) => {
        if (chapter.enclosure.__typename !== "Slideshow") {
            return chapter;
        }
        return {
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                title: (chapter.enclosure.title ?? "").trim(),
                description: (chapter.enclosure.description ?? "").trim(),
            },
        };
    });
    runValidation();
}

const openSlideIndex = ref<number | null>(null);
const uploadingSlideIndex = ref<number | null>(null);
const uploadError = ref<string | null>(null);
const uploadErrorSlideIndex = ref<number | null>(null);

const { error: uploadServiceError, uploadImage } = useUpload();
const { quotaInfo, fetchQuota, canUpload, formattedRemaining } = useQuota();

onMounted(() => {
    if (canUseVerificationGatedFeatures.value && !hasPrivilegedRole()) {
        fetchQuota();
    }
});

watch(canUseVerificationGatedFeatures, (enabled) => {
    if (enabled && !hasPrivilegedRole()) {
        fetchQuota();
    }
});

function updateSlide(index: number, updater: (slide: EditorSlide) => EditorSlide) {
    richpodStore.updateCurrentChapter((chapter) => {
        if (chapter.enclosure.__typename !== "Slideshow") {
            return chapter;
        }
        const existingSlides = chapter.enclosure.slides ?? [];
        const nextSlides = existingSlides.map((slide, slideIndex) =>
            slideIndex === index ? updater({ ...slide }) : { ...slide },
        );
        return {
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                slides: nextSlides,
            },
        };
    });
}

function addSlide() {
    const chapter = currentChapter.value;
    if (chapter?.enclosure.__typename !== "Slideshow") {
        return;
    }

    if (slides.value.length >= 50) {
        return;
    }

    let nextLength = slides.value.length;

    richpodStore.updateCurrentChapter((chapterState) => {
        if (chapterState.enclosure.__typename !== "Slideshow") {
            return chapterState;
        }

        const existingSlides = chapterState.enclosure.slides
            ? chapterState.enclosure.slides.map((slide) => ({ ...slide }))
            : [];

        existingSlides.push({
            imageUrl: "",
            imageAlt: "",
            caption: "",
            credit: "",
        });

        nextLength = existingSlides.length;

        return {
            ...chapterState,
            enclosure: {
                ...chapterState.enclosure,
                slides: existingSlides,
            },
        };
    });

    nextTick(() => {
        if (nextLength > 0) {
            openSlideIndex.value = nextLength - 1;
        }
    });
}

function toggleSlide(index: number) {
    openSlideIndex.value = openSlideIndex.value === index ? null : index;
}

function deleteSlide(index: number) {
    richpodStore.updateCurrentChapter((chapter) => {
        if (chapter.enclosure.__typename !== "Slideshow") {
            return chapter;
        }
        const existingSlides = chapter.enclosure.slides ?? [];
        const nextSlides = existingSlides
            .filter((_, slideIndex) => slideIndex !== index)
            .map((slide) => ({ ...slide }));
        return {
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                slides: nextSlides,
            },
        };
    });

    if (openSlideIndex.value === index) {
        openSlideIndex.value = null;
    } else if (openSlideIndex.value !== null && openSlideIndex.value > index) {
        openSlideIndex.value = openSlideIndex.value - 1;
    }
}

function onSlideCaptionInput(event: Event, index: number) {
    const value = (event.target as HTMLInputElement).value;
    updateSlide(index, (slide) => ({
        ...slide,
        caption: value,
    }));
}

function onSlideAltInput(event: Event, index: number) {
    const value = (event.target as HTMLInputElement).value;
    updateSlide(index, (slide) => ({
        ...slide,
        imageAlt: value,
    }));
}

async function handleImageUpload(event: Event, index: number) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
        return;
    }

    uploadError.value = null;
    uploadErrorSlideIndex.value = null;

    if (!hasPrivilegedRole() && (!quotaInfo.value || !canUpload(file.size))) {
        uploadError.value = t("slideshowEditor.uploadQuotaExceeded");
        uploadErrorSlideIndex.value = index;
        target.value = "";
        return;
    }

    uploadingSlideIndex.value = index;

    try {
        const downloadUrl = await uploadImage(file, richpodId.value);

        if (downloadUrl) {
            updateSlide(index, (slide) => ({
                ...slide,
                imageUrl: downloadUrl,
            }));
            if (!hasPrivilegedRole()) {
                await fetchQuota();
            }
        } else if (uploadServiceError.value) {
            uploadError.value = uploadServiceError.value;
            uploadErrorSlideIndex.value = index;
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t("slideshowEditor.uploadFailed");
        uploadError.value = message;
        uploadErrorSlideIndex.value = index;
    } finally {
        uploadingSlideIndex.value = null;
        target.value = "";
    }
}

function handleImageError(event: Event, index: number) {
    const slide = slides.value[index];
    console.error("Image failed to load:", slide?.imageUrl);
    uploadError.value = t("slideshowEditor.imageLoadFailed", { url: slide?.imageUrl });
    uploadErrorSlideIndex.value = index;
}

const slidesContainer = ref<HTMLElement | null>(null);
const cleanupFunctions: Array<() => void> = [];

onMounted(() => {
    setupDragAndDrop();
});

onBeforeUnmount(() => {
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions.length = 0;
});

watch(
    () => slides.value.length,
    () => {
        cleanupFunctions.forEach((cleanup) => cleanup());
        cleanupFunctions.length = 0;
        setupDragAndDrop();
    },
);

function setupDragAndDrop() {
    if (!slidesContainer.value) return;

    const slideElements = slidesContainer.value.querySelectorAll(".slide-item");

    slideElements.forEach((element) => {
        const handleElement = element.querySelector(".drag-handle");
        if (!handleElement) return;

        const cleanup = draggable({
            element: element as HTMLElement,
            dragHandle: handleElement as HTMLElement,
            getInitialData: () => {
                const index = parseInt((element as HTMLElement).dataset.slideIndex || "0", 10);
                return { index };
            },
            onDrop: ({ source, location }) => {
                const destination = location.current.dropTargets[0];
                if (!destination) return;

                const sourceIndex = source.data.index as number;
                const destinationElement = destination.element;
                const destinationIndex = parseInt(
                    (destinationElement as HTMLElement).dataset.slideIndex || "0",
                    10,
                );

                if (sourceIndex === destinationIndex) return;

                const chapter = currentChapter.value;
                if (
                    !chapter ||
                    chapter.enclosure.__typename !== "Slideshow" ||
                    !chapter.enclosure.slides
                ) {
                    return;
                }

                const reorderedSlides = reorder({
                    list: chapter.enclosure.slides,
                    startIndex: sourceIndex,
                    finishIndex: destinationIndex,
                });

                richpodStore.updateCurrentChapter((chapterState) => {
                    if (
                        chapterState.enclosure.__typename !== "Slideshow" ||
                        !chapterState.enclosure.slides
                    ) {
                        return chapterState;
                    }

                    return {
                        ...chapterState,
                        enclosure: {
                            ...chapterState.enclosure,
                            slides: reorderedSlides.map((slide) => ({ ...slide })),
                        },
                    };
                });
            },
        });

        cleanupFunctions.push(cleanup);
    });
}
</script>

<style lang="scss" scoped>
.drag-handle {
    touch-action: none;
}
</style>
