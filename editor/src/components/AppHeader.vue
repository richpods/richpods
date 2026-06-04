<template>
    <RipoSiteHeader
        :route-key="route.fullPath"
        :open-menu-label="t('header.openMenu')"
        :close-menu-label="t('header.closeMenu')"
    >
        <template #nav>
            <RipoButton
                v-for="tab in tabs"
                :key="tab.id"
                as="button"
                size="small"
                :active="activeTab === tab.id"
                @click="handleTabClick(tab)"
            >
                <template #icon-left>
                    <Icon :icon="tab.icon" class="nav-icon" />
                </template>
                {{ tab.label }}
            </RipoButton>
        </template>

        <template #mobile-nav="{ close }">
            <RipoButton
                v-for="tab in tabs"
                :key="tab.id"
                as="button"
                size="large"
                block
                :active="activeTab === tab.id"
                @click="handleMobileTabClick(tab, close)"
            >
                <template #icon-left>
                    <Icon :icon="tab.icon" class="nav-icon" />
                </template>
                {{ tab.label }}
            </RipoButton>
        </template>

        <template #actions>
            <div class="relative" @click.stop>
                <button
                    @click.stop="showDropdown = !showDropdown"
                    class="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                    <img
                        v-if="userPhotoURL"
                        :src="userPhotoURL"
                        :alt="user?.displayName || t('header.userAvatar')"
                        class="w-full h-full object-cover"
                    />
                    <div
                        v-else
                        class="w-full h-full flex items-center justify-center bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                    >
                        <span class="text-sm font-medium">{{ userInitial }}</span>
                    </div>
                </button>

                <div
                    v-if="showDropdown"
                    @click.stop
                    class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
                >
                    <div class="py-1">
                        <button
                            @click="openProfileModal"
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                            <svg
                                class="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                            {{ t("header.editProfile") }}
                        </button>
                        <button
                            @click="handleSignOut"
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                            <svg
                                class="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            {{ t("auth.signOut") }}
                        </button>
                    </div>
                </div>
            </div>
        </template>

        <template #logo>
            <router-link to="/richpods" class="logo-link">
                <img
                    src="@richpods/shared/assets/images/logo-full.svg"
                    :alt="t('common.richPods')"
                    class="logo"
                />
            </router-link>
        </template>
    </RipoSiteHeader>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import RipoSiteHeader from "@richpods/shared/components/RipoSiteHeader.vue";
import RipoButton from "@richpods/shared/components/RipoButton.vue";
import { signOutUser, auth } from "@/lib/firebase";
import { onAuthStateChanged, type Unsubscribe, type User } from "firebase/auth";
import { useCurrentUserRole } from "@/composables/useCurrentUserRole";

type HeaderTab = { id: string; label: string; path: string; icon: string };

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { hasPrivilegedRole } = useCurrentUserRole();

const tabs = computed<HeaderTab[]>(() => {
    const baseTabs: HeaderTab[] = [
        {
            id: "richpods",
            label: t("header.myRichPods"),
            path: "/richpods",
            icon: "ion:list-outline",
        },
        {
            id: "create",
            label: t("header.createRichPod"),
            path: "/new-episode",
            icon: "ion:add-circle-outline",
        },
    ];

    if (hasPrivilegedRole()) {
        baseTabs.push({
            id: "hosted",
            label: t("header.hostedRichPods"),
            path: "/hosted",
            icon: "ion:mic-outline",
        });
    }

    baseTabs.push(
        {
            id: "verification",
            label: t("header.verification"),
            path: "/verification",
            icon: "ion:shield-checkmark-outline",
        },
        {
            id: "profile",
            label: t("header.profile"),
            path: "/profile",
            icon: "ion:person-outline",
        },
    );

    return baseTabs;
});

const activeTab = computed(() => {
    const currentPath = route.path;
    const tab = tabs.value.find((entry) => currentPath.startsWith(entry.path));
    return tab?.id || "richpods";
});

const showDropdown = ref(false);
const user = ref<User | null>(null);

let unsubscribe: Unsubscribe | null = null;

const userInitial = computed(() => {
    if (user.value?.displayName) {
        return user.value.displayName.charAt(0).toUpperCase();
    } else if (user.value?.email) {
        return user.value.email.charAt(0).toUpperCase();
    }
    return t("header.userInitialFallback");
});

const userPhotoURL = computed(() => user.value?.photoURL || null);

const handleSignOut = async () => {
    try {
        showDropdown.value = false;
        await signOutUser();
        router.push("/");
    } catch (error) {
        console.error("Sign out error:", error);
    }
};

const openProfileModal = () => {
    showDropdown.value = false;
    router.push("/profile");
};

const handleTabClick = (tab: HeaderTab) => {
    router.push(tab.path);
};

const handleMobileTabClick = (tab: HeaderTab, close: () => void) => {
    close();
    router.push(tab.path);
};

onMounted(() => {
    unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser;
    });
});

onMounted(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest(".relative")) {
            showDropdown.value = false;
        }
    };

    document.addEventListener("click", handleClickOutside);

    onUnmounted(() => {
        document.removeEventListener("click", handleClickOutside);
    });
});

onUnmounted(() => {
    if (unsubscribe) {
        unsubscribe();
    }
});
</script>

<style scoped lang="scss">
.nav-icon {
    width: 1.1em;
    height: 1.1em;
    margin-right: 0.4em;
    flex-shrink: 0;
}

.logo-link {
    display: flex;
    align-items: center;
    height: 100%;
}

.logo {
    max-width: 180px;
    max-height: 40px;
    width: auto;
    height: auto;
    object-fit: contain;
}
</style>
