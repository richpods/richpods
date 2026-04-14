<template>
    <div class="share-copy-field">
        <label :for="fieldId">{{ label }}</label>
        <div class="field-row" :class="{ multiline }">
            <textarea
                v-if="multiline"
                :id="fieldId"
                :value="value"
                :rows="rows"
                readonly
                spellcheck="false"
                @focus="selectContent"
            />
            <input
                v-else
                :id="fieldId"
                type="text"
                :value="value"
                readonly
                @focus="selectContent"
            >
            <button type="button" class="copy-button" @click="copy">
                {{ copied ? t("shareDialog.copied") : (copyLabel ?? t("shareDialog.copy")) }}
            </button>
        </div>
        <p v-if="hint" class="field-hint">{{ hint }}</p>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

type Props = {
    label: string;
    value: string;
    multiline?: boolean;
    rows?: number;
    copyLabel?: string;
    hint?: string;
};

const props = withDefaults(defineProps<Props>(), {
    multiline: false,
    rows: 4,
    copyLabel: undefined,
    hint: undefined,
});

const { t } = useI18n();

const fieldId = `share-copy-field-${Math.floor(Math.random() * 1_000_000)}`;
const copied = ref(false);

async function copy() {
    try {
        await navigator.clipboard.writeText(props.value);
    } catch {
        return;
    }
    copied.value = true;
    setTimeout(() => {
        copied.value = false;
    }, 2000);
}

function selectContent(event: FocusEvent) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    target?.select();
}
</script>

<style scoped lang="scss">
.share-copy-field {
    label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 6px;
    }
}

.field-row {
    display: flex;
    align-items: stretch;
    gap: 8px;

    &.multiline {
        flex-direction: column;
        align-items: stretch;
    }

    input,
    textarea {
        flex: 1;
        min-width: 0;
        box-sizing: border-box;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid var(--richpod-border-color, rgba(0, 0, 0, 0.15));
        background-color: var(--richpod-chapter-background);
        color: var(--richpod-chapter-color);
        font-family: var(--richpod-font-family-text), sans-serif;
        font-size: 13px;
        line-height: 18px;
    }

    textarea {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        resize: vertical;
    }
}

.copy-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border: none;
    border-radius: 13px;
    background-color: var(--richpod-button-background);
    color: var(--richpod-button-text);
    font-family: var(--richpod-font-family-text), sans-serif;
    font-size: 13px;
    line-height: 18px;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        opacity: 0.9;
    }

    &:focus-visible {
        outline: 2px solid var(--richpod-header-background-color);
        outline-offset: 2px;
    }
}

.multiline .copy-button {
    align-self: flex-start;
    margin-top: 8px;
}

.field-hint {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 16px;
    opacity: 0.7;
}
</style>
