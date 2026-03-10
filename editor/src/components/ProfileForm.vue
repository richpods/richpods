<template>
    <div>
        <form v-if="profileLoaded" @submit.prevent="handleSubmit">
            <div class="mb-5">
                <label for="publicName" class="block mb-1.5 font-medium text-sm text-gray-700">{{
                    t("profileForm.publicName")
                }}</label>
                <input
                    id="publicName"
                    v-model="form.publicName"
                    type="text"
                    :placeholder="t('profileForm.publicNamePlaceholder')"
                    maxlength="50"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#646cff] focus:outline-none focus:ring-1 focus:ring-[#646cff]"
                />
            </div>

            <div class="mb-5">
                <label for="biography" class="block mb-1.5 font-medium text-sm text-gray-700">{{
                    t("profileForm.biography")
                }}</label>
                <textarea
                    id="biography"
                    v-model="form.biography"
                    :placeholder="t('profileForm.biographyPlaceholder')"
                    maxlength="500"
                    rows="4"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#646cff] focus:outline-none focus:ring-1 focus:ring-[#646cff]"
                ></textarea>
                <p class="mt-1 text-xs text-gray-500">{{ form.biography?.length || 0 }}/500</p>
            </div>

            <div class="mb-5">
                <label for="website" class="block mb-1.5 font-medium text-sm text-gray-700">{{
                    t("profileForm.website")
                }}</label>
                <input
                    id="website"
                    v-model="form.website"
                    type="url"
                    :placeholder="t('profileForm.websitePlaceholder')"
                    class="w-full lg:max-w-md rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#646cff] focus:outline-none focus:ring-1 focus:ring-[#646cff]"
                />
            </div>

            <div class="mb-5">
                <label for="publicEmail" class="block mb-1.5 font-medium text-sm text-gray-700">{{
                    t("profileForm.publicEmail")
                }}</label>
                <input
                    id="publicEmail"
                    v-model="form.publicEmail"
                    type="email"
                    :placeholder="t('profileForm.publicEmailPlaceholder')"
                    class="w-full lg:max-w-md rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#646cff] focus:outline-none focus:ring-1 focus:ring-[#646cff]"
                />
                <p class="mt-1 text-xs text-gray-500">{{ t("profileForm.publicEmailHint") }}</p>
            </div>

            <div class="mb-5">
                <label
                    for="editorLanguage"
                    class="block mb-1.5 font-medium text-sm text-gray-700"
                    >{{ t("profileForm.editorLanguage") }}</label
                >
                <select
                    id="editorLanguage"
                    v-model="form.editorLanguage"
                    class="w-full lg:max-w-md rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#646cff] focus:outline-none focus:ring-1 focus:ring-[#646cff]"
                >
                    <option value="en">{{ t("profileForm.languageEnglish") }}</option>
                    <option value="de">{{ t("profileForm.languageGerman") }}</option>
                </select>
                <p class="mt-1 text-xs text-gray-500">
                    {{ t("profileForm.editorLanguageHint") }}
                </p>
            </div>

            <div class="mb-5">
                <label class="block mb-1.5 font-medium text-sm text-gray-700">{{
                    t("profileForm.socialAccounts")
                }}</label>
                <div class="mt-1 space-y-2 lg:max-w-md">
                    <div
                        v-for="(_account, index) in form.socialAccounts"
                        :key="index"
                        class="flex items-center gap-2"
                    >
                        <input
                            v-model="form.socialAccounts[index]"
                            type="url"
                            :placeholder="
                                t('profileForm.socialAccountPlaceholder', { n: index + 1 })
                            "
                            class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-base focus:border-[#646cff] focus:outline-none focus:ring-1 focus:ring-[#646cff]"
                        />
                        <button
                            type="button"
                            @click="removeSocialAccount(index)"
                            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                        >
                            ✕
                        </button>
                    </div>

                    <button
                        type="button"
                        @click="addSocialAccount"
                        :disabled="form.socialAccounts.length >= 10"
                        class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {{ t("profileForm.addSocialAccount") }}
                    </button>
                </div>
                <p class="mt-1 text-xs text-gray-500">
                    {{ t("profileForm.maxSocialAccounts") }}
                </p>
            </div>

            <div class="mt-8">
                <button
                    type="submit"
                    :disabled="loading || !hasChanges"
                    class="rounded-md bg-[#646cff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5558dd] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {{ loading ? t("profileForm.saving") : t("profileForm.saveProfile") }}
                </button>
            </div>
        </form>

        <div
            v-if="message"
            class="mt-4 rounded-md border px-4 py-3 text-sm"
            :class="
                messageType === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
            "
        >
            {{ message }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { graphqlSdk, type UpdateProfileInput } from "@/lib/graphql";
import { resolveEditorLanguage, type EditorLanguage } from "@/i18n/language";

const { t, locale } = useI18n();

type ProfileData = {
    publicName?: string;
    biography?: string;
    website?: string;
    publicEmail?: string;
    socialAccounts: string[];
    editorLanguage: EditorLanguage;
};

const form = ref<ProfileData>({
    publicName: "",
    biography: "",
    website: "",
    publicEmail: "",
    socialAccounts: [],
    editorLanguage: resolveEditorLanguage(),
});

const originalForm = ref<ProfileData>({
    publicName: "",
    biography: "",
    website: "",
    publicEmail: "",
    socialAccounts: [],
    editorLanguage: resolveEditorLanguage(),
});

const loading = ref(false);
const profileLoaded = ref(false);
const message = ref("");
const messageType = ref<"success" | "error">("success");

const hasChanges = computed(() => {
    return JSON.stringify(form.value) !== JSON.stringify(originalForm.value);
});

const loadProfile = async () => {
    loading.value = true;
    try {
        const response = await graphqlSdk.GetCurrentUser();
        const profile = response.currentUser;

        const resolvedLanguage = resolveEditorLanguage(profile?.editorLanguage ?? null);

        form.value = {
            publicName: profile?.publicName || "",
            biography: profile?.biography || "",
            website: profile?.website || "",
            publicEmail: profile?.publicEmail || "",
            socialAccounts: [...(profile?.socialAccounts || [])],
            editorLanguage: resolvedLanguage,
        };

        originalForm.value = {
            ...form.value,
            socialAccounts: [...form.value.socialAccounts],
        };

        console.log("Profile loaded, socialAccounts:", form.value.socialAccounts);
    } catch (error) {
        console.error("Error loading profile:", error);
        showMessage(t("profileForm.profileLoadFailed"), "error");
    } finally {
        loading.value = false;
        profileLoaded.value = true;
    }
};

const handleSubmit = async () => {
    loading.value = true;
    try {
        const updateData: UpdateProfileInput = {};

        // Only send fields that have changed or have values
        if (form.value.publicName !== originalForm.value.publicName) {
            updateData.publicName = form.value.publicName || null;
        }
        if (form.value.biography !== originalForm.value.biography) {
            updateData.biography = form.value.biography || null;
        }
        if (form.value.website !== originalForm.value.website) {
            updateData.website = form.value.website || null;
        }
        if (form.value.publicEmail !== originalForm.value.publicEmail) {
            updateData.publicEmail = form.value.publicEmail || null;
        }
        if (
            JSON.stringify(form.value.socialAccounts) !==
            JSON.stringify(originalForm.value.socialAccounts)
        ) {
            // Always include socialAccounts when changed, even if empty array
            const filteredAccounts = form.value.socialAccounts.filter((url) => url.trim());
            updateData.socialAccounts = filteredAccounts;
        }
        if (form.value.editorLanguage !== originalForm.value.editorLanguage) {
            updateData.editorLanguage = form.value.editorLanguage;
        }

        await graphqlSdk.UpdateProfile({
            input: updateData,
        });

        originalForm.value = { ...form.value };
        locale.value = form.value.editorLanguage;
        showMessage(t("profileForm.profileUpdated"), "success");
    } catch (error: unknown) {
        console.error("Error updating profile:", error);
        showMessage(
            error instanceof Error ? error.message : t("profileForm.profileUpdateFailed"),
            "error",
        );
    } finally {
        loading.value = false;
    }
};

const addSocialAccount = () => {
    console.log("Adding social account, current length:", form.value.socialAccounts.length);
    if (form.value.socialAccounts.length < 10) {
        form.value.socialAccounts.push("");
        console.log("Added social account, new length:", form.value.socialAccounts.length);
    }
};

const removeSocialAccount = (index: number) => {
    console.log("Removing social account at index:", index);
    form.value.socialAccounts.splice(index, 1);
    console.log("Removed social account, new length:", form.value.socialAccounts.length);
};

const showMessage = (text: string, type: "success" | "error") => {
    message.value = text;
    messageType.value = type;
    setTimeout(() => {
        message.value = "";
    }, 5000);
};

onMounted(() => {
    loadProfile();
});
</script>

<style lang="scss" scoped></style>
