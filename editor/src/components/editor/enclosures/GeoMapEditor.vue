<template>
    <div class="space-y-4">
        <div class="max-w-xl">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="geomap-title">
                {{ t("geoMapEditor.titleLabel") }}
            </label>
            <input
                id="geomap-title"
                v-model="titleInput"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                @blur="handleMetadataBlur"
            />
        </div>
        <div class="flex border-b">
            <button
                v-for="tab in tabs"
                :key="tab"
                type="button"
                @click="activeTab = tab"
                :class="[
                    'px-4 py-2 -mb-px border-b-2 text-sm',
                    activeTab === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800',
                ]"
            >
                {{ tabLabel(tab) }}
            </button>
        </div>

        <div v-if="activeTab === 'Map'" class="geo-map-editor-container">
            <GeoJsonEditor
                ref="geoJsonEditorRef"
                v-model="geoJsonModel"
                :l10n="editorL10n"
                pmtiles-url="https://storage.googleapis.com/richpod-shortbread-tiles/shortbread-europe.pmtiles"
                :photonUrl="PHOTON_PUBLIC_URL"
                :searchLanguage="locale"
            />
        </div>

        <div v-if="activeTab === 'Map'" class="flex gap-2 mt-2">
            <button
                type="button"
                class="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                @click="setInitialView"
            >
                {{ t("geoMapEditor.setInitialView") }}
            </button>
            <button
                v-if="hasBbox"
                type="button"
                class="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                @click="resetInitialView"
            >
                {{ t("geoMapEditor.resetInitialView") }}
            </button>
        </div>

        <div v-else-if="activeTab === 'Description'">
            <label
                class="block text-sm font-medium text-gray-700 mb-1"
                for="geomap-description"
            >
                {{ t("geoMapEditor.descriptionLabel") }}
            </label>
            <textarea
                id="geomap-description"
                v-model="descriptionInput"
                rows="6"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                @blur="handleMetadataBlur"
            ></textarea>
        </div>

        <div v-else class="space-y-3">
            <input
                id="geojson-upload"
                ref="fileInputRef"
                type="file"
                accept="application/geo+json,application/json,.geojson,.json"
                class="hidden"
                @change="handleFileUpload"
            />
            <div
                class="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md px-6 py-10 text-center text-sm text-gray-600"
                @dragover.prevent
                @drop.prevent="handleFileDrop"
            >
                <p>{{ t("geoMapEditor.dropGeoJson") }}</p>
                <button
                    type="button"
                    class="mt-2 px-4 py-2 bg-gray-100 rounded-md text-sm text-gray-700 hover:bg-gray-200"
                    @click="triggerFilePicker"
                >
                    {{ t("geoMapEditor.chooseFile") }}
                </button>
            </div>
            <p v-if="geoJsonError" class="text-xs text-red-600">{{ geoJsonError }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { useValidation } from "@/composables/useValidation";
import { validateGeoJsonRfc7946 } from "@/utils/geoJsonValidation";
import { useSaveNow } from "@/composables/useSaveNow";
import { GeoJsonEditor, PHOTON_PUBLIC_URL } from "@richpods/tiny-geojson-tool";
import type { EditorFeatureCollection, EditorProps, GeoJsonBbox } from "@richpods/tiny-geojson-tool";

const { t, locale } = useI18n();

const richpodStore = useRichPodStore();
const { currentChapter } = storeToRefs(richpodStore);
const { runValidation } = useValidation();
const saveNow = useSaveNow();

const tabs = ["Map", "Description", "Import"] as const;
type TabType = (typeof tabs)[number];
const activeTab = ref<TabType>("Map");

function tabLabel(tab: TabType): string {
    if (tab === "Map") return t("geoMapEditor.map");
    if (tab === "Description") return t("geoMapEditor.descriptionTab");
    return t("geoMapEditor.import");
}

function isGeoJsonBbox(value: unknown): value is GeoJsonBbox {
    return (
        Array.isArray(value) &&
        value.length === 4 &&
        value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))
    );
}

const geoJsonError = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const geoJsonEditorRef = ref<InstanceType<typeof GeoJsonEditor> | null>(null);

const titleInput = computed({
    get: () => currentChapter.value?.enclosure.title ?? "",
    set: (value: string) => {
        richpodStore.updateCurrentChapter((chapter) => ({
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                title: value,
            },
        }));
    },
});

const descriptionInput = computed({
    get: () => currentChapter.value?.enclosure.description ?? "",
    set: (value: string) => {
        richpodStore.updateCurrentChapter((chapter) => ({
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                description: value,
            },
        }));
    },
});

function toEditorFeatureCollection(raw: unknown): EditorFeatureCollection {
    const fc = raw as {
        type?: string;
        bbox?: GeoJsonBbox;
        features?: Array<Record<string, unknown>>;
    };
    if (fc?.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
        return { type: "FeatureCollection", features: [] };
    }
    const result: EditorFeatureCollection = {
        type: "FeatureCollection",
        features: fc.features.map((f) => ({
            ...f,
            id: typeof f.id === "string" ? f.id : crypto.randomUUID(),
        })),
    } as EditorFeatureCollection;
    if (isGeoJsonBbox(fc.bbox)) {
        result.bbox = fc.bbox;
    }
    return result;
}

