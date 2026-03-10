<template>
    <div class="geo-map-enclosure">
        <enclosure-header :enclosure="enclosure" />
        <template v-if="enclosure.description">
            <button @click="toggleDescriptionDialog" class="mapDescription">
                {{ t("geoMap.info") }}
            </button>
            <modal-dialog :aria-labelledby="dialogId" ref="dialog">
                <p>{{ enclosure.description }}</p>
            </modal-dialog>
        </template>
        <div class="geomap-viewer-container">
            <GeoJsonViewer
                :model-value="viewerModel"
                pmtiles-url="https://storage.googleapis.com/richpod-shortbread-tiles/shortbread-europe.pmtiles"
                :bbox-padding="[50, 75, 50, 50]"
            />
        </div>
    </div>
</template>
<script setup lang="ts">
import type { GeoMap } from "@/graphql/generated.ts";
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { GeoJsonViewer } from "@richpods/tiny-geojson-tool";
import type { EditorFeatureCollection } from "@richpods/tiny-geojson-tool";
import EnclosureHeader from "./EnclosureHeader.vue";
import ModalDialog from "../ModalDialog.vue";

const props = defineProps<{
    enclosure: GeoMap;
}>();
const { t } = useI18n();

const dialogId = `dialog-geomap-${Math.floor(Math.random() * 100)}`;
const descriptionDialog = useTemplateRef("dialog");
function toggleDescriptionDialog() {
    descriptionDialog.value?.toggle();
}

const viewerModel = computed<EditorFeatureCollection>(() => {
    const raw = props.enclosure.geoJSON;
    if (raw?.type === "FeatureCollection" && Array.isArray(raw.features)) {
        const result: EditorFeatureCollection = {
            type: "FeatureCollection",
            features: raw.features.map((f: Record<string, unknown>) => ({
                ...f,
                id: typeof f.id === "string" ? f.id : crypto.randomUUID(),
            })),
        } as EditorFeatureCollection;
        if (Array.isArray(raw.bbox)) {
            result.bbox = raw.bbox as EditorFeatureCollection["bbox"];
        }
        return result;
    }
    return { type: "FeatureCollection", features: [] };
});
</script>
<style scoped lang="scss">
.mapDescription {
    position: absolute;
    bottom: 15px;
    left: 20px;
    z-index: 2;
}

.geo-map-enclosure {
    height: 100%;
    display: flex;
    flex-direction: column;

    h1 {
        margin: 0;
    }

    .geomap-viewer-container {
        width: 100%;
        flex: 1;
        min-height: 0;

        :deep(.tge-viewer) {
            height: 100%;
        }
    }
}
</style>
