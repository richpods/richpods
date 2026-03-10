<template>
    <dialog :aria-labelledby="headingId" class="modal-dialog" ref="dialog">
        <slot name="closeButton">
            <form method="dialog"><button class="close-button">{{ t("common.close") }}</button></form>
        </slot>
        <slot />
    </dialog>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

const headingId = `dialog-heading-${Math.floor(Math.random() * 100)}`;
const dialog = useTemplateRef("dialog");
const { t } = useI18n();

function toggle() {
    if (!dialog.value) return;

    if (dialog.value.open) {
        dialog.value.close();
    } else {
        dialog.value.showModal();
    }
}

function close() {
    if (dialog.value) {
        dialog.value.close();
    }
}

defineExpose({
    toggle,
    close,
});
</script>

<style scoped lang="scss">
.modal-dialog {
    &::backdrop {
        background-color: var(--richpod-overlay-backdrop);
        backdrop-filter: blur(2px);
    }

    width: 100%;
    max-width: min(calc(100vw - 20px), calc(var(--richpod-app-max-width) - 80px));
    min-height: 25dvh;
    background: var(--richpod-overlay-background-color);
    border: none;
    border-radius: 11px;
    box-shadow: 0 3px 6px #00000029;

    .close-button {
        appearance: none;
        position: absolute;
        top: 6px;
        right: 6px;
        background-color: transparent;
        background-image: url("../assets/images/icon_close.svg");
        background-size: contain;
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 50%;
        text-indent: -9999rem;
    }
}
</style>
