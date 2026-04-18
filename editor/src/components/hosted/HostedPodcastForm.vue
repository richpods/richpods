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
                    {{ isEditMode ? t("hostedForm.editTitle") : t("hostedForm.createTitle") }}
                </h1>
            </header>

            <!-- Loading state for edit mode -->
            <div v-if="isEditMode && loadingPodcast" class="flex justify-center py-12">
                <div class="text-gray-500">{{ t("common.loading") }}</div>
            </div>

            <!-- Form -->
            <form v-else @submit.prevent="handleSubmit" class="space-y-6">
                <!-- Cover Image -->
                <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        {{ t("hostedForm.coverImageLabel") }}
                    </label>
                    <div class="flex items-start gap-4">
                        <div
                            class="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0"
                        >
                            <img
                                v-if="coverPreview"
                                :src="coverPreview"
                                alt=""
                                class="w-full h-full object-cover"
                            />
                            <Icon v-else icon="ion:image-outline" class="w-10 h-10 text-gray-400" />
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
                                    coverPreview
                                        ? t("hostedForm.changeCoverImage")
                                        : t("hostedForm.chooseCoverImage")
                                }}
                            </button>
                            <p class="text-xs text-gray-500 mt-2">
                                {{ t("hostedForm.coverImageHint") }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Basic Info -->
                <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4">
                    <div>
                        <label
                            for="podcast-title"
                            class="block text-sm font-medium text-gray-700 mb-1"
                        >
                            {{ t("hostedForm.titleLabel") }} *
                        </label>
                        <input
                            id="podcast-title"
                            v-model="form.title"
                            type="text"
                            maxlength="500"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="t('hostedForm.titlePlaceholder')"
                        />
                    </div>

                    <div>
                        <label
                            for="podcast-description"
                            class="block text-sm font-medium text-gray-700 mb-1"
                        >
                            {{ t("hostedForm.descriptionLabel") }} *
                        </label>
                        <textarea
                            id="podcast-description"
                            v-model="form.description"
                            rows="4"
                            maxlength="2000"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="t('hostedForm.descriptionPlaceholder')"
                        />
                    </div>
                </div>

                <!-- iTunes Metadata -->
                <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4">
                    <h2 class="text-base font-semibold text-gray-900">
                        {{ t("hostedForm.itunesMetadata") }}
                    </h2>

                    <CategorySelect
                        v-model="form.itunesCategory"
                        :label="`${t('hostedForm.categoryLabel')} *`"
                        :placeholder="t('hostedForm.categoryPlaceholder')"
                        required
                    />

                    <div>
                        <label
                            for="podcast-author"
                            class="block text-sm font-medium text-gray-700 mb-1"
                        >
                            {{ t("hostedForm.authorLabel") }} *
                        </label>
                        <input
                            id="podcast-author"
                            v-model="form.itunesAuthor"
                            type="text"
                            maxlength="500"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="t('hostedForm.authorPlaceholder')"
                        />
                    </div>

                    <div>
                        <label
                            for="podcast-language"
                            class="block text-sm font-medium text-gray-700 mb-1"
                        >
                            {{ t("hostedForm.languageLabel") }} *
                        </label>
                        <select
                            id="podcast-language"
                            v-model="form.language"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="en">English</option>
                            <option value="de">Deutsch</option>
                            <option value="fr">Fran\u00E7ais</option>
                            <option value="es">Espa\u00F1ol</option>
                            <option value="it">Italiano</option>
                            <option value="pt">Portugu\u00EAs</option>
                            <option value="nl">Nederlands</option>
                            <option value="ja">日本語</option>
                            <option value="ko">한국어</option>
                            <option value="zh">中文</option>
                        </select>
                    </div>

                    <div>
                        <span class="block text-sm font-medium text-gray-700 mb-2">
                            {{ t("hostedForm.explicitLabel") }} *
                        </span>
                        <div class="flex gap-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    :value="false"
                                    v-model="form.itunesExplicit"
                                    class="text-blue-600"
                                />
                                <span class="text-sm text-gray-700">{{
                                    t("hostedForm.explicitNo")
                                }}</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    :value="true"
                                    v-model="form.itunesExplicit"
                                    class="text-blue-600"
                                />
                                <span class="text-sm text-gray-700">{{
                                    t("hostedForm.explicitYes")
                                }}</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Website -->
                <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4">
                    <h2 class="text-base font-semibold text-gray-900">
                        {{ t("hostedForm.websiteSection") }}
                    </h2>
                    <p class="text-sm text-gray-600">
                        {{ t("hostedForm.websiteSectionHint") }}
                    </p>

                    <div class="flex items-start gap-3">
                        <SwitchGroup as="div" class="flex items-center gap-3">
                            <Switch
                                v-model="form.customWebsite"
                                :class="[
                                    form.customWebsite ? 'bg-blue-600' : 'bg-gray-300',
                                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                                ]"
                            >
                                <span
                                    :class="[
                                        form.customWebsite ? 'translate-x-5' : 'translate-x-0',
                                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                    ]"
                                />
                            </Switch>
                            <SwitchLabel class="text-sm font-medium text-gray-700 cursor-pointer">
                                {{ t("hostedForm.customWebsiteLabel") }}
                            </SwitchLabel>
                        </SwitchGroup>
                    </div>

                    <div v-if="form.customWebsite">
                        <label
                            for="podcast-custom-website-url"
                            class="block text-sm font-medium text-gray-700 mb-1"
                        >
                            {{ t("hostedForm.customWebsiteUrlLabel") }} *
                        </label>
                        <input
                            id="podcast-custom-website-url"
                            v-model="form.link"
                            type="url"
                            maxlength="1000"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :class="customWebsiteUrlInvalid ? 'border-red-400' : ''"
                            :placeholder="t('hostedForm.customWebsiteUrlPlaceholder')"
                        />
                        <p v-if="customWebsiteUrlInvalid" class="mt-1 text-xs text-red-600">
                            {{ t("hostedForm.customWebsiteUrlInvalid") }}
                        </p>
                    </div>

                    <div
                        v-else-if="isEditMode"
                        class="bg-gray-50 rounded-md px-3 py-2 flex items-center gap-2"
                    >
                        <Icon
                            icon="ion:globe-outline"
                            class="w-4 h-4 text-gray-400 flex-shrink-0"
                        />
                        <span class="text-xs text-gray-500 flex-shrink-0">
                            {{ t("hostedForm.autoWebsiteLabel") }}
                        </span>
                        <code class="text-sm text-gray-700 truncate flex-1 font-mono">{{
                            autoWebsiteUrl
                        }}</code>
                        <button
                            type="button"
                            @click="copyAutoWebsiteUrl"
                            class="text-gray-500 hover:text-gray-700 flex-shrink-0 p-1"
                            :title="t('hostedForm.copyAutoWebsiteUrl')"
                        >
                            <Icon icon="ion:copy-outline" class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Platform Links -->
                <div
                    v-if="isEditMode"
                    class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4"
                >
                    <h2 class="text-base font-semibold text-gray-900">
                        {{ t("hostedForm.platformLinksSection") }}
                    </h2>
                    <p class="text-sm text-gray-600">
                        {{ t("hostedForm.platformLinksHint") }}
                    </p>

                    <div v-for="platform in platformLinkFields" :key="platform.key">
                        <label
                            :for="`podcast-${platform.key}`"
                            class="block text-sm font-medium text-gray-700 mb-1"
                        >
                            {{ platform.label }}
                        </label>
                        <div class="flex items-stretch">
                            <span
                                class="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-md bg-gray-50"
                                :style="{ color: platform.color }"
                            >
                                <Icon :icon="platform.icon" class="w-5 h-5" />
                            </span>
                            <input
                                :id="`podcast-${platform.key}`"
                                v-model="form[platform.key]"
                                type="url"
                                maxlength="1000"
                                class="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-r-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="platformLinkInvalid[platform.key] ? 'border-red-400' : ''"
                                :placeholder="platform.placeholder"
                            />
                        </div>
                        <p
                            v-if="platformLinkInvalid[platform.key]"
                            class="mt-1 text-xs text-red-600"
                        >
                            {{
                                t("hostedForm.platformUrlPrefixInvalid", {
                                    prefixes: platform.allowedHint,
                                })
                            }}
                        </p>
                    </div>
                </div>

                <!-- Optional Fields -->
                <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4">
                    <h2 class="text-base font-semibold text-gray-900">
                        {{ t("hostedForm.optionalFields") }}
                    </h2>

                    <div>
                        <label
                            for="podcast-copyright"
                            class="block text-sm font-medium text-gray-700 mb-1"
                        >
                            {{ t("hostedForm.copyrightLabel") }}
                        </label>
                        <input
                            id="podcast-copyright"
                            v-model="form.copyright"
                            type="text"
                            maxlength="500"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="t('hostedForm.copyrightPlaceholder')"
                        />
                    </div>

                    <div>
                        <label
                            for="podcast-itunes-type"
                            class="block text-sm font-medium text-gray-700 mb-1"
                        >
                            {{ t("hostedForm.itunesTypeLabel") }}
                        </label>
                        <select
                            id="podcast-itunes-type"
                            v-model="form.itunesType"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{{ t("hostedForm.itunesTypeNone") }}</option>
                            <option value="episodic">
                                {{ t("hostedForm.itunesTypeEpisodic") }}
                            </option>
                            <option value="serial">{{ t("hostedForm.itunesTypeSerial") }}</option>
                        </select>
                    </div>

                    <div>
                        <label
                            for="podcast-apple-verify"
                            class="block text-sm font-medium text-gray-700 mb-1"
                        >
                            {{ t("hostedForm.applePodcastsVerifyLabel") }}
                        </label>
                        <input
                            id="podcast-apple-verify"
                            v-model="form.applePodcastsVerifyTxt"
                            type="text"
                            maxlength="500"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                            :placeholder="t('hostedForm.applePodcastsVerifyPlaceholder')"
                        />
                    </div>
                </div>

                <!-- Submit error -->
                <div v-if="submitError" class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p class="text-red-800 text-sm">{{ submitError }}</p>
                </div>

                <!-- Submit -->
                <div class="flex justify-end gap-3">
                    <button
                        type="button"
                        @click="router.push('/hosted')"
                        class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                    >
                        {{ t("common.cancel") }}
                    </button>
                    <button
                        type="submit"
                        :disabled="submitting"
                        class="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icon
                            v-if="submitting"
                            icon="ion:sync-outline"
                            class="w-5 h-5 mr-2 inline animate-spin"
                        />
                        {{
                            submitting
                                ? isEditMode
                                    ? t("hostedForm.saving")
                                    : t("hostedForm.creating")
                                : isEditMode
                                  ? t("hostedForm.savePodcast")
                                  : t("hostedForm.createPodcast")
                        }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { Switch, SwitchGroup, SwitchLabel } from "@headlessui/vue";
import { auth } from "@/lib/firebase";
import { graphqlSdk } from "@/lib/graphql";
import CategorySelect from "./CategorySelect.vue";

type PlatformLinkKey =
    | "platformLinkApplePodcasts"
    | "platformLinkSpotify"
    | "platformLinkAmazonMusic"
    | "platformLinkYouTubeMusic";

const APPLE_PODCASTS_URL_PATTERN = /^https:\/\/(itunes|podcasts)\.apple\.com\//i;
const SPOTIFY_URL_PATTERN = /^https:\/\/open\.spotify\.com\//i;
const YOUTUBE_MUSIC_URL_PATTERN = /^https:\/\/(www|music)\.youtube\.com\//i;
const AMAZON_MUSIC_URL_PATTERN =
    /^https:\/\/music\.amazon\.(co\.za|com\.br|com\.mx|co\.jp|com\.tr|com\.be|co\.uk|com\.au|com|eg|ca|cn|in|sa|sg|ae|fr|de|ie|it|nl|pl|es|se)\//i;

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const podcastId = computed(() => route.params.id as string | undefined);
const isEditMode = computed(() => !!podcastId.value);

const loadingPodcast = ref(false);
const submitting = ref(false);
const submitError = ref("");

const coverInputRef = ref<HTMLInputElement | null>(null);
const coverFile = ref<File | null>(null);
const coverPreview = ref<string | null>(null);

const form = ref({
    title: "",
    description: "",
    link: "https://www.richpods.org",
    language: locale.value.split("-")[0] || "en",
    itunesCategory: "",
    itunesExplicit: false,
    itunesAuthor: "",
    itunesType: "",
    copyright: "",
    applePodcastsVerifyTxt: "",
    customWebsite: false,
    platformLinkApplePodcasts: "",
    platformLinkSpotify: "",
    platformLinkAmazonMusic: "",
    platformLinkYouTubeMusic: "",
});

const websiteUrlPattern = import.meta.env.VITE_WEBSITE_HOSTED_PODCAST_URL_PATTERN as
    | string
    | undefined;

const autoWebsiteUrl = computed(() => {
    const pattern = websiteUrlPattern ?? "https://www.richpods.org/podcast/{ID}";
    const id = podcastId.value || "{ID}";
    return pattern.replace("{ID}", id);
});

const platformLinkFields = computed<
    Array<{
        key: PlatformLinkKey;
        label: string;
        placeholder: string;
        icon: string;
        color: string;
        allowedPattern: RegExp;
        allowedHint: string;
    }>
>(() => [
    {
        key: "platformLinkApplePodcasts",
        label: t("hostedForm.platformAppleLabel"),
        placeholder: "https://podcasts.apple.com/\u2026",
        icon: "simple-icons:applepodcasts",
        color: "#9933CC",
        allowedPattern: APPLE_PODCASTS_URL_PATTERN,
        allowedHint: "https://itunes.apple.com/, https://podcasts.apple.com/",
    },
    {
        key: "platformLinkSpotify",
        label: t("hostedForm.platformSpotifyLabel"),
        placeholder: "https://open.spotify.com/show/\u2026",
        icon: "simple-icons:spotify",
        color: "#1DB954",
        allowedPattern: SPOTIFY_URL_PATTERN,
        allowedHint: "https://open.spotify.com/",
    },
    {
        key: "platformLinkAmazonMusic",
        label: t("hostedForm.platformAmazonLabel"),
        placeholder: "https://music.amazon.com/podcasts/\u2026",
        icon: "simple-icons:amazonmusic",
        color: "#00A8E1",
        allowedPattern: AMAZON_MUSIC_URL_PATTERN,
        allowedHint: "https://music.amazon.<tld>/",
    },
    {
        key: "platformLinkYouTubeMusic",
        label: t("hostedForm.platformYouTubeLabel"),
        placeholder: "https://music.youtube.com/playlist?list=\u2026",
        icon: "simple-icons:youtubemusic",
        color: "#FF0000",
        allowedPattern: YOUTUBE_MUSIC_URL_PATTERN,
        allowedHint: "https://www.youtube.com/, https://music.youtube.com/",
    },
]);

function isValidUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function matchesAllowedPattern(value: string, pattern: RegExp): boolean {
    return pattern.test(value);
}

const customWebsiteUrlInvalid = computed(() => {
    if (!form.value.customWebsite) return false;
    const value = form.value.link.trim();
    if (!value) return false;
    return !isValidUrl(value);
});

const platformLinkInvalid = computed<Record<PlatformLinkKey, boolean>>(() => {
    const result = {} as Record<PlatformLinkKey, boolean>;
    for (const platform of platformLinkFields.value) {
        const value = form.value[platform.key].trim();
        if (value.length === 0) {
            result[platform.key] = false;
            continue;
        }
        result[platform.key] =
            !isValidUrl(value) || !matchesAllowedPattern(value, platform.allowedPattern);
    }
    return result;
});

function handleCoverSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    coverFile.value = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        coverPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
}

