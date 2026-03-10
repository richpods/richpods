<template>
<header class="header">
    <div class="header-content">
        <nav class="linear-navigation">
            <RipoButton as="nuxt-link" :to="localePath('listen')">{{ $t("nav.listen") }}</RipoButton>
            <RipoButton as="nuxt-link" :to="localePath('team')">{{ $t("nav.team") }}</RipoButton>
            <RipoButton as="nuxt-link" :to="localePath('kontakt')">{{ $t("nav.contact") }}</RipoButton>
        </nav>
        <NuxtLink class="logo-wrapper" :to="localePath('index')"><img class="logo" src="@richpods/shared/assets/images/logo-full.svg" alt="RichPods"></NuxtLink>
    </div>
</header>
</template>
<script setup lang="ts">
import RipoButton from "~/components/RipoButton.vue";

const localePath = useLocalePath();
</script>
<style scoped lang="scss">
.header {
    --header-height: 100px;

    background-color: var(--header-background-color);
    display: flex;
    justify-content: center;
    align-content: center;

    height: var(--header-height);

    @include mq($from: md) {
        --header-height: 190px;
    }
}

.header-content {
    display: grid;
    grid-template-columns: [navigation] 1fr [logo] auto;
    align-items: center;
    width: var(--content-max-width);
}

.logo-wrapper {
    grid-area: logo;
    height: var(--header-height);
    display: flex;
    justify-items: end;

    @include mq($until: md) {
        padding: var(--space-xs) 0;
    }
}

.logo {
    max-width: 210px;
    height: 100%;
    object-fit: contain;
}

.linear-navigation {
    grid-area: navigation;
    position: relative;
    top: -20px;
    display: flex;
    gap: var(--space-s);

    @include mq($until: md) {
        display: none;
    }
}
</style>
