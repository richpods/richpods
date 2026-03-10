import { defineStore } from "pinia";
import { computed, ref } from "vue";

// Define validation error types as const for type safety
export const ValidationErrorTypes = {
    REQUIRED: "REQUIRED",
    NO_HTML: "NO_HTML",
    INVALID_URL: "INVALID_URL",
    INVALID: "INVALID",
    QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
} as const;

// Derive the type from the const
export type ValidationErrorType = (typeof ValidationErrorTypes)[keyof typeof ValidationErrorTypes];

export type ValidationError = {
    type: ValidationErrorType;
    field?: string;
    chapterIndex?: number;
    message: string;
};

export const useEditorUiStore = defineStore("editorUi", () => {
    const validationErrors = ref<ValidationError[]>([]);

    function setValidationErrors(errors: ValidationError[]) {
        validationErrors.value = [...errors];
    }

    function addValidationError(error: ValidationError) {
        // Check for duplicates based on type + field + chapterIndex combination
        const exists = validationErrors.value.some(
            (e) =>
                e.type === error.type &&
                e.field === error.field &&
                e.chapterIndex === error.chapterIndex,
        );

        if (!exists) {
            validationErrors.value = [...validationErrors.value, error];
        }
    }

    function removeValidationError(type: ValidationErrorType, field?: string) {
        validationErrors.value = validationErrors.value.filter(
            (e) => !(e.type === type && e.field === field),
        );
    }

    function removeValidationErrorsByType(type: ValidationErrorType) {
        validationErrors.value = validationErrors.value.filter((e) => e.type !== type);
    }

    function removeValidationErrorsByField(field: string) {
        validationErrors.value = validationErrors.value.filter((e) => e.field !== field);
    }

    function clearValidationErrors() {
        validationErrors.value = [];
    }

    const canEditorSave = computed(() => validationErrors.value.length === 0);

    const validationErrorsByChapter = computed(() => {
        const errorsByChapter = new Map<number | "global", ValidationError[]>();

        validationErrors.value.forEach((error) => {
            const key = error.chapterIndex !== undefined ? error.chapterIndex : "global";
            if (!errorsByChapter.has(key)) {
                errorsByChapter.set(key, []);
            }
            errorsByChapter.get(key)!.push(error);
        });

        return errorsByChapter;
    });

    function hasErrorsInChapter(chapterIndex: number): boolean {
        return validationErrors.value.some((e) => e.chapterIndex === chapterIndex);
    }

    return {
        validationErrors,
        validationErrorsByChapter,
        canEditorSave,
        setValidationErrors,
        addValidationError,
        removeValidationError,
        removeValidationErrorsByType,
        removeValidationErrorsByField,
        clearValidationErrors,
        hasErrorsInChapter,
    };
});
