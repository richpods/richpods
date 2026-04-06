<script setup lang="ts">
type Props = {
    /** Diameter in pixels */
    size?: number;
    /** Border thickness in pixels. Defaults to 4 when size > 24, else 2 */
    borderWidth?: number;
    /** Spinner accent color */
    color?: string;
    /** Background ring color */
    trackColor?: string;
    /** Accessible label for screen readers (visually hidden) */
    label?: string;
};

const props = withDefaults(defineProps<Props>(), {
    size: 48,
    color: "currentColor",
    trackColor: "rgba(0, 0, 0, 0.1)",
    label: "Loading",
});
</script>

<template>
    <div
        class="ripo-spinner"
        role="status"
        :style="{
            width: `${props.size}px`,
            height: `${props.size}px`,
            borderWidth: `${props.borderWidth ?? (props.size > 24 ? 4 : 2)}px`,
            borderColor: props.trackColor,
            borderTopColor: props.color,
        }"
    >
        <span class="ripo-spinner__label">{{ props.label }}</span>
    </div>
</template>

<style lang="scss" scoped>
.ripo-spinner {
    border-style: solid;
    border-radius: 50%;
    animation: ripo-spin 0.8s linear infinite;
    flex-shrink: 0;
}

.ripo-spinner__label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

@keyframes ripo-spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
