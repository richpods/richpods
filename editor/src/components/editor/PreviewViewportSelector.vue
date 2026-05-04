<template>
    <Listbox
        v-if="showSelector"
        :model-value="viewportId"
        @update:model-value="setViewport"
        as="div"
        class="relative flex-shrink-0"
    >
        <ListboxButton
            class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <Icon :icon="currentViewport.icon" class="w-4 h-4" />
            <span>{{ t(currentViewport.labelKey) }}</span>
            <span class="text-xs text-gray-500">{{ currentViewport.widthLabel }}</span>
            <Icon icon="ion:chevron-down" class="w-3 h-3 text-gray-500" />
        </ListboxButton>
        <ListboxOptions
            class="absolute right-0 z-20 mt-1 max-h-60 w-56 overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none"
        >
            <ListboxOption
                v-for="vp in viewports"
                :key="vp.id"
                :value="vp.id"
                v-slot="{ active, selected }"
                as="template"
            >
                <li
                    :class="[
                        'flex cursor-pointer items-center gap-2 px-3 py-2',
                        active ? 'bg-blue-50 text-blue-700' : 'text-gray-700',
                    ]"
                >
                    <Icon :icon="vp.icon" class="w-4 h-4" />
                    <span class="flex-1">{{ t(vp.labelKey) }}</span>
                    <span class="text-xs text-gray-500">{{ vp.widthLabel }}</span>
                    <Icon
                        v-if="selected"
                        icon="ion:checkmark"
                        class="w-4 h-4 text-blue-600"
                    />
                </li>
            </ListboxOption>
        </ListboxOptions>
    </Listbox>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/vue";
import { usePreviewViewport } from "@/composables/usePreviewViewport";

const { t } = useI18n();
const { viewports, viewportId, setViewport, currentViewport, showSelector } =
    usePreviewViewport();
</script>
