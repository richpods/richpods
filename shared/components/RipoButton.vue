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
import { computed, resolveComponent, useAttrs, type Component } from "vue";

type Props = {
    as?: "button" | "link" | "nuxt-link" | "router-link";
    to?: string | Record<string, unknown>;
    href?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    target?: "_self" | "_blank" | "_parent" | "_top";
    variant?: "primary" | "secondary";
    size?: "small" | "medium" | "large" | undefined;
    pill?: boolean;
    block?: boolean;
    active?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
    as: "button",
    type: "button",
    disabled: false,
    variant: "primary",
    size: "medium",
    pill: false,
    block: false,
    active: false,
});

const emit = defineEmits(["click"]);
const attrs = useAttrs();

const isNuxtLink = computed(() => props.as === "nuxt-link");
const isRouterLink = computed(() => props.as === "router-link");
const isAnchor = computed(() => props.as === "link");
const isButton = computed(() => props.as === "button");

const componentType = computed<string | Component>(() => {
    if (isNuxtLink.value) {
        return resolveComponent("NuxtLink");
    }
    if (isRouterLink.value) {
        return resolveComponent("RouterLink");
    }
    if (isAnchor.value) {
        return "a";
    }
    return "button";
});

const linkProps = computed(() => {
    const result: Record<string, unknown> = { ...attrs };
    if ((isNuxtLink.value || isRouterLink.value) && props.to && !props.disabled) {
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
        "styled-button--active": props.active,
    },
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
    padding: var(--space-2xs, 0.5rem) var(--space-s, 1rem);
    font-size: var(--step-0, 1rem);
    font-family: var(--heading-font-family, "Playfair Display"), serif;
    line-height: 1.4;

    &:hover:not(.styled-button--disabled):not(:disabled) {
        background-color: #f5f5f5;
        border-color: #201e24;
    }
    &:active:not(.styled-button--disabled):not(:disabled) {
        background-color: #ebebeb;
        border-color: #1a181f;
    }
    &:focus-visible:not(.styled-button--disabled):not(:disabled) {
        outline-color: #2E2C35;
        box-shadow: 0 0 0 0.2rem rgba(46, 44, 53, 0.4);
    }

    &--block {
        display: flex;
        width: 100%;
    }

    &--active {
        background-color: #2E2C35;
        border-color: #2E2C35;
        color: #fff;

        &:hover:not(.styled-button--disabled):not(:disabled) {
            background-color: #201e24;
            border-color: #201e24;
        }
    }

    // Sizes
    &--small {
        font-size: var(--step--1, 0.875rem);
    }
    &--large {
        padding: var(--space-2xs, 0.5rem) var(--space-m, 1.5rem);
        font-size: var(--step-1, 1.125rem);
    }

    // Variants
    &--secondary {
        color: var(--button-secondary-color, #cc4e00);
    }
}
</style>
