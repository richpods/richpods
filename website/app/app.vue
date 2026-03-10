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
import SiteHeader from "~/components/SiteHeader.vue";
import SiteFooter from "~/components/SiteFooter.vue";
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