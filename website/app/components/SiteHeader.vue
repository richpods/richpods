<template>
<header class="header">
    <div class="header-content">
        <nav class="linear-navigation">
            <RipoButton as="nuxt-link" :to="localePath('listen')">
                <template #icon-left><NavIcon name="play" /></template>
                {{ $t("nav.listen") }}
            </RipoButton>
            <RipoButton as="link" :href="editorUrl">
                <template #icon-left><NavIcon name="create" /></template>
                {{ $t("nav.editor") }}
            </RipoButton>
            <RipoButton as="nuxt-link" :to="localePath('team')">
                <template #icon-left><NavIcon name="team" /></template>
                {{ $t("nav.team") }}
            </RipoButton>
            <RipoButton as="nuxt-link" :to="localePath('kontakt')">
                <template #icon-left><NavIcon name="mail" /></template>
                {{ $t("nav.contact") }}
            </RipoButton>
        </nav>
        <button
            class="hamburger"
            type="button"
            :class="{ 'hamburger--open': isMenuOpen }"
            :aria-expanded="isMenuOpen"
            aria-controls="mobile-navigation"
            :aria-label="isMenuOpen ? $t('nav.closeMenu') : $t('nav.openMenu')"
            @click="toggleMenu"
        >
            <span class="hamburger-icon">
                <span class="hamburger-bar"></span>
                <span class="hamburger-bar"></span>
            </span>
        </button>
        <NuxtLink class="logo-wrapper" :to="localePath('index')"><img class="logo" src="@richpods/shared/assets/images/logo-full.svg" alt="RichPods"></NuxtLink>
    </div>

    <Transition name="flyout">
        <div
            v-if="isMenuOpen"
            id="mobile-navigation"
            class="mobile-navigation"
            @click.self="closeMenu"
        >
            <nav class="mobile-navigation-list">
                <RipoButton as="nuxt-link" :to="localePath('listen')" size="large" block @click="closeMenu">
                    <template #icon-left><NavIcon name="play" /></template>
                    {{ $t("nav.listen") }}
                </RipoButton>
                <RipoButton as="link" :href="editorUrl" size="large" block @click="closeMenu">
                    <template #icon-left><NavIcon name="create" /></template>
                    {{ $t("nav.editor") }}
                </RipoButton>
                <RipoButton as="nuxt-link" :to="localePath('team')" size="large" block @click="closeMenu">
                    <template #icon-left><NavIcon name="team" /></template>
                    {{ $t("nav.team") }}
                </RipoButton>
                <RipoButton as="nuxt-link" :to="localePath('kontakt')" size="large" block @click="closeMenu">
                    <template #icon-left><NavIcon name="mail" /></template>
                    {{ $t("nav.contact") }}
                </RipoButton>
            </nav>
        </div>
    </Transition>
</header>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import RipoButton from "~/components/RipoButton.vue";
import NavIcon from "~/components/NavIcon.vue";

const MD_BREAKPOINT = 740;

const localePath = useLocalePath();
const editorUrl = useRuntimeConfig().public.editorUrl;
const route = useRoute();

const isMenuOpen = ref(false);

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
    if (window.innerWidth >= MD_BREAKPOINT) {
        closeMenu();
    }
}

watch(isMenuOpen, (open) => {
    if (typeof document === "undefined") {
        return;
    }
    document.body.style.overflow = open ? "hidden" : "";
});

watch(() => route.fullPath, closeMenu);

onMounted(() => {
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
.header {
    --header-height: 100px;

    background-color: var(--header-background-color);
    display: flex;
    justify-content: center;
    align-content: center;

    height: var(--header-height);

    @include mq($from: md) {
        --header-height: 190px;
    }
}

.header-content {
    display: grid;
    grid-template-columns: [navigation] 1fr [logo] auto;
    align-items: center;
    width: var(--content-max-width);
}

.logo-wrapper {
    grid-area: logo;
    height: var(--header-height);
    display: flex;
    justify-items: end;

    @include mq($until: md) {
        padding: var(--space-xs) 0;
    }
}

.logo {
    max-width: 210px;
    height: 100%;
    object-fit: contain;
}

.linear-navigation {
    grid-area: navigation;
    position: relative;
    top: -20px;
    display: flex;
    gap: var(--space-s);

    @include mq($until: md) {
        display: none;
    }
}

.hamburger {
    grid-area: navigation;
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
    color: var(--hero-color);
    cursor: pointer;

    @include mq($from: md) {
        display: none;
    }
}

.hamburger-icon {
    position: relative;
    width: 26px;
    height: 16px;
}

.hamburger-bar {
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

.hamburger--open .hamburger-bar {
    &:nth-child(1) {
        transform: translateY(3px) rotate(45deg);
    }

    &:nth-child(2) {
        transform: translateY(-3px) rotate(-45deg);
    }
}

.mobile-navigation {
    position: fixed;
    top: var(--header-height);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;

    background-color: var(--header-background-color);
    overflow-y: auto;
    padding: var(--space-l) var(--space-s);

    @include mq($from: md) {
        display: none;
    }
}

.mobile-navigation-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
}

.flyout-enter-active,
.flyout-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.flyout-enter-from,
.flyout-leave-to {
    opacity: 0;
    transform: translateY(-12px);
}
</style>
