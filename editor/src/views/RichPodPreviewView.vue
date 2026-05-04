<template>
    <div class="preview-shell">
        <div v-if="loading" class="preview-state">
            <RipoSpinner
                :size="48"
                color="var(--richpod-header-background-color)"
                track-color="rgba(255, 255, 255, 0.15)"
                :label="t('common.loading')"
            />
        </div>
        <div v-else-if="error" class="preview-state preview-error">
            <p>{{ t("common.error", { message: error.message }) }}</p>
            <button @click="reload" class="underline">{{ t("common.retry") }}</button>
        </div>
        <div v-else-if="unavailable" class="preview-state">
            <h1 class="preview-unavailable-title">
                {{ t("editor.previewUnavailableTitle") }}
            </h1>
            <p class="preview-unavailable-body">{{ t("editor.previewUnavailableBody") }}</p>
            <RouterLink
                v-if="!user"
                :to="{ name: 'signin' }"
                class="preview-signin-link"
            >
                {{ t("editor.previewUnavailableSignIn") }}
            </RouterLink>
            <RouterLink v-else :to="{ name: 'richpods' }" class="preview-signin-link">
                {{ t("header.myRichPods") }}
            </RouterLink>
        </div>
        <template v-else-if="richPod">
            <div class="preview-bar">
                <div class="preview-bar-notice">
                    <Icon icon="ion:eye-outline" class="w-4 h-4 flex-shrink-0" />
                    <span>{{ t("editor.previewBannerNotice") }}</span>
                </div>
                <PreviewViewportSelector />
            </div>
            <div class="preview-frame-container">
                <div class="preview-frame" :style="frameStyle">
                    <PodPlayer preview />
                </div>
            </div>
        </template>
        <div v-else class="preview-state preview-error">
            {{ t("common.noRichPodLoaded") }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import PodPlayer from "@player/components/PodPlayer.vue";
import { setRichPod, useRichPod } from "@player/composables/useRichPod";
import RipoSpinner from "@richpods/shared/components/RipoSpinner.vue";
import { graphqlSdk } from "@/lib/graphql";
import { useAuthState } from "@/composables/useAuthState";
import { usePreviewViewport } from "@/composables/usePreviewViewport";
import PreviewViewportSelector from "@/components/editor/PreviewViewportSelector.vue";
import type { RichPod as PlayerRichPod } from "@player/graphql/generated";

const { t } = useI18n();
const route = useRoute();
const { user, isAuthReady } = useAuthState();

const playerUrlPattern = import.meta.env.VITE_PLAYER_URL_PATTERN as string | undefined;

const { richPod } = useRichPod();
const loading = ref(false);
const error = ref<Error | null>(null);
const unavailable = ref(false);

const { frameStyle } = usePreviewViewport();

function publicPlayerUrl(id: string): string | null {
    if (!playerUrlPattern) return null;
    return playerUrlPattern.replace("{ID}", id);
}

async function load(id: string) {
    loading.value = true;
    error.value = null;
    unavailable.value = false;
    setRichPod(null);

    try {
        const response = await graphqlSdk.GetRichPod({ id });
        const data = response.richPod;

        if (user.value) {
            if (data) {
                setRichPod(data as unknown as PlayerRichPod);
            } else {
                unavailable.value = true;
            }
            return;
        }

        if (data) {
            const publicUrl = publicPlayerUrl(id);
            if (publicUrl) {
                window.location.replace(publicUrl);
                return;
            }
            setRichPod(data as unknown as PlayerRichPod);
            return;
        }

        unavailable.value = true;
    } catch (err) {
        error.value = err as Error;
    } finally {
        loading.value = false;
    }
}

function reload() {
    const id = route.params.id;
    if (typeof id === "string") {
        load(id);
    }
}

async function startLoad() {
    const id = route.params.id;
    if (typeof id !== "string") return;
    if (!isAuthReady.value) {
        await new Promise<void>((resolve) => {
            const stop = watch(isAuthReady, (ready) => {
                if (ready) {
                    stop();
                    resolve();
                }
            });
        });
    }
    load(id);
}

onMounted(() => {
    startLoad();
});

watch(
    () => route.params.id,
    (id) => {
        if (typeof id === "string" && isAuthReady.value) {
            load(id);
        }
    },
);

onUnmounted(() => {
    setRichPod(null);
});
</script>

<style lang="scss" scoped>
.preview-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.preview-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    height: 100%;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.5rem;
    text-align: center;
}

.preview-error {
    color: #b91c1c;
}

.preview-unavailable-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
}

.preview-unavailable-body {
    margin: 0;
    color: #4b5563;
    max-width: 32rem;
}

.preview-signin-link {
    margin-top: 0.5rem;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    background-color: #2563eb;
    color: #ffffff;
    font-weight: 500;
    text-decoration: none;

    &:hover {
        background-color: #1d4ed8;
    }
}

.preview-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    background: #fffbeb;
    flex-shrink: 0;
}

.preview-bar-notice {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #78350f;
}

.preview-frame-container {
    flex: 1;
    min-height: 0;
    display: flex;
    justify-content: center;
    overflow: auto;
    background: #f3f4f6;
    padding: 1rem;
}

.preview-frame {
    width: 100%;
    min-height: 100%;
    background: var(--richpod-background-color, #1f1f1f);
    border-radius: 8px;
    overflow: hidden;
    box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.18),
        0 8px 10px -6px rgba(0, 0, 0, 0.12);
    transition: width 0.2s ease;
    display: flex;
    flex-direction: column;
}
</style>
