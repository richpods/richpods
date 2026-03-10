<template>
    <div class="flex bg-gray-50 flex-1">
        <div class="flex flex-col flex-1">
            <div class="flex-1 overflow-y-auto">
                <div class="max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
                    <h1 class="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">{{ t("profile.title") }}</h1>

                    <!-- RichPods Profile -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <ProfileForm @success="handleProfileUpdated" />
                        <div v-if="user" class="mt-6 border-t border-gray-100 pt-4">
                            <a
                                class="text-sm text-[#646cff] hover:underline cursor-pointer"
                                @click="openVerification"
                            >
                                {{ t("profile.manageVerifications") }}
                            </a>
                        </div>
                    </div>

                    <!-- Account Overview -->
                    <div v-if="user" class="mt-8">
                        <h2 class="text-sm font-medium text-gray-500 mb-3">
                            {{ t("profile.accountSection") }}
                        </h2>
                        <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div>
                                <span class="text-gray-400">{{ t("profile.accountType") }}</span>
                                <p class="text-gray-600">{{ accountType }}</p>
                            </div>

                            <div>
                                <span class="text-gray-400">{{ t("profile.email") }}</span>
                                <p class="text-gray-600">
                                    {{ user?.email || t("profile.noEmail") }}
                                </p>
                            </div>

                            <div v-if="user?.displayName">
                                <span class="text-gray-400">{{ t("profile.displayName") }}</span>
                                <p class="text-gray-600">{{ user.displayName }}</p>
                            </div>

                            <div>
                                <span class="text-gray-400">{{ t("profile.accountId") }}</span>
                                <p class="text-gray-600 font-mono text-xs break-all">
                                    {{ user?.uid || t("profile.notAvailable") }}
                                </p>
                            </div>

                            <div v-if="roleLabel">
                                <span class="text-gray-400">{{ t("profile.role") }}</span>
                                <p class="text-gray-600">{{ roleLabel }}</p>
                            </div>

                            <div v-if="user?.metadata?.creationTime">
                                <span class="text-gray-400">{{
                                    t("profile.accountCreated")
                                }}</span>
                                <p class="text-gray-600">
                                    {{ formatDate(user.metadata.creationTime) }}
                                </p>
                            </div>

                            <div v-if="user?.metadata?.lastSignInTime">
                                <span class="text-gray-400">{{ t("profile.lastSignIn") }}</span>
                                <p class="text-gray-600">
                                    {{ formatDate(user.metadata.lastSignInTime) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { onAuthStateChanged, type Unsubscribe, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useCurrentUserRole } from "@/composables/useCurrentUserRole";
import ProfileForm from "@/components/ProfileForm.vue";

const { t, locale } = useI18n();
const user = ref<User | null>(null);
let unsubscribe: Unsubscribe | null = null;
const router = useRouter();
const { currentUserRole } = useCurrentUserRole();

// Determine account type based on provider
const accountType = computed(() => {
    if (!user.value) return t("profile.unknownAccountType");

    // Check provider data
    const providers = user.value.providerData;
    if (providers && providers.length > 0) {
        const provider = providers[0];
        if (provider.providerId === "google.com") {
            return t("profile.googleAccount");
        } else if (provider.providerId === "password") {
            return t("profile.emailPassword");
        }
    }

    return t("profile.emailAccount");
});

const providerName = computed(() => {
    if (!user.value) return "";

    const providers = user.value.providerData;
    if (providers && providers.length > 0) {
        const provider = providers[0];
        if (provider.providerId === "google.com") {
            return t("profile.providedByGoogle");
        }
    }

    return t("profile.userUploaded");
});

const roleLabel = computed(() => {
    if (currentUserRole.value === "super_admin") {
        return t("profile.roleSuperAdmin");
    }
    if (currentUserRole.value === "editor") {
        return t("profile.roleEditor");
    }

    return null;
});

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale.value, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const handleProfileUpdated = () => {
    // Profile updated successfully, could show a toast or notification
    console.log("Profile updated successfully");
};

const openVerification = () => {
    router.push("/verification");
};

onMounted(() => {
    unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser;
    });
});

onUnmounted(() => {
    if (unsubscribe) {
        unsubscribe();
    }
});
</script>
