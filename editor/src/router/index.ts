import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { user, isAuthReady } from "@/composables/useAuthState";
import i18n from "@/i18n";

// Import components
import MyRichPods from "@/components/MyRichPods.vue";
import RichPodEditor from "@/components/RichPodEditor.vue";
import ProfileView from "@/components/ProfileView.vue";
import VerificationView from "@/views/VerificationView.vue";
import SignInView from "@/views/SignInView.vue";

const routes: RouteRecordRaw[] = [
    {
        path: "/",
        redirect: () => {
            return user.value ? "/richpods" : "/signin";
        },
    },
    {
        path: "/signin",
        name: "signin",
        component: SignInView,
        meta: { titleKey: "routes.signIn", requiresAuth: false },
    },
    {
        path: "/richpods",
        name: "richpods",
        component: MyRichPods,
        meta: { titleKey: "routes.myRichPods" },
    },
    {
        path: "/profile",
        name: "profile",
        component: ProfileView,
        meta: { titleKey: "routes.profile" },
    },
    {
        path: "/verification",
        name: "verification",
        component: VerificationView,
        meta: { titleKey: "routes.verification" },
    },
    {
        path: "/edit/:id?",
        name: "editor",
        component: RichPodEditor,
        meta: { titleKey: "routes.editor" },
    },
    {
        path: "/new-episode",
        name: "new-episode",
        component: () => import("@/components/EpisodeSearchForm.vue"),
        meta: { titleKey: "routes.addNewEpisode" },
    },
    {
        path: "/hosted",
        name: "hosted",
        component: () => import("@/views/HostedRichPodsView.vue"),
        meta: { titleKey: "routes.hostedRichPods" },
    },
    {
        path: "/hosted/create",
        name: "hosted-create",
        component: () => import("@/components/hosted/HostedPodcastForm.vue"),
        meta: { titleKey: "routes.createHostedPodcast" },
    },
    {
        path: "/hosted/:id/edit",
        name: "hosted-edit",
        component: () => import("@/components/hosted/HostedPodcastForm.vue"),
        meta: { titleKey: "routes.editHostedPodcast" },
    },
    {
        path: "/hosted/:id/add-episode",
        name: "hosted-add-episode",
        component: () => import("@/views/AddHostedEpisodeView.vue"),
        meta: { titleKey: "routes.addHostedEpisode" },
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
    // Wait for auth to be ready
    if (!isAuthReady.value) {
        await new Promise<void>((resolve) => {
            const unwatch = () => {
                if (isAuthReady.value) {
                    resolve();
                } else {
                    setTimeout(unwatch, 50);
                }
            };
            unwatch();
        });
    }

    const requiresAuth = to.meta.requiresAuth !== false;
    const isAuthenticated = !!user.value;

    // Update document title
    const titleKey = to.meta.titleKey as string | undefined;
    if (titleKey) {
        const appTitle = i18n.global.t("common.richPods");
        const pageTitle = i18n.global.t(titleKey);
        document.title = `${pageTitle} - ${appTitle}`;
    }

    // Handle authentication logic
    if (requiresAuth && !isAuthenticated) {
        // Redirect to sign in if not authenticated
        next({ name: "signin", replace: true });
    } else if (to.name === "signin" && isAuthenticated) {
        // Redirect to richpods if already authenticated
        next({ name: "richpods", replace: true });
    } else {
        // Allow navigation
        next();
    }
});

export default router;
