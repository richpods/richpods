<template>
    <div class="ripo-site">
        <SiteHeader/>
        <main>
            <NuxtPage />
        </main>
        <SiteFooter />
    </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import SiteHeader from "~/components/SiteHeader.vue";
import SiteFooter from "~/components/SiteFooter.vue";
import ogImageDefault from "@richpods/shared/assets/images/og-image-default.png";

const { t, locale } = useI18n();
const config = useRuntimeConfig();
const route = useRoute();

const siteOrigin = computed(() => (config.public.baseURL ?? "").replace(/\/+$/, ""));

const absoluteOgImage = computed(() => {
    const src = ogImageDefault as unknown as string;
    if (/^https?:\/\//i.test(src)) return src;
    const path = src.startsWith("/") ? src : `/${src}`;
    return `${siteOrigin.value}${path}`;
});

const canonicalUrl = computed(() => `${siteOrigin.value}${route.path}`);
const ogLocale = computed(() => (locale.value === "de" ? "de_AT" : "en_US"));

useSeoMeta({
    titleTemplate: (title) => (title ? `${title} | ${t("meta.siteTitle")}` : t("meta.siteTitle")),
    description: () => t("meta.siteDescription"),
    ogSiteName: () => t("meta.siteTitle"),
    ogTitle: () => t("meta.siteTitle"),
    ogDescription: () => t("meta.siteDescription"),
    ogType: "website",
    ogImage: () => absoluteOgImage.value,
    ogImageAlt: () => t("meta.ogImageAlt"),
    ogLocale: () => ogLocale.value,
    ogUrl: () => canonicalUrl.value,
    twitterCard: "summary_large_image",
    twitterTitle: () => t("meta.siteTitle"),
    twitterDescription: () => t("meta.siteDescription"),
    twitterImage: () => absoluteOgImage.value,
    twitterImageAlt: () => t("meta.ogImageAlt"),
});

useHead({
    htmlAttrs: { lang: () => locale.value },
    link: [{ rel: "canonical", href: () => canonicalUrl.value }],
});
</script>
<style lang="scss">
@use "assets/styles/base";
</style>
<style scoped lang="scss">
main {
    min-height: 65dvh;
    padding-bottom: var(--space-xl);
}

.ripo-site {
}
</style>