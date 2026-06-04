<template>
    <header
        v-if="!isEmbedded"
        class="ripo-header"
        :class="{ 'ripo-header--fixed': fixed, 'ripo-header--burger-only': burgerOnly }"
    >
        <div class="ripo-header-content">
            <nav class="ripo-header-nav">
                <slot name="nav" />
            </nav>
            <button
                v-if="$slots['mobile-nav']"
                class="ripo-hamburger"
                type="button"
                :class="{ 'ripo-hamburger--open': isMenuOpen }"
                :aria-expanded="isMenuOpen"
                aria-controls="ripo-mobile-navigation"
                :aria-label="isMenuOpen ? closeMenuLabel : openMenuLabel"
                @click="toggleMenu"
            >
                <span class="ripo-hamburger-icon">
                    <span class="ripo-hamburger-bar"></span>
                    <span class="ripo-hamburger-bar"></span>
                </span>
            </button>
            <div v-if="$slots.actions" class="ripo-header-actions">
                <slot name="actions" />
            </div>
            <div class="ripo-header-logo">
                <slot name="logo">
                    <img class="ripo-logo" :src="logoSrc" :alt="logoAlt" />
                </slot>
            </div>
        </div>

        <Transition name="ripo-flyout">
            <div
                v-if="isMenuOpen"
                id="ripo-mobile-navigation"
                class="ripo-mobile-navigation"
                @click.self="closeMenu"
            >
                <nav class="ripo-mobile-navigation-list">
                    <slot name="mobile-nav" :close="closeMenu" />
                </nav>
            </div>
        </Transition>
    </header>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import logoFull from "../assets/images/logo-full.svg";

const MD_BREAKPOINT = 740;

type Props = {
    embedded?: boolean;
    fixed?: boolean;
    burgerOnly?: boolean;
    routeKey?: string;
    openMenuLabel?: string;
    closeMenuLabel?: string;
    logoSrc?: string;
    logoAlt?: string;
};

const props = withDefaults(defineProps<Props>(), {
    embedded: undefined,
    fixed: false,
    burgerOnly: false,
    routeKey: undefined,
    openMenuLabel: "Open menu",
    closeMenuLabel: "Close menu",
    logoSrc: logoFull,
    logoAlt: "RichPods",
});

const isMenuOpen = ref(false);
const detectedEmbedded = ref(false);

const isEmbedded = computed(() =>
    props.embedded === undefined ? detectedEmbedded.value : props.embedded,
);

function detectEmbedded(): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    let inIframe = false;
    try {
        inIframe = window.self !== window.top;
    } catch {
        inIframe = true;
    }
    const params = new URLSearchParams(window.location.search);
    return inIframe || params.get("embed") === "1";
}

function toggleMenu() {
    isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
    isMenuOpen.value = false;
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
        closeMenu();
    }
}

function handleResize() {
    if (!props.burgerOnly && window.innerWidth >= MD_BREAKPOINT) {
        closeMenu();
    }
}

watch(isMenuOpen, (open) => {
    if (typeof document === "undefined") {
        return;
    }
    document.body.style.overflow = open ? "hidden" : "";
});

watch(isEmbedded, (embedded) => {
    if (embedded) {
        closeMenu();
    }
});

watch(
    () => props.routeKey,
    () => {
        closeMenu();
    },
);

onMounted(() => {
    detectedEmbedded.value = detectEmbedded();
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("resize", handleResize);
    if (typeof document !== "undefined") {
        document.body.style.overflow = "";
    }
});
</script>
<style scoped lang="scss">
.ripo-header {
    background-color: var(--header-background-color, #fffaf5);
    border-bottom: var(--ripo-header-border-bottom, none);
    display: flex;
    justify-content: center;
    align-items: center;

    height: var(--ripo-header-height, 64px);
}

.ripo-header--fixed {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
}

.ripo-header-content {
    display: grid;
    grid-template-columns: [nav] 1fr [actions] auto [logo] auto;
    align-items: center;
    gap: var(--space-s, 1rem);
    width: var(--content-max-width, min(100% - 2rem, 1300px));
}

.ripo-header-nav {
    grid-column: nav;
    display: flex;
    align-items: center;
    gap: var(--space-s, 1rem);

    @media (max-width: 739px) {
        display: none;
    }
}

.ripo-header--burger-only .ripo-header-nav {
    display: none;
}

.ripo-hamburger {
    grid-column: nav;
    justify-self: start;
    position: relative;
    z-index: 60;

    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    margin: 0;
    appearance: none;
    background: none;
    border: none;
    color: var(--hero-color, #2f2c35);
    cursor: pointer;

    @media (min-width: 740px) {
        display: none;
    }
}

.ripo-header--burger-only .ripo-hamburger {
    display: inline-flex;
}

.ripo-hamburger-icon {
    position: relative;
    width: 26px;
    height: 16px;
}

.ripo-hamburger-bar {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    border-radius: 2px;
    background-color: currentColor;
    transform: translateY(0) rotate(0deg);
    transform-origin: center;
    transition: transform 0.3s ease;

    &:nth-child(1) {
        top: 4px;
    }

    &:nth-child(2) {
        top: 10px;
    }
}

.ripo-hamburger--open .ripo-hamburger-bar {
    &:nth-child(1) {
        transform: translateY(3px) rotate(45deg);
    }

    &:nth-child(2) {
        transform: translateY(-3px) rotate(-45deg);
    }
}

.ripo-header-actions {
    grid-column: actions;
    display: flex;
    align-items: center;
    gap: var(--space-xs, 0.75rem);
}

.ripo-header-logo {
    grid-column: logo;
    height: var(--ripo-header-height, 64px);
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

.ripo-logo {
    max-width: 180px;
    max-height: calc(var(--ripo-header-height, 64px) - 24px);
    width: auto;
    height: auto;
    object-fit: contain;
}

.ripo-mobile-navigation {
    position: fixed;
    top: var(--ripo-header-height, 64px);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;

    background-color: var(--header-background-color, #fffaf5);
    overflow-y: auto;
    padding: var(--space-l, 2rem) var(--space-s, 1rem);

    @media (min-width: 740px) {
        display: none;
    }
}

.ripo-header--burger-only .ripo-mobile-navigation {
    display: block;
}

.ripo-mobile-navigation-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-s, 1rem);
    max-width: 560px;
    margin-inline: auto;
}

.ripo-flyout-enter-active,
.ripo-flyout-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.ripo-flyout-enter-from,
.ripo-flyout-leave-to {
    opacity: 0;
    transform: translateY(-12px);
}
</style>
