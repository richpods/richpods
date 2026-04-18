<template>
    <div class="min-h-full bg-gray-50 py-4 sm:py-6">
        <div class="max-w-2xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6">
            <header>
                <button
                    @click="router.push('/hosted')"
                    class="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1"
                >
                    <Icon icon="ion:arrow-back" class="w-4 h-4" />
                    {{ t("common.back") }}
                </button>
                <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
                    {{ t("addEpisode.title") }}
                </h1>
                <p class="mt-1 text-sm text-gray-600">
                    {{ t("addEpisode.subtitle") }}
                </p>
            </header>

            <!-- Loading podcast info -->
            <div v-if="loading" class="flex justify-center py-12">
                <div class="text-gray-500">{{ t("common.loading") }}</div>
            </div>

            <!-- Podcast context -->
            <div v-else-if="podcast" class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <div class="flex gap-4 mb-6">
                    <img
                        :src="podcast.coverImageUrl"
                        :alt="podcast.title"
                        class="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div>
                        <h2 class="font-semibold text-gray-900">{{ podcast.title }}</h2>
                        <p class="text-sm text-gray-500">{{ podcast.itunesCategory }}</p>
                    </div>
                </div>

                <!-- MP3 Upload -->
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            {{ t("addEpisode.audioFileLabel") }} *
                        </label>
                        <div
                            class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                            @click="audioInputRef?.click()"
                            @dragover.prevent="dragOver = true"
                            @dragleave="dragOver = false"
                            @drop.prevent="handleAudioDrop"
                            :class="{ 'border-blue-400 bg-blue-50': dragOver }"
                        >
                            <input
                                ref="audioInputRef"
                                type="file"
                                accept="audio/mpeg,.mp3"
                                class="hidden"
                                @change="handleAudioSelect"
                            />
                            <Icon
                                icon="ion:cloud-upload-outline"
                                class="w-10 h-10 mx-auto text-gray-400 mb-2"
                            />
                            <p v-if="audioFile" class="text-sm font-medium text-gray-900">
                                {{ audioFile.name }} ({{ formatFileSize(audioFile.size) }})
                            </p>
                            <p v-else class="text-sm text-gray-600">
                                {{ t("addEpisode.dropOrChoose") }}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                                {{ audioHint }}
                            </p>
                        </div>
                    </div>

                    <!-- Optional cover image -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            {{ t("addEpisode.episodeCoverLabel") }}
                        </label>
                        <div class="flex items-start gap-4">
                            <div
                                class="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0"
                            >
                                <img
                                    v-if="episodeCoverPreview"
                                    :src="episodeCoverPreview"
                                    alt=""
                                    class="w-full h-full object-cover"
                                />
                                <Icon
                                    v-else
                                    icon="ion:image-outline"
                                    class="w-10 h-10 text-gray-400"
                                />
                            </div>
                            <div>
                                <input
                                    ref="coverInputRef"
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    class="hidden"
                                    @change="handleCoverSelect"
                                />
                                <button
                                    type="button"
                                    @click="coverInputRef?.click()"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                                >
                                    <Icon icon="ion:cloud-upload-outline" class="w-4 h-4" />
                                    {{
                                        episodeCoverPreview
                                            ? t("hostedForm.changeCoverImage")
                                            : t("hostedForm.chooseCoverImage")
                                    }}
                                </button>
                                <p class="text-xs text-gray-500 mt-2">
                                    {{ t("addEpisode.episodeCoverHint") }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Upload progress -->
                    <div v-if="uploading" class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">{{ t("addEpisode.uploading") }}</span>
                            <span class="text-gray-900 font-medium">{{ uploadProgress }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div
                                class="bg-blue-600 h-2 rounded-full transition-all"
                                :style="{ width: `${uploadProgress}%` }"
                            />
                        </div>
                    </div>

                    <!-- Validation in progress -->
                    <div
                        v-if="validating"
                        class="flex items-start gap-3 py-4 px-4 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                        <Icon
                            icon="ion:sync-outline"
                            class="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5"
                        />
                        <p class="text-sm text-blue-800">{{ t("addEpisode.validatingInfo") }}</p>
                    </div>

                    <!-- File size error -->
                    <div
                        v-if="fileSizeError"
                        class="bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                        <p class="text-red-800 text-sm">{{ fileSizeError }}</p>
                    </div>

                    <!-- Upload error -->
                    <div v-if="uploadError" class="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p class="text-red-800 text-sm">{{ uploadError }}</p>
                    </div>

                    <!-- Submit -->
                    <button
                        @click="handleUpload"
                        :disabled="!audioFile || !!fileSizeError || uploading || validating"
                        class="w-full px-6 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icon
                            v-if="uploading || validating"
                            icon="ion:sync-outline"
                            class="w-5 h-5 mr-2 inline animate-spin"
                        />
                        <Icon v-else icon="ion:cloud-upload-outline" class="w-5 h-5 mr-2 inline" />
                        {{
                            uploading
                                ? t("addEpisode.uploading")
                                : validating
                                  ? t("addEpisode.validating")
                                  : t("addEpisode.uploadEpisode")
                        }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { graphqlSdk, type HostedPodcastQuery, type InstanceInfoQuery } from "@/lib/graphql";
import { useHostedUpload } from "@/composables/useHostedUpload";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { uploading, validating, uploadProgress, uploadError, uploadEpisode } = useHostedUpload();

type HostedPodcast = NonNullable<HostedPodcastQuery["hostedPodcast"]>;
type HostingLimits = InstanceInfoQuery["instanceInfo"]["hosting"];

const podcastId = route.params.id as string;

const podcast = ref<HostedPodcast | null>(null);
const hostingLimits = ref<HostingLimits | null>(null);
const loading = ref(true);

const audioInputRef = ref<HTMLInputElement | null>(null);
const coverInputRef = ref<HTMLInputElement | null>(null);
const audioFile = ref<File | null>(null);
const episodeCoverFile = ref<File | null>(null);
const episodeCoverPreview = ref<string | null>(null);
const dragOver = ref(false);

const audioHint = computed(() => {
    if (!hostingLimits.value) return "";
    const maxMB = Math.round(hostingLimits.value.mp3MaxFileSizeBytes / (1024 * 1024));
    const maxKbps = hostingLimits.value.mp3MaxBitrateKbps;
    return t("addEpisode.audioHintDynamic", { maxMB, maxKbps });
});

const fileSizeError = computed<string | null>(() => {
    if (!audioFile.value || !hostingLimits.value) return null;
    const size = audioFile.value.size;
    if (size > hostingLimits.value.mp3MaxFileSizeBytes) {
        const maxMB = Math.round(hostingLimits.value.mp3MaxFileSizeBytes / (1024 * 1024));
        return t("addEpisode.fileTooLarge", { max: `${maxMB} MB` });
    }
    if (size < hostingLimits.value.mp3MinFileSizeBytes) {
        const minKB = Math.round(hostingLimits.value.mp3MinFileSizeBytes / 1024);
        return t("addEpisode.fileTooSmall", { min: `${minKB} KB` });
    }
    return null;
});

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function handleAudioSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) audioFile.value = file;
}

function handleAudioDrop(event: DragEvent) {
    dragOver.value = false;
    const file = event.dataTransfer?.files[0];
    if (file && (file.type === "audio/mpeg" || file.name.endsWith(".mp3"))) {
        audioFile.value = file;
    }
}

function handleCoverSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    episodeCoverFile.value = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        episodeCoverPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
}

async function handleUpload() {
    if (!audioFile.value) return;

    try {
        const result = await uploadEpisode({
            podcastId,
            audioFile: audioFile.value,
            coverFile: episodeCoverFile.value,
        });

        if (result.richPodId) {
            router.push(`/edit/${result.richPodId}`);
        } else {
            router.push(`/hosted`);
        }
    } catch (err: unknown) {
        console.error("Upload error:", err);
    }
}

onMounted(async () => {
    try {
        const [podcastResponse, instanceResponse] = await Promise.all([
            graphqlSdk.HostedPodcast({ id: podcastId }),
            graphqlSdk.InstanceInfo(),
        ]);

        podcast.value = podcastResponse.hostedPodcast ?? null;
        hostingLimits.value = instanceResponse.instanceInfo.hosting;

        if (!podcast.value) {
            router.push("/hosted");
        }
    } catch (err) {
        console.error("Error loading podcast:", err);
        router.push("/hosted");
    } finally {
        loading.value = false;
    }
});
</script>
