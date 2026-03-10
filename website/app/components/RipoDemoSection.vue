<template>
    <div class="sub-hero">
        <div class="sub-hero-content">
            <slot />
        </div>
    </div>
</template>
<script setup lang="ts">

</script>
<style scoped lang="scss">
.sub-hero {
    background: #2E2C35;
    padding: var(--space-s) 0 var(--space-m);
    display: flex;
    justify-content: center;

    @include mq($from: xl) {
        min-height: 400px;
        border-bottom-left-radius: calc(2 * var(--space-2xl));
    }
}

.sub-hero-content {
    width: 100%;
    max-width: var(--content-max-width);
    color: #FFFAF6;
    font-family: var(--heading-font-family), serif;
}

:deep(h1),
:deep(h2) {
    color: var(--hero-highlight-color);
    font-size: var(--step-4);
}

:deep(p) {
    padding: var(--space-3xs) 0;
    font-size: var(--step-1);
    line-height: 1.3;

    @include mq($until: md) {
        line-height: 1.4;
    }
}
</style>