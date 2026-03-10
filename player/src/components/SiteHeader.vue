<template>
    <header class="header">
        <a :href="logoUrl" class="logo-link">
            <img class="logo" src="@richpods/shared/assets/images/logo-type.svg" alt="RichPods">
        </a>
        <div class="menu">
            <button aria-haspopup="true" :aria-expanded="!hideNavigation" aria-controls="header-navigation" @click="toggleNavigation">
                <img src="@/assets/images/icon_hamburger.svg" :alt="t('header.menu')" />
            </button>
            <nav id="header-navigation" class="header-navigation" :hidden="hideNavigation">
                <a :href="websiteUrl('header.homePath')">{{ t("header.home") }}</a>
                <a :href="websiteUrl('header.listenPath')">{{ t("header.listen") }}</a>
                <a :href="websiteUrl('header.teamPath')">{{ t("header.team") }}</a>
                <a :href="websiteUrl('header.contactPath')">{{ t("header.contact") }}</a>
            </nav>
        </div>
    </header>
</template>
<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const baseWebsiteUrl = (import.meta.env.VITE_WEBSITE_URL || "").replace(/\/+$/, "");

function websiteUrl(pathKey: string) {
    return `${baseWebsiteUrl}${t(pathKey)}`;
}

const logoUrl = computed(() => websiteUrl("header.listenPath"));
const hideNavigation = ref(true);
function toggleNavigation() {
    hideNavigation.value = !hideNavigation.value;
}
</script>
<style scoped lang="scss">
@use "@/assets/theme" as theme;

$border-radius: 25px;
.header {
    position: fixed;
    width: 100%;
    height: var(--richpod-header-height);
    padding-bottom: 12px;
    z-index: 100;

    display: grid;
    grid-template-columns: [left-padding] 12px [logo] 60px [spacer] 1fr [navigation] auto [right-padding] $border-radius;

    background: var(--richpod-header-background-color);
    border-bottom-right-radius: $border-radius;
    align-items: end;

    @media (min-width: #{theme.$richpod-desktop-breakpoint}) {
        max-width: var(--richpod-desktop-max-width);
        left: 50%;
        transform: translateX(-50%);
        border-bottom-right-radius: 0;
    }

    .logo-link {
        grid-column: logo;
        display: flex;
        align-items: center;
    }

    .logo {
        grid-column: logo;
        width: 100%;
        height: auto;
    }
}

.menu {
    position: relative;
    grid-column: navigation;
    align-self: center;

    > button {
        appearance: none;
        border: none;
        background: none;
        padding: 0;
        display: flex;
        align-items: center;
    }
}

.header-navigation {
    display: block;
    position: absolute;
    top: 30px;
    right: -15px;
    width: 50vw;
    background-color: var(--richpod-header-background-color);
    padding-bottom: 12px;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;

    &[hidden] {
        display: none;
    }

    a {
        display: block;
        width: 100%;
        text-align: right;
        padding: 5px 12px;
        color: var(--richpod-button-text);
        text-decoration: none;

        &:hover,
        &:focus {
            text-decoration: underline;
        }
    }
}
</style>
