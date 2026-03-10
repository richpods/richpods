<template>
    <netidee-banner></netidee-banner>
    <footer class="footer">
        <div class="footer-content">
            <div class="logo-wrapper">
                <img src="@richpods/shared/assets/images/logo-full-white.svg" alt="" >
            </div>
            <div class="links">
                <NuxtLink :to="localePath('index')">{{ $t("footer.home") }}</NuxtLink>
                <NuxtLink :to="localePath('listen')">{{ $t("footer.listen") }}</NuxtLink>
                <NuxtLink :to="localePath('team')">{{ $t("footer.team") }}</NuxtLink>
                <NuxtLink :to="localePath('kontakt')">{{ $t("footer.contact") }}</NuxtLink>
                <NuxtLink :to="localePath('kontakt')">{{ $t("footer.privacy") }}</NuxtLink>
                <a href="https://www.netidee.at/richpodsorg" target="_blank" rel="noopener">{{ $t("footer.netideeBlog") }}</a>
                <DropdownMenu
                    class="language-dropdown"
                    :items="languageItems"
                    :active-key="locale"
                    :menu-label="$t('footer.languageSelection')"
                    placement="top"
                >
                    <template #trigger="{ isOpen }">
                        <span class="language-trigger">
                            <svg
                                class="globe-icon"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 512 512"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M256 48C141.13 48 48 141.13 48 256s93.13 208 208 208 208-93.13 208-208S370.87 48 256 48z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
                                <path d="M256 48c-58.07 0-112.67 93.13-112.67 208S197.93 464 256 464s112.67-93.13 112.67-208S314.07 48 256 48z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
                                <path d="M117.33 117.33c38.24 27.15 86.38 43.34 138.67 43.34s100.43-16.19 138.67-43.34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
                                <path d="M394.67 394.67c-38.24-27.15-86.38-43.34-138.67-43.34s-100.43 16.19-138.67 43.34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
                                <line x1="256" y1="48" x2="256" y2="464" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
                                <line x1="464" y1="256" x2="48" y2="256" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/>
                            </svg>
                            <span>{{ currentLocaleName }}</span>
                            <svg
                                class="chevron-icon"
                                :class="{ 'chevron-icon--open': isOpen }"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 512 512"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M256 294.1L383 167c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-143 143c-9.4 9.4-24.6 9.4-33.9 0l-143-143c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l127 127.1z"/>
                            </svg>
                        </span>
                    </template>
                </DropdownMenu>
            </div>
        </div>
    </footer>
</template>
<script setup lang="ts">
import { computed } from "vue";
import NetideeBanner from "~/components/NetideeBanner.vue";
import DropdownMenu from "~/components/DropdownMenu.vue";

const localePath = useLocalePath();
const switchLocalePath = useSwitchLocalePath();
const { locale, locales } = useI18n();

const availableLocales = computed(() =>
    locales.value.filter((l) => typeof l !== "string")
);

const currentLocaleName = computed(() => {
    const current = availableLocales.value.find((l) => l.code === locale.value);
    return current?.name ?? locale.value;
});

const languageItems = computed(() =>
    availableLocales.value.map((l) => ({
        key: l.code,
        label: l.name ?? l.code,
        to: switchLocalePath(l.code),
    }))
);
</script>
<style scoped lang="scss">
.footer {
    background-color: var(--footer-background-color);
    padding: var(--space-l) 0 var(--space-xl);
    min-height: 250px;
}

.footer-content {
    @include grid();
}

.logo-wrapper {
    grid-column: 1/3;
    height: 140px;

    img {
        object-fit: contain;
        width: 100%;
        height: 100%;
    }

    @include mq($from: md) {
        grid-column: 1/5;
    }

    @include mq($from: lg) {
        grid-column: 7/10;
    }
}

.links {
    grid-column: 6/-1;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    text-align: right;

    @include mq($from: lg) {
        grid-column: 10/-1;
    }

    a {
        color: var(--link-bright-color);
        font-size: var(--step-1);
        font-family: var(--heading-font-family), serif;

        @include mq($until: lg) {
            font-size: var(--step-0);
        }

        &:hover,
        &:focus {
            color: var(--link-bright-color-hover)
        }
    }
}

.language-dropdown {
    justify-content: flex-end;
    margin-top: var(--space-xs);
}

.language-trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-xs);
    background-color: #fff;
    color: var(--footer-background-color);
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: var(--step-0);
    font-family: var(--heading-font-family), serif;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: #f0ebe6;
    }
}

.globe-icon {
    width: 1.2em;
    height: 1.2em;
    flex-shrink: 0;
}

.chevron-icon {
    width: 0.8em;
    height: 0.8em;
    flex-shrink: 0;
    transition: transform 0.2s ease;

    &--open {
        transform: rotate(180deg);
    }
}
</style>