const geoJsonModel = computed<EditorFeatureCollection>({
    get: () => toEditorFeatureCollection(currentChapter.value?.enclosure.geoJSON),
    set: (value: EditorFeatureCollection) => {
        richpodStore.updateCurrentChapter((chapter) => ({
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                geoJSON: value as unknown as Record<string, unknown>,
            },
        }));
        runValidation();
    },
});

const editorL10n = computed<EditorProps["l10n"]>(() => ({
    toolSelect: t("geoMapEditor.l10n.toolSelect"),
    toolMarker: t("geoMapEditor.l10n.toolMarker"),
    toolLine: t("geoMapEditor.l10n.toolLine"),
    toolPolygon: t("geoMapEditor.l10n.toolPolygon"),
    toolEraser: t("geoMapEditor.l10n.toolEraser"),
    propTitle: t("geoMapEditor.l10n.propTitle"),
    propDescription: t("geoMapEditor.l10n.propDescription"),
    propFillColor: t("geoMapEditor.l10n.propFillColor"),
    propFillOpacity: t("geoMapEditor.l10n.propFillOpacity"),
    propStrokeColor: t("geoMapEditor.l10n.propStrokeColor"),
    propStrokeOpacity: t("geoMapEditor.l10n.propStrokeOpacity"),
    propStrokeWidth: t("geoMapEditor.l10n.propStrokeWidth"),
    propMarkerColor: t("geoMapEditor.l10n.propMarkerColor"),
    propMarkerSize: t("geoMapEditor.l10n.propMarkerSize"),
    propSizeSmall: t("geoMapEditor.l10n.propSizeSmall"),
    propSizeMedium: t("geoMapEditor.l10n.propSizeMedium"),
    propSizeLarge: t("geoMapEditor.l10n.propSizeLarge"),
    propIcon: t("geoMapEditor.l10n.propIcon"),
    propIconRemove: t("geoMapEditor.l10n.propIconRemove"),
    propIconNone: t("geoMapEditor.l10n.propIconNone"),
    propIconSearch: t("geoMapEditor.l10n.propIconSearch"),
    propIconNoResults: t("geoMapEditor.l10n.propIconNoResults"),
    propLabel: t("geoMapEditor.l10n.propLabel"),
    propLabelPosition: t("geoMapEditor.l10n.propLabelPosition"),
    propPositionTop: t("geoMapEditor.l10n.propPositionTop"),
    propPositionBottom: t("geoMapEditor.l10n.propPositionBottom"),
    propPositionLeft: t("geoMapEditor.l10n.propPositionLeft"),
    propPositionRight: t("geoMapEditor.l10n.propPositionRight"),
}));

const hasBbox = computed(() => Boolean(geoJsonModel.value.bbox));

async function setInitialView() {
    const map = geoJsonEditorRef.value?.getMap();
    if (!map) return;
    const bounds = map.getBounds();
    const bbox: GeoJsonBbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
    ];
    geoJsonModel.value = { ...geoJsonModel.value, bbox };
    await saveNow();
}

async function resetInitialView() {
    const { bbox: _, ...rest } = geoJsonModel.value;
    geoJsonModel.value = rest as EditorFeatureCollection;
    await nextTick();
    geoJsonEditorRef.value?.fitBounds();
    await saveNow();
}

const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(t("geoMapEditor.readFileFailed")));
        reader.readAsText(file);
    });

const applyImportedGeoJson = (value: unknown) => {
    const validation = validateGeoJsonRfc7946(value);
    if (!validation.isValid) {
        geoJsonError.value = validation.error ?? t("geoMapEditor.invalidGeoJson");
        runValidation();
        return;
    }

    geoJsonError.value = null;
    geoJsonModel.value = toEditorFeatureCollection(value);
    activeTab.value = "Map";
};

const handleFileUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    try {
        const text = await readFile(file);
        applyImportedGeoJson(JSON.parse(text));
    } catch (error) {
        geoJsonError.value =
            error instanceof Error && error.message === t("geoMapEditor.readFileFailed")
                ? error.message
                : t("geoMapEditor.invalidGeoJsonFile");
        runValidation();
    } finally {
        input.value = "";
    }
};

const handleFileDrop = async (event: DragEvent) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    try {
        const text = await readFile(file);
        applyImportedGeoJson(JSON.parse(text));
    } catch (error) {
        geoJsonError.value =
            error instanceof Error && error.message === t("geoMapEditor.readFileFailed")
                ? error.message
                : t("geoMapEditor.invalidGeoJsonFile");
        runValidation();
    }
};

const triggerFilePicker = () => {
    fileInputRef.value?.click();
};

const handleMetadataBlur = () => {
    richpodStore.updateCurrentChapter((chapter) => ({
        ...chapter,
        enclosure: {
            ...chapter.enclosure,
            title: (chapter.enclosure.title ?? "").trim(),
            description: (chapter.enclosure.description ?? "").trim(),
        },
    }));
    runValidation();
};
</script>

<style lang="scss" scoped>
.geo-map-editor-container {
    height: calc(100dvh - 300px);
    min-height: 300px;
}
</style>