async function getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required");
    return user.getIdToken();
}

function getApiBaseUrl(): string {
    const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT as string;
    return new URL(graphqlEndpoint).origin;
}

function validateUrlFields(): string | null {
    if (form.value.customWebsite) {
        const value = form.value.link.trim();
        if (!value) {
            return t("hostedForm.customWebsiteUrlRequired");
        }
        if (!isValidUrl(value)) {
            return t("hostedForm.customWebsiteUrlInvalid");
        }
    }

    for (const platform of platformLinkFields.value) {
        const value = form.value[platform.key].trim();
        if (!value) continue;
        if (!isValidUrl(value)) {
            return t("hostedForm.platformUrlInvalid");
        }
        if (!matchesAllowedPattern(value, platform.allowedPattern)) {
            return t("hostedForm.platformUrlPrefixInvalid", {
                prefixes: platform.allowedHint,
            });
        }
    }

    return null;
}

async function handleSubmit() {
    submitError.value = "";

    const validationError = validateUrlFields();
    if (validationError) {
        submitError.value = validationError;
        return;
    }

    submitting.value = true;

    try {
        if (isEditMode.value && podcastId.value) {
            await handleUpdate();
        } else {
            await handleCreate();
        }
    } catch (err: unknown) {
        console.error("Error saving podcast:", err);
        submitError.value =
            err instanceof Error
                ? err.message
                : isEditMode.value
                  ? t("hostedForm.updateFailed")
                  : t("hostedForm.createFailed");
    } finally {
        submitting.value = false;
    }
}

