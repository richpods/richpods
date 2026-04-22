<template>
    <SiteHeader v-if="!isEmbedded" />
    <main class="app-wrapper" :class="{ embedded: isEmbedded }">
        <RouterView />
    </main>
</template>
<script setup lang="ts">
import SiteHeader from "@/components/SiteHeader.vue";
import { useEmbedMode } from "@/composables/useEmbedMode.ts";

const { isEmbedded } = useEmbedMode();
</script>
<style scoped lang="scss">
@use "@/assets/theme" as theme;

.app-wrapper {
    padding-top: var(--richpod-header-height);
    height: 100dvh;
    @media (min-width: #{theme.$richpod-desktop-breakpoint}) {
        max-width: var(--richpod-desktop-max-width);
        margin-left: auto;
        margin-right: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.47);
    }

    @media (min-width: #{theme.$richpod-desktop-wide-breakpoint}) {
        max-width: var(--richpod-desktop-wide-max-width);
    }

    &.embedded {
        padding-top: 0;

        @media (min-width: #{theme.$richpod-desktop-breakpoint}) {
            max-width: none;
            box-shadow: none;
        }
    }
}
</style>
