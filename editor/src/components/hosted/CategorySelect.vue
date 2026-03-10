<template>
    <div>
        <label v-if="label" :for="selectId" class="block text-sm font-medium text-gray-700 mb-1">
            {{ label }}
        </label>
        <select
            :id="selectId"
            :value="modelValue"
            @change="handleChange"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            :required="required"
        >
            <option value="" disabled>{{ placeholder }}</option>
            <option
                v-for="category in categories"
                :key="category.value"
                :value="category.value"
                :class="{ 'pl-4': category.isSubcategory }"
            >
                {{ category.isSubcategory ? `\u00A0\u00A0\u00A0\u00A0${category.label}` : category.label }}
            </option>
        </select>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ITUNES_CATEGORIES } from "@richpods/shared/utils/itunesCategories";

const props = defineProps<{
    modelValue: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const selectId = computed(() => `category-select-${Math.random().toString(36).slice(2, 9)}`);

type CategoryOption = {
    value: string;
    label: string;
    isSubcategory: boolean;
};

const categories = computed<CategoryOption[]>(() => {
    return ITUNES_CATEGORIES.map((cat) => {
        const isSubcategory = cat.includes(" > ");
        const label = isSubcategory ? cat.split(" > ")[1] : cat;
        return {
            value: cat,
            label,
            isSubcategory,
        };
    });
});

function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    emit("update:modelValue", target.value);
}
</script>
