<template>
    <div class="feature-card">
        <span class="feature-icon" aria-hidden="true">
            <slot name="icon" />
        </span>
        <h3 class="feature-title">{{ title }}</h3>
        <p class="feature-text">{{ description }}</p>
    </div>
</template>
<script setup lang="ts">
defineProps<{
    title: string;
    description: string;
}>();
</script>
<style scoped lang="scss">
.feature-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2xs);
}

.feature-icon {
    display: inline-flex;
    width: 48px;
    height: 48px;
    color: var(--feature-icon-color, currentColor);

    :deep(svg) {
        width: 100%;
        height: 100%;
    }
}

.feature-title {
    font-size: var(--step-2);
    margin: 0;
    padding: var(--space-3xs) 0 0;
}

.feature-text {
    font-size: var(--step-0);
    line-height: 1.4;
    margin: 0;
    padding: 0;
}
</style>
