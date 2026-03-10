<template>
    <div class="auth-form">
        <div class="logo-container">
            <img src="@richpods/shared/assets/images/logo-full.svg" :alt="t('common.richPods')" class="logo" />
        </div>

        <div class="tabs">
            <button @click="mode = 'signin'" :class="{ active: mode === 'signin' }">{{ t("auth.signIn") }}</button>
            <button @click="mode = 'signup'" :class="{ active: mode === 'signup' }">{{ t("auth.signUp") }}</button>
        </div>

        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <label for="email">{{ t("auth.email") }}</label>
                <input
                    id="email"
                    v-model="email"
                    type="email"
                    required
                    class="text-base"
                    :placeholder="t('auth.emailPlaceholder')"
                />
            </div>

            <div class="form-group">
                <label for="password">{{ t("auth.password") }}</label>
                <input
                    id="password"
                    v-model="password"
                    type="password"
                    required
                    class="text-base"
                    :placeholder="mode === 'signup' ? t('auth.passwordMinLength') : t('auth.passwordPlaceholder')"
                    :minlength="mode === 'signup' ? 8 : undefined"
                />
            </div>

            <button type="submit" :disabled="loading" class="primary">
                <Icon
                    v-if="!loading"
                    :icon="mode === 'signin' ? 'ion:log-in-outline' : 'ion:person-add-outline'"
                    class="icon"
                />
                {{ loading ? t("common.loading") : mode === "signin" ? t("auth.signIn") : t("auth.signUp") }}
            </button>
        </form>

        <div class="divider">{{ t("common.or") }}</div>

        <button @click="handleGoogleSignIn" :disabled="loading" class="google">
            <Icon icon="ion:logo-google" class="icon" />
            {{ t("auth.signInWithGoogle") }}
        </button>

        <div v-if="error" class="error">
            {{ error }}
        </div>

        <footer class="footer">
            <a href="https://richpods.com" target="_blank" rel="noopener noreferrer">{{ t("auth.mainWebsite") }}</a>
            <span class="separator">•</span>
            <a href="https://richpods.com/contact" target="_blank" rel="noopener noreferrer">{{ t("auth.contact") }}</a>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { GoogleAuthProvider } from "firebase/auth";
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from "@/lib/firebase";
import { graphqlSdk } from "@/lib/graphql";
import { user } from "@/composables/useAuthState";

const { t } = useI18n();
const router = useRouter();

const mode = ref<"signin" | "signup">("signin");
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const signingIn = ref(false);

watch(user, (currentUser) => {
    if (currentUser && !signingIn.value) {
        router.replace({ name: "richpods" });
    }
});

const handleSubmit = async () => {
    loading.value = true;
    error.value = "";
    signingIn.value = true;

    try {
        if (mode.value === "signup") {
            // Firebase sign up
            await signUpWithEmail(email.value, password.value);

            // GraphQL sign up
            await graphqlSdk.SignUp({
                input: {
                    email: email.value,
                    password: password.value,
                },
            });
        } else {
            // Firebase sign in
            await signInWithEmail(email.value, password.value);

            // GraphQL sign in
            await graphqlSdk.SignIn({
                input: {
                    email: email.value,
                    password: password.value,
                },
            });
        }

        router.replace({ name: "richpods" });
    } catch (err: any) {
        console.error("Authentication error:", err);
        error.value = err.message || t("auth.authFailed");
    } finally {
        signingIn.value = false;
        loading.value = false;
    }
};

const handleGoogleSignIn = async () => {
    loading.value = true;
    error.value = "";
    signingIn.value = true;

    try {
        const result = await signInWithGoogle();
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential?.idToken) {
            throw new Error(t("auth.googleSignInFailed"));
        }

        // GraphQL Google sign in with the Google OAuth ID token
        await graphqlSdk.SignInWithGoogle({
            idToken: credential.idToken,
        });

        router.replace({ name: "richpods" });
    } catch (err: any) {
        console.error("Google sign-in error:", err);
        error.value = err.message || t("auth.googleSignInFailed");
    } finally {
        signingIn.value = false;
        loading.value = false;
    }
};
</script>

<style scoped>
.auth-form {
    max-width: 500px;
    width: 100%;
    margin: 0 auto;
    padding: 3rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
}

@media (max-width: 640px) {
    .auth-form {
        max-width: 100%;
        padding: 2rem;
    }
}

.logo-container {
    text-align: center;
    margin-bottom: 2rem;
}

.logo {
    max-width: 200px;
    height: auto;
}

.tabs {
    display: flex;
    margin-bottom: 2rem;
    border-bottom: 1px solid #e0e0e0;
}

.tabs button {
    flex: 1;
    padding: 1rem;
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 2px solid transparent;
}

.tabs button.active {
    border-bottom-color: #646cff;
    color: #646cff;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
}

.form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.form-group input:focus {
    outline: none;
    border-color: #646cff;
}

button.primary {
    width: 100%;
    padding: 0.75rem;
    background: #646cff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

button.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

button.google {
    width: 100%;
    padding: 0.75rem;
    background: #db4437;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.icon {
    width: 1.25rem;
    height: 1.25rem;
}

button.google:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.divider {
    text-align: center;
    margin: 1rem 0;
    color: #666;
}

.error {
    color: #f56565;
    margin-top: 1rem;
    padding: 0.75rem;
    background: #fed7d7;
    border-radius: 4px;
}

.footer {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e0e0e0;
    text-align: center;
    font-size: 0.875rem;
    color: #666;
}

.footer a {
    color: #646cff;
    text-decoration: none;
}

.footer a:hover {
    text-decoration: underline;
}

.footer .separator {
    margin: 0 0.5rem;
    color: #ccc;
}
</style>
