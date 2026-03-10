<template>
<div>
    <h1 class="visually-hidden">RichPods.org</h1>
    <RipoHero>
        <h2>{{ $t("home.heroTitle") }}</h2>
        <p>
            <i18n-t keypath="home.heroIntro" tag="span" scope="global">
                <template #interactiveElements><em>{{ $t("home.interactiveElements") }}</em></template>
                <template #inDevelopment><em>{{ $t("home.inDevelopment") }}</em></template>
            </i18n-t>
        </p>
        <p>
            <RipoButton as="link" href="https://www.netidee.at/richpodsorg" size="large" variant="secondary" target="_blank">{{ $t("home.devBlog") }}</RipoButton>
        </p>
    </RipoHero>
    <RipoDemoSection>
        <h2>{{ $t("home.demoTitle") }}</h2>
        <p>
            <i18n-t keypath="home.demoText" tag="span" scope="global">
                <template #transformPodcast><em>{{ $t("home.transformPodcast") }}</em></template>
            </i18n-t>
        </p>
    </RipoDemoSection>
    <div class="call-to-action">
        <h2>{{ $t("home.ctaTitle") }}</h2>
        <div class="action">
            <client-only>
                <RipoButton as="link" size="large" href="mailto:contact@richpods.org">{{ $t("home.ctaEmail") }}</RipoButton>
            </client-only>
        </div>
    </div>
</div>
</template>
<script setup lang="ts">
import RipoHero from "~/components/RipoHero.vue";
import RipoDemoSection from "~/components/RipoDemoSection.vue";
import RipoButton from "~/components/RipoButton.vue";

definePageMeta({
    i18n: {
        paths: {
            de: "/",
            en: "/",
        },
    },
});

const { t } = useI18n();

useHead({
    titleTemplate: t("meta.siteTitle"),
});
</script>
<style scoped lang="scss">
.hero em {
    background-color: var(--hero-highlight-color);
    font-style: normal;
    padding: 0 4px;
}

.sub-hero em {
    background-color: #F89623;
    color: var(--hero-color);
    font-style: normal;
    padding: 0 4px;
}

.call-to-action {
    color: var(--hero-color);
    max-width: var(--content-max-width);
    margin: 0 auto;
    padding: var(--space-xl) 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    h2 {
        max-width: 90%;
        text-align: center;
        font-family: var(--heading-font-family), serif;
        font-weight: normal;
        font-size: var(--step-4);
        line-height: 1.2;
        margin: 0;
        padding: var(--space-s) 0 var(--space-xs);
    }

    .action {
        padding: var(--space-m) 0 var(--space-xl);
    }
}
</style>
