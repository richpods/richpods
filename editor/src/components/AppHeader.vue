<template>
    <div>
        <header class="bg-white border-b border-gray-200">
            <div class="container mx-auto px-4">
                <div class="flex items-center justify-between h-16">
                    <div class="flex">
                        <img
                            src="@richpods/shared/assets/images/logo-full.svg"
                            :alt="t('common.richPods')"
                            class="max-h-12 w-auto block"
                        />
                    </div>

                    <nav class="hidden lg:flex items-center space-x-8">
                        <button
                            v-for="tab in tabs"
                            :key="tab.id"
                            @click="handleTabClick(tab)"
                            :class="[
                                'text-sm font-medium transition-colors',
                                activeTab === tab.id
                                    ? 'text-gray-900 border-b-2 border-gray-900 pb-1'
                                    : 'text-gray-500 hover:text-gray-700',
                            ]"
                        >
                            {{ tab.label }}
                        </button>
                    </nav>

                    <div class="flex items-center space-x-4">
                        <!-- Mobile menu toggle -->
                        <button
                            class="lg:hidden p-2 text-gray-500 hover:text-gray-700 transition-colors"
                            :aria-label="
                                showMobileMenu
                                    ? t('header.closeMenu')
                                    : t('header.openMenu')
                            "
                            @click="showMobileMenu = !showMobileMenu"
                        >
                            <Icon
                                :icon="showMobileMenu ? 'ion:close' : 'ion:menu'"
                                class="w-6 h-6"
                            />
                        </button>

                        <!-- Avatar with dropdown -->
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

                            <!-- Dropdown menu -->
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
                    </div>
                </div>
            </div>
        </header>

        <!-- Mobile navigation menu -->
        <nav
            v-if="showMobileMenu"
            class="lg:hidden bg-white border-b border-gray-200"
        >
            <div class="container mx-auto px-4 py-2 flex flex-col space-y-1">
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    @click="handleMobileTabClick(tab)"
                    :class="[
                        'text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        activeTab === tab.id
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                    ]"
                >
                    {{ tab.label }}
                </button>
            </div>
        </nav>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { signOutUser, auth } from "@/lib/firebase";
import { onAuthStateChanged, type Unsubscribe, type User } from "firebase/auth";
import { useCurrentUserRole } from "@/composables/useCurrentUserRole";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { hasPrivilegedRole } = useCurrentUserRole();

const tabs = computed(() => {
    const baseTabs = [
        { id: "richpods", label: t("header.myRichPods"), path: "/richpods" },
        { id: "create", label: t("header.createRichPod"), path: "/new-episode" },
    ];

    if (hasPrivilegedRole()) {
        baseTabs.push({
            id: "hosted",
            label: t("header.hostedRichPods"),
            path: "/hosted",
        });
    }

    baseTabs.push(
        { id: "verification", label: t("header.verification"), path: "/verification" },
        { id: "profile", label: t("header.profile"), path: "/profile" },
    );

    return baseTabs;
});

const activeTab = computed(() => {
    const currentPath = route.path;
    const tab = tabs.value.find(t => currentPath.startsWith(t.path));
    return tab?.id || "richpods";
});

const showDropdown = ref(false);
const user = ref<User | null>(null);

let unsubscribe: Unsubscribe | null = null;

// Get user initial or use profile picture
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

const showMobileMenu = ref(false);

const handleTabClick = (tab: { id: string; path: string }) => {
    router.push(tab.path);
};

const handleMobileTabClick = (tab: { id: string; path: string }) => {
    showMobileMenu.value = false;
    router.push(tab.path);
};

watch(
    () => route.path,
    () => {
        showMobileMenu.value = false;
    },
);

// Listen to auth state changes
onMounted(() => {
    unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser;
    });
});

// Close dropdown when clicking outside
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
