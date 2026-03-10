<template>
    <div id="app" class="h-screen flex flex-col">
        <div v-if="!isAuthReady" class="flex items-center justify-center h-screen">
            <div class="text-gray-500">{{ t("common.loading") }}</div>
        </div>
        <template v-else>
            <template v-if="user">
                <AppHeader />
                <main class="flex-1 overflow-auto" style="scrollbar-gutter: stable">
                    <router-view />
                </main>
            </template>
            <router-view v-else />
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { user, isAuthReady } from "@/composables/useAuthState";
import { useCurrentUserRole } from "@/composables/useCurrentUserRole";
import { graphqlSdk } from "@/lib/graphql";
import { resolveEditorLanguage } from "@/i18n/language";
import AppHeader from "@/components/AppHeader.vue";

const { t, locale } = useI18n();
const { setRole, clearRole } = useCurrentUserRole();
const lastUserId = ref<string | null>(null);

const applyLocale = (preferred?: string | null) => {
    locale.value = resolveEditorLanguage(preferred);
};

const loadUserLocale = async (): Promise<void> => {
    try {
        const response = await graphqlSdk.GetCurrentUser();
        applyLocale(response.currentUser?.editorLanguage ?? null);
        setRole(response.currentUser?.role ?? null);
    } catch (error) {
        console.error("Failed to load user locale:", error);
        applyLocale(null);
        clearRole();
    }
};

watch(
    [isAuthReady, user],
    ([ready, currentUser]) => {
        if (!ready) {
            return;
        }

        const currentUserId = currentUser?.uid ?? null;
        if (currentUserId === lastUserId.value && currentUserId) {
            return;
        }

        lastUserId.value = currentUserId;

        if (currentUser) {
            void loadUserLocale();
        } else {
            applyLocale(null);
            clearRole();
        }
    },
    { immediate: true },
);
</script>
