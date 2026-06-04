<template>
    <RipoSiteHeader
        fixed
        burger-only
        :open-menu-label="t('header.menu')"
        :close-menu-label="t('header.menu')"
    >
        <template #mobile-nav="{ close }">
            <RipoButton
                as="link"
                size="large"
                block
                :href="websiteUrl('header.homePath')"
                @click="close"
            >
                <template #icon-left><NavIcon name="home" /></template>
                {{ t("header.home") }}
            </RipoButton>
            <RipoButton
                as="link"
                size="large"
                block
                :href="websiteUrl('header.listenPath')"
                @click="close"
            >
                <template #icon-left><NavIcon name="play" /></template>
                {{ t("header.listen") }}
            </RipoButton>
            <RipoButton
                as="link"
                size="large"
                block
                :href="websiteUrl('header.teamPath')"
                @click="close"
            >
                <template #icon-left><NavIcon name="team" /></template>
                {{ t("header.team") }}
            </RipoButton>
            <RipoButton
                as="link"
                size="large"
                block
                :href="websiteUrl('header.contactPath')"
                @click="close"
            >
                <template #icon-left><NavIcon name="mail" /></template>
                {{ t("header.contact") }}
            </RipoButton>
        </template>

        <template #logo>
            <a class="logo-link" :href="websiteUrl('header.homePath')">
                <img
                    class="logo"
                    src="@richpods/shared/assets/images/logo-full.svg"
                    alt="RichPods"
                />
            </a>
        </template>
    </RipoSiteHeader>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import RipoSiteHeader from "@richpods/shared/components/RipoSiteHeader.vue";
import RipoButton from "@richpods/shared/components/RipoButton.vue";
import NavIcon from "@richpods/shared/components/NavIcon.vue";

const { t } = useI18n();
const baseWebsiteUrl = (import.meta.env.VITE_WEBSITE_URL || "").replace(/\/+$/, "");

function websiteUrl(pathKey: string) {
    return `${baseWebsiteUrl}${t(pathKey)}`;
}
</script>
<style scoped lang="scss">
.logo-link {
    display: flex;
    align-items: center;
    height: 100%;
}

.logo {
    max-width: 160px;
    max-height: 40px;
    width: auto;
    height: auto;
    object-fit: contain;
}
</style>
