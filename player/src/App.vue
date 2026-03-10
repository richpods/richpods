<template>
    <SiteHeader />
    <main class="app-wrapper">
        <RouterView />
    </main>
</template>
<script setup lang="ts">
import SiteHeader from "@/components/SiteHeader.vue";
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
}
</style>