async function handleCreate() {
    if (!coverFile.value) {
        submitError.value = t("hostedForm.coverRequired");
        return;
    }

    const token = await getAuthToken();
    const baseUrl = getApiBaseUrl();

    const metadata = {
        title: form.value.title,
        description: form.value.description,
        link: form.value.link || null,
        language: form.value.language,
        itunesCategory: form.value.itunesCategory,
        itunesExplicit: form.value.itunesExplicit,
        itunesAuthor: form.value.itunesAuthor,
        itunesType: form.value.itunesType || null,
        copyright: form.value.copyright || null,
        applePodcastsVerifyTxt: form.value.applePodcastsVerifyTxt || null,
        customWebsite: form.value.customWebsite,
        platformLinkApplePodcasts: form.value.platformLinkApplePodcasts.trim() || null,
        platformLinkSpotify: form.value.platformLinkSpotify.trim() || null,
        platformLinkAmazonMusic: form.value.platformLinkAmazonMusic.trim() || null,
        platformLinkYouTubeMusic: form.value.platformLinkYouTubeMusic.trim() || null,
    };

    const formData = new FormData();
    formData.append("cover", coverFile.value);
    formData.append("metadata", JSON.stringify(metadata));

    const response = await fetch(`${baseUrl}/api/v1/hosted/podcast`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || t("hostedForm.createFailed"));
    }

    router.push("/hosted");
}

