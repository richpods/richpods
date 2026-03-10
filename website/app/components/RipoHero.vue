<template>
    <div class="hero">
        <div class="hero-content">
            <slot />
        </div>
    </div>
</template>
<script setup lang="ts">

</script>
<style scoped lang="scss">
.hero {
    background: linear-gradient(174deg, #9e744a 0%, #B2BC57 100%) 0 0;
    display: flex;
    justify-content: center;
    padding: var(--space-s) 0;
}

.hero-content {
    width: 100%;
    max-width: var(--content-max-width);
    color: var(--hero-color);
    font-family: var(--heading-font-family), serif;
}

// h1 and h2 are treated the same, since there should be only one h1 per page and there could be multiple heroes.
:deep(h1),
:deep(h2) {
    color: var(--hero-highlight-color);
    font-size: var(--step-5);
}

:deep(p) {
    font-size: var(--step-1);
    line-height: 1.3;

    @include mq($until: md) {
        line-height: 1.4;
    }
}
</style>