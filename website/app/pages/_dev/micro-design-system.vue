<template>
    <section>
        <h2>Buttons</h2>
        <div class="button-row">
            <RipoButton v-for="size of buttonSizes" :key="size" :size="size">
                {{ "Standard Button " + (size ?? "default") }}
            </RipoButton>
        </div>
    </section>

    <section>
        <h2>Dropdown Menu</h2>
        <div class="dropdown-row">
            <div class="dropdown-example">
                <h3>Action items (bottom)</h3>
                <DropdownMenu
                    :items="actionItems"
                    :active-key="selectedAction"
                    menu-label="Choose an action"
                    placement="bottom"
                    @select="onActionSelect"
                >
                    <template #trigger="{ isOpen }">
                        <span class="demo-trigger">
                            {{ selectedActionLabel }}
                            <span class="demo-chevron" :class="{ 'demo-chevron--open': isOpen }">▾</span>
                        </span>
                    </template>
                </DropdownMenu>
            </div>

            <div class="dropdown-example">
                <h3>Link items (top)</h3>
                <DropdownMenu
                    :items="linkItems"
                    menu-label="Helpful links"
                    placement="top"
                >
                    <template #trigger="{ isOpen }">
                        <span class="demo-trigger">
                            Links
                            <span class="demo-chevron" :class="{ 'demo-chevron--open': isOpen }">▾</span>
                        </span>
                    </template>
                </DropdownMenu>
            </div>
        </div>
    </section>
</template>
<script setup lang="ts">
import { ref, computed } from "vue";
import RipoButton from "~/components/RipoButton.vue";
import DropdownMenu from "~/components/DropdownMenu.vue";

definePageMeta({
    i18n: {
        paths: {
            de: "/_dev/micro-design-system",
            en: "/_dev/micro-design-system",
        },
    },
});

const buttonSizes: ("small" | "medium" | "large" | undefined)[] = ["small", undefined, "medium", "large"];

const actionItems = [
    { key: "edit", label: "Edit" },
    { key: "duplicate", label: "Duplicate" },
    { key: "archive", label: "Archive" },
    { key: "delete", label: "Delete" },
];

const selectedAction = ref("edit");

const selectedActionLabel = computed(
    () => actionItems.find((i) => i.key === selectedAction.value)?.label ?? "Choose…"
);

function onActionSelect(item: { key: string }) {
    selectedAction.value = item.key;
}

const linkItems = [
    { key: "docs", label: "Menu Item 1", href: "#1" },
    { key: "github", label: "Menu Item 2", href: "#2" },
    { key: "nuxt", label: "Menu Item 3", href: "#3" },
];
</script>
<style scoped lang="scss">
h2 {
    text-align: center;
    font-size: 2.75rem;
}

h3 {
    font-size: var(--step-1);
    padding-bottom: var(--space-2xs);
}

.button-row {
    display: flex;
    justify-content: space-around;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}

.dropdown-row {
    display: flex;
    justify-content: space-around;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--space-l);
    padding: 0 0 var(--space-l) 0;
}

.dropdown-example {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.demo-trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-xs);
    background-color: #fff;
    color: #2f2c35;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: var(--step-0);
    font-family: var(--heading-font-family), serif;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: #f0ebe6;
    }
}

.demo-chevron {
    transition: transform 0.2s ease;
    font-size: 0.8em;

    &--open {
        transform: rotate(180deg);
    }
}
</style>