async function handleUpdate() {
    const id = podcastId.value!;

    await graphqlSdk.UpdateHostedPodcast({
        id,
        input: {
            title: form.value.title,
            description: form.value.description,
            link: form.value.link || null,
            language: form.value.language,
            itunesCategory: form.value.itunesCategory,
            itunesExplicit: form.value.itunesExplicit,
            itunesAuthor: form.value.itunesAuthor,
            itunesType: form.value.itunesType || null,
            copyright: form.value.copyright || null,
            applePodcastsVerifyTxt: form.value.applePodcastsVerifyTxt || null,
            customWebsite: form.value.customWebsite,
            platformLinkApplePodcasts: form.value.platformLinkApplePodcasts.trim() || null,
            platformLinkSpotify: form.value.platformLinkSpotify.trim() || null,
            platformLinkAmazonMusic: form.value.platformLinkAmazonMusic.trim() || null,
            platformLinkYouTubeMusic: form.value.platformLinkYouTubeMusic.trim() || null,
        },
    });

    // Upload new cover if changed
    if (coverFile.value) {
        const token = await getAuthToken();
        const baseUrl = getApiBaseUrl();

        const formData = new FormData();
        formData.append("cover", coverFile.value);

        const response = await fetch(`${baseUrl}/api/v1/hosted/podcast/${id}/cover`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error || t("hostedForm.coverUploadFailed"));
        }
    }

    router.push("/hosted");
}

