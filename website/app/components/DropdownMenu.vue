<template>
    <div ref="wrapperRef" class="dropdown-menu-wrapper">
        <button
            ref="triggerRef"
            class="dropdown-trigger"
            type="button"
            :aria-expanded="isOpen"
            aria-haspopup="menu"
            :aria-controls="menuId"
            @click="toggle"
            @keydown.arrow-up.prevent="openAndFocusLast"
            @keydown.arrow-down.prevent="openAndFocusFirst"
        >
            <slot name="trigger" :is-open="isOpen"></slot>
        </button>
        <ul
            v-if="isOpen"
            :id="menuId"
            ref="menuRef"
            class="dropdown-panel"
            :class="`dropdown-panel--${placement}`"
            role="menu"
            :aria-label="menuLabel"
            @keydown="handleMenuKeydown"
        >
            <li
                v-for="(item, index) in items"
                :key="item.key"
                role="none"
            >
                <NuxtLink
                    v-if="item.to !== undefined"
                    :to="item.to"
                    class="dropdown-item"
                    :class="{ 'dropdown-item--active': item.key === activeKey }"
                    role="menuitem"
                    :tabindex="index === focusedIndex ? 0 : -1"
                    :aria-current="item.key === activeKey ? 'true' : undefined"
                    @click="selectItem(item)"
                >
                    {{ item.label }}
                </NuxtLink>
                <a
                    v-else-if="item.href !== undefined"
                    :href="item.href"
                    :target="item.target"
                    :rel="item.target === '_blank' ? 'noopener' : undefined"
                    class="dropdown-item"
                    :class="{ 'dropdown-item--active': item.key === activeKey }"
                    role="menuitem"
                    :tabindex="index === focusedIndex ? 0 : -1"
                    :aria-current="item.key === activeKey ? 'true' : undefined"
                    @click="selectItem(item)"
                >
                    {{ item.label }}
                </a>
                <button
                    v-else
                    type="button"
                    class="dropdown-item"
                    :class="{ 'dropdown-item--active': item.key === activeKey }"
                    role="menuitem"
                    :tabindex="index === focusedIndex ? 0 : -1"
                    :aria-current="item.key === activeKey ? 'true' : undefined"
                    @click="selectItem(item)"
                >
                    {{ item.label }}
                </button>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, useId } from "vue";

type DropdownMenuItem = {
    key: string;
    label: string;
    to?: string | Record<string, unknown>;
    href?: string;
    target?: string;
};

type Props = {
    items: DropdownMenuItem[];
    activeKey?: string;
    menuLabel: string;
    placement?: "top" | "bottom";
};

const props = withDefaults(defineProps<Props>(), {
    activeKey: "",
    placement: "bottom",
});

const emit = defineEmits<{
    select: [item: DropdownMenuItem];
}>();

const menuId = `dropdown-menu-${useId()}`;

const wrapperRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLUListElement | null>(null);

const isOpen = ref(false);
const focusedIndex = ref(-1);

function getMenuItems(): HTMLElement[] {
    if (!menuRef.value) return [];
    return Array.from(menuRef.value.querySelectorAll<HTMLElement>("[role='menuitem']"));
}

function focusByIndex(index: number) {
    const items = getMenuItems();
    if (items.length === 0) return;
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    focusedIndex.value = clamped;
    nextTick(() => items[clamped]?.focus());
}

const activeIndex = computed(() =>
    props.items.findIndex((item) => item.key === props.activeKey)
);

async function open() {
    isOpen.value = true;
    await nextTick();
}

async function openAndFocusFirst() {
    await open();
    focusByIndex(0);
}

async function openAndFocusLast() {
    await open();
    focusByIndex(props.items.length - 1);
}

function close() {
    isOpen.value = false;
    focusedIndex.value = -1;
}

function closeAndFocusTrigger() {
    close();
    triggerRef.value?.focus();
}

async function toggle() {
    if (isOpen.value) {
        close();
    } else {
        await open();
        focusByIndex(activeIndex.value >= 0 ? activeIndex.value : 0);
    }
}

function selectItem(item: DropdownMenuItem) {
    emit("select", item);
    close();
}

function handleMenuKeydown(event: KeyboardEvent) {
    const items = getMenuItems();
    const current = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
        case "ArrowDown": {
            event.preventDefault();
            focusByIndex(current + 1 < items.length ? current + 1 : 0);
            break;
        }
        case "ArrowUp": {
            event.preventDefault();
            focusByIndex(current - 1 >= 0 ? current - 1 : items.length - 1);
            break;
        }
        case "Home": {
            event.preventDefault();
            focusByIndex(0);
            break;
        }
        case "End": {
            event.preventDefault();
            focusByIndex(items.length - 1);
            break;
        }
        case "Escape": {
            event.preventDefault();
            closeAndFocusTrigger();
            break;
        }
        case "Tab": {
            close();
            break;
        }
    }
}

function handleClickOutside(event: MouseEvent) {
    if (wrapperRef.value && !wrapperRef.value.contains(event.target as HTMLElement)) {
        close();
    }
}

onMounted(() => {
    document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped lang="scss">
.dropdown-menu-wrapper {
    position: relative;
    display: inline-flex;
}

.dropdown-trigger {
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
}

.dropdown-panel {
    position: absolute;
    right: 0;
    list-style: none;
    margin: 0;
    padding: var(--space-3xs) 0;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
    min-width: 100%;
    z-index: 10;

    &--top {
        bottom: calc(100% + var(--space-3xs));
    }

    &--bottom {
        top: calc(100% + var(--space-3xs));
    }
}

.dropdown-item {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-3xs) var(--space-xs);
    background: none;
    border: none;
    color: var(--footer-background-color);
    font-size: var(--step-0);
    font-family: var(--heading-font-family), serif;
    text-decoration: none;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;

    &:hover,
    &:focus-visible {
        background-color: #f0ebe6;
    }

    &--active {
        font-weight: 600;
    }
}
</style>
