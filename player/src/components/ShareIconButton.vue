<template>
    <button
        type="button"
        class="share-icon-button"
        :class="`variant-${variant}`"
        :title="label"
        :aria-label="variant === 'compact' ? label : undefined"
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
                d="M336 192h40a40 40 0 0 1 40 40v192a40 40 0 0 1-40 40H136a40 40 0 0 1-40-40V232a40 40 0 0 1 40-40h40"
            />
            <polyline
                points="336 128 256 48 176 128"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
            />
            <line
                x1="256"
                y1="48"
                x2="256"
                y2="336"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
            />
        </svg>
        <span v-if="variant === 'labeled'">{{ label }}</span>
    </button>
</template>

<script setup lang="ts">
type Props = {
    label: string;
    variant?: "compact" | "labeled";
};

withDefaults(defineProps<Props>(), {
    variant: "compact",
});
</script>

<style scoped lang="scss">
.share-icon-button {
    appearance: none;
    height: 26px;
    box-shadow: 0 3px 6px #00000029;
    background-color: var(--richpod-button-background);
    color: var(--richpod-button-text);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 14px;
        height: 14px;
        display: block;
    }

    &:hover {
        opacity: 0.9;
    }

    &:focus-visible {
        outline: 2px solid var(--richpod-header-background-color);
        outline-offset: 2px;
    }
}

.variant-compact {
    width: 26px;
    padding: 0;
    border: 1px solid #ffffff;
    border-radius: 50%;

    @media (max-width: 23.75em) {
        display: none;
    }
}

.variant-labeled {
    gap: 6px;
    padding: 2px 10px;
    border: 1px solid var(--richpod-control-button-border);
    border-radius: 13px;
    font-family: "venice-blvd", sans-serif;
    font-size: 12px;
    letter-spacing: -0.24px;
}
</style>