function copyAutoWebsiteUrl() {
    navigator.clipboard.writeText(autoWebsiteUrl.value).then(() => {
        alert(t("hostedForm.autoWebsiteUrlCopied"));
    });
}

async function loadExistingPodcast() {
    if (!podcastId.value) return;

    loadingPodcast.value = true;
    try {
        const response = await graphqlSdk.HostedPodcast({ id: podcastId.value });
        const podcast = response.hostedPodcast;
        if (!podcast) {
            router.push("/hosted");
            return;
        }

        form.value = {
            title: podcast.title,
            description: podcast.description,
            link: podcast.link,
            language: podcast.language,
            itunesCategory: podcast.itunesCategory,
            itunesExplicit: podcast.itunesExplicit,
            itunesAuthor: podcast.itunesAuthor,
            itunesType: podcast.itunesType || "",
            copyright: podcast.copyright || "",
            applePodcastsVerifyTxt: podcast.applePodcastsVerifyTxt || "",
            customWebsite: podcast.customWebsite ?? false,
            platformLinkApplePodcasts: podcast.platformLinkApplePodcasts || "",
            platformLinkSpotify: podcast.platformLinkSpotify || "",
            platformLinkAmazonMusic: podcast.platformLinkAmazonMusic || "",
            platformLinkYouTubeMusic: podcast.platformLinkYouTubeMusic || "",
        };
        coverPreview.value = podcast.coverImageUrl;
    } catch (err: unknown) {
        console.error("Error loading podcast:", err);
        router.push("/hosted");
    } finally {
        loadingPodcast.value = false;
    }
}

onMounted(() => {
    if (isEditMode.value) {
        loadExistingPodcast();
    }
});
</script>
