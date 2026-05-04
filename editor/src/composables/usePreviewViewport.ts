import { computed, onBeforeUnmount, ref } from "vue";
import type { PreviewViewportId, PreviewViewportOption } from "@/types/editor";

const VIEWPORT_STORAGE_KEY = "richpods-editor-preview-viewport";
const VIEWPORT_SELECTOR_MIN_WIDTH = 1024;

export const previewViewports: PreviewViewportOption[] = [
    {
        id: "desktop",
        labelKey: "editor.preview.viewport.desktop",
        icon: "ion:desktop-outline",
        widthLabel: "100%",
        width: null,
    },
    {
        id: "tablet",
        labelKey: "editor.preview.viewport.tablet",
        icon: "ion:tablet-portrait-outline",
        widthLabel: "768px",
        width: 768,
    },
    {
        id: "smartphone",
        labelKey: "editor.preview.viewport.smartphone",
        icon: "ion:phone-portrait-outline",
        widthLabel: "390px",
        width: 390,
    },
];

function loadStoredViewport(): PreviewViewportId {
    try {
        const stored = localStorage.getItem(VIEWPORT_STORAGE_KEY);
        if (stored && previewViewports.some((v) => v.id === stored)) {
            return stored as PreviewViewportId;
        }
    } catch {
        // localStorage unavailable
    }
    return "desktop";
}

const viewportId = ref<PreviewViewportId>(loadStoredViewport());

function persist(id: PreviewViewportId) {
    try {
        localStorage.setItem(VIEWPORT_STORAGE_KEY, id);
    } catch {
        // localStorage unavailable or quota exceeded
    }
}

export function usePreviewViewport() {
    const selectorMediaQuery =
        typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia(`(min-width: ${VIEWPORT_SELECTOR_MIN_WIDTH}px)`)
            : null;
    const showSelector = ref(selectorMediaQuery?.matches ?? true);

    function handleSelectorMediaChange(event: MediaQueryListEvent) {
        showSelector.value = event.matches;
    }

    selectorMediaQuery?.addEventListener("change", handleSelectorMediaChange);
    onBeforeUnmount(() => {
        selectorMediaQuery?.removeEventListener("change", handleSelectorMediaChange);
    });

    function setViewport(id: PreviewViewportId) {
        if (viewportId.value === id) return;
        viewportId.value = id;
        persist(id);
    }

    const effectiveViewport = computed<PreviewViewportOption>(() => {
        if (!showSelector.value) return previewViewports[0];
        return previewViewports.find((v) => v.id === viewportId.value) ?? previewViewports[0];
    });

    const frameStyle = computed(() => {
        const width = effectiveViewport.value.width;
        if (!width) return {};
        return { width: `${width}px`, maxWidth: "100%" };
    });

    return {
        viewports: previewViewports,
        viewportId,
        setViewport,
        currentViewport: effectiveViewport,
        showSelector,
        frameStyle,
    };
}
