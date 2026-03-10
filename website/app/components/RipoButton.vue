<template>
    <component
        :is="componentType"
        v-bind="linkProps"
        :type="isButton ? type : undefined"
        :disabled="isButton && disabled"
        :class="buttonClasses"
        :aria-disabled="!isButton && disabled ? 'true' : undefined"
        @click="handleClick"
    >
        <slot name="icon-left"></slot>
        <slot></slot>
        <slot name="icon-right"></slot>
    </component>
</template>

<script setup lang="ts">
import { NuxtLink } from "#components";
import { computed, useAttrs } from "vue";

interface Props {
    as?: "button" | "link" | "nuxt-link";
    to?: string | Record<string, any>;
    href?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    target?: "_self" | "_blank" | "_parent" | "_top";
    variant?: "primary" | "secondary";
    size?: "small" | "medium" | "large" | undefined;
    pill?: boolean;
    block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    as: "button",
    type: "button",
    disabled: false,
    variant: "primary",
    size: "medium",
    pill: false,
    block: false,
});

const emit = defineEmits(["click"]);
const attrs = useAttrs();

const isNuxtLink = computed(() => props.as === "nuxt-link");
const isAnchor = computed(() => props.as === "link");
const isButton = computed(() => props.as === "button");

const componentType = computed(() => {
    if (isNuxtLink.value) {
        return NuxtLink;
    }
    if (isAnchor.value) {
        return "a";
    }
    return "button";
});

const linkProps = computed(() => {
    const result: Record<string, any> = { ...attrs };
    if (isNuxtLink.value && props.to && !props.disabled) {
        result.to = props.to;
    }
    if (isAnchor.value && props.href && !props.disabled) {
        result.href = props.href;
        if (props.target) {
            result.target = props.target;
        }
    }
    return result;
});

const buttonClasses = computed(() => [
    "styled-button",
    `styled-button--${props.variant}`,
    `styled-button--${props.size}`,
    {
        "styled-button--disabled": props.disabled,
        "styled-button--block": props.block,
    }
]);

const handleClick = (event: MouseEvent) => {
    if (props.disabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }
    emit("click", event);
};
</script>
<style scoped lang="scss">
.styled-button {
    appearance: none;
    margin: 0;
    font-weight: 500;
    text-align: center;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    user-select: none;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;

    background: #FFFFFF;
    border: 2px solid #2E2C35;
    border-radius: 122px;
    color: #2F2C35;
    padding: var(--space-2xs) var(--space-s);
    font-size: var(--step-0);
    font-family: var(--heading-font-family), serif; // Ensure --heading-font-family is defined globally
    line-height: 1.4; // Adjusted for better vertical alignment with this font-size and padding

    // Define hover, active, focus states for this specific variant
    &:hover:not(.styled-button--disabled):not(:disabled) {
        background-color: #f5f5f5; // Slightly off-white
        border-color: #201e24; // Slightly darker border
    }
    &:active:not(.styled-button--disabled):not(:disabled) {
        background-color: #ebebeb; // A bit more off-white
        border-color: #1a181f;
    }
    &:focus-visible:not(.styled-button--disabled):not(:disabled) {
        outline-color: #2E2C35;
        box-shadow: 0 0 0 0.2rem rgba(46, 44, 53, 0.4); // Adjusted alpha for visibility
    }

    &--block {
        display: flex;
        width: 100%;
    }

    // Sizes
    &--small {
        font-size: var(--step--1);
    }
    &--large {
        padding: var(--space-2xs) var(--space-m);
        font-size: var(--step-1);
    }

    // Variants
    &--secondary {
        color: var(--button-secondary-color);
    }
}
</style>