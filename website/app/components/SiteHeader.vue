<template>
    <RipoSiteHeader
        :route-key="route.fullPath"
        :open-menu-label="$t('nav.openMenu')"
        :close-menu-label="$t('nav.closeMenu')"
    >
        <template #nav>
            <RipoButton as="nuxt-link" :to="localePath('listen')">
                <template #icon-left><NavIcon name="play" /></template>
                {{ $t("nav.listen") }}
            </RipoButton>
            <RipoButton as="link" :href="editorUrl">
                <template #icon-left><NavIcon name="create" /></template>
                {{ $t("nav.editor") }}
            </RipoButton>
            <RipoButton as="nuxt-link" :to="localePath('team')">
                <template #icon-left><NavIcon name="team" /></template>
                {{ $t("nav.team") }}
            </RipoButton>
            <RipoButton as="nuxt-link" :to="localePath('kontakt')">
                <template #icon-left><NavIcon name="mail" /></template>
                {{ $t("nav.contact") }}
            </RipoButton>
        </template>

        <template #mobile-nav="{ close }">
            <RipoButton as="nuxt-link" :to="localePath('listen')" size="large" block @click="close">
                <template #icon-left><NavIcon name="play" /></template>
                {{ $t("nav.listen") }}
            </RipoButton>
            <RipoButton as="link" :href="editorUrl" size="large" block @click="close">
                <template #icon-left><NavIcon name="create" /></template>
                {{ $t("nav.editor") }}
            </RipoButton>
            <RipoButton as="nuxt-link" :to="localePath('team')" size="large" block @click="close">
                <template #icon-left><NavIcon name="team" /></template>
                {{ $t("nav.team") }}
            </RipoButton>
            <RipoButton as="nuxt-link" :to="localePath('kontakt')" size="large" block @click="close">
                <template #icon-left><NavIcon name="mail" /></template>
                {{ $t("nav.contact") }}
            </RipoButton>
        </template>

        <template #logo>
            <NuxtLink class="logo-link" :to="localePath('index')">
                <img
                    class="logo"
                    src="@richpods/shared/assets/images/logo-full.svg"
                    alt="RichPods"
                />
            </NuxtLink>
        </template>
    </RipoSiteHeader>
</template>
<script setup lang="ts">
import RipoSiteHeader from "@richpods/shared/components/RipoSiteHeader.vue";
import RipoButton from "@richpods/shared/components/RipoButton.vue";
import NavIcon from "@richpods/shared/components/NavIcon.vue";

const localePath = useLocalePath();
const editorUrl = useRuntimeConfig().public.editorUrl;
const route = useRoute();
</script>
<style scoped lang="scss">
.logo-link {
    display: flex;
    align-items: center;
    height: 100%;
}

.logo {
    max-width: 210px;
    max-height: calc(var(--ripo-header-height, 100px) - 32px);
    width: auto;
    height: auto;
    object-fit: contain;
}
</style>
