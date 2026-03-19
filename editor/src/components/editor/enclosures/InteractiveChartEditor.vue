<template>
    <div class="space-y-4">
        <!-- Description -->
        <div>
            <label for="chart-description" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t("chartEditor.descriptionLabel") }}
            </label>
            <textarea
                id="chart-description"
                v-model="chartDescription"
                rows="2"
                maxlength="1000"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                :placeholder="t('chartEditor.descriptionPlaceholder')"
                @blur="handleBlur"
            ></textarea>
            <div class="text-xs text-gray-500 text-right">{{ chartDescription.length }}/1000</div>
        </div>

        <!-- Mode indicator -->
        <div class="bg-gray-50 p-3 rounded-md">
            <span class="text-sm font-medium text-gray-700">
                {{
                    t("chartEditor.modeLabel", {
                        mode: isAdvancedMode ? t("chartEditor.modeAdvanced") : t("chartEditor.modeBasic"),
                    })
                }}
            </span>
        </div>

        <!-- Basic Mode: Spreadsheet Editor -->
        <template v-if="!isAdvancedMode">
            <!-- Chart Type Selector -->
            <div>
                <label for="chart-type" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("chartEditor.chartType") }}
                </label>
                <select
                    id="chart-type"
                    v-model="selectedChartType"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    @change="handleBlur"
                >
                    <option value="BAR_CHART">{{ t("chartEditor.barChart") }}</option>
                    <option value="LINE_CHART">{{ t("chartEditor.lineChart") }}</option>
                    <option value="SMOOTH_LINE_CHART">{{ t("chartEditor.smoothLineChart") }}</option>
                    <option value="AREA_CHART">{{ t("chartEditor.areaChart") }}</option>
                    <option value="PIE_CHART">{{ t("chartEditor.pieChart") }}</option>
                    <option value="SCATTER_CHART">{{ t("chartEditor.scatterChart") }}</option>
                </select>
            </div>

            <!-- Aspect Ratio -->
            <div>
                <label for="aspect-ratio" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("chartEditor.aspectRatio") }}
                </label>
                <select
                    id="aspect-ratio"
                    v-model="aspectRatio"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    @change="handleBlur"
                >
                    <option value="16:9">16:9 ({{ t("chartEditor.widescreen") }})</option>
                    <option value="4:3">4:3 ({{ t("chartEditor.standard") }})</option>
                    <option value="1:1">1:1 ({{ t("chartEditor.square") }})</option>
                    <option value="3:2">3:2</option>
                    <option value="21:9">21:9 ({{ t("chartEditor.ultraWide") }})</option>
                </select>
            </div>

            <!-- Spreadsheet -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="block text-sm font-medium text-gray-700"> {{ t("chartEditor.dataLabel") }} </label>
                    <div class="flex flex-wrap gap-2">
                        <button
                            type="button"
                            @click="addColumn"
                            class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            {{ t("chartEditor.addColumn") }}
                        </button>
                        <button
                            type="button"
                            @click="addRow"
                            class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            {{ t("chartEditor.addRow") }}
                        </button>
                        <button
                            type="button"
                            @click="removeColumn"
                            :disabled="spreadsheetData[0]?.length <= 2"
                            class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {{ t("chartEditor.removeColumn") }}
                        </button>
                        <button
                            type="button"
                            @click="removeRow"
                            :disabled="spreadsheetData.length <= 2"
                            class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {{ t("chartEditor.removeRow") }}
                        </button>
                    </div>
                </div>
                <TinySpreadsheetEditor
                    ref="spreadsheetRef"
                    v-model="spreadsheetData"
                    :headers="Headers.BOTH"
                    :cell-data="CellData.NUMBER"
                    :locale-formatting="true"
                    :validator="cellValidator"
                    @update:model-value="handleSpreadsheetUpdate"
                />
                <p class="text-xs text-gray-500 mt-1">
                    {{ t("chartEditor.spreadsheetHint") }}
                </p>
            </div>

        </template>

        <!-- Advanced Mode: JSON Editor -->
        <template v-else>
            <!-- Aspect Ratio (also in advanced mode) -->
            <div>
                <label for="aspect-ratio-adv" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("chartEditor.aspectRatio") }}
                </label>
                <select
                    id="aspect-ratio-adv"
                    v-model="aspectRatio"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    @change="handleBlur"
                >
                    <option value="16:9">16:9 ({{ t("chartEditor.widescreen") }})</option>
                    <option value="4:3">4:3 ({{ t("chartEditor.standard") }})</option>
                    <option value="1:1">1:1 ({{ t("chartEditor.square") }})</option>
                    <option value="3:2">3:2</option>
                    <option value="21:9">21:9 ({{ t("chartEditor.ultraWide") }})</option>
                </select>
            </div>

            <!-- JSON Textarea -->
            <div>
                <label for="chart-json" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t("chartEditor.echartsConfigLabel") }}
                </label>
                <textarea
                    id="chart-json"
                    v-model="jsonTextInput"
                    rows="12"
                    class="w-full px-3 py-2 border rounded-md text-sm font-mono"
                    :class="jsonError ? 'border-red-300' : 'border-gray-300'"
                    @blur="handleJsonBlur"
                ></textarea>
                <p v-if="jsonError" class="text-xs text-red-600 mt-1">{{ jsonError }}</p>
            </div>

            <!-- Upload JSON File -->
            <div>
                <input
                    id="json-upload"
                    type="file"
                    accept="application/json,.json"
                    class="hidden"
                    @change="handleJsonUpload"
                />
                <label
                    for="json-upload"
                    class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 cursor-pointer"
                >
                    <Icon icon="ion:cloud-upload-outline" class="w-4 h-4 mr-2" />
                    {{ t("chartEditor.uploadJsonFile") }}
                </label>
            </div>
        </template>

        <!-- Chart Preview -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ t("chartEditor.preview") }}</label>
            <div
                class="border border-gray-200 rounded-md bg-gray-50 overflow-hidden"
                :style="previewContainerStyle"
            >
                <echarts-sandbox ref="previewRef" :style="previewSandboxStyle" />
            </div>
        </div>

        <!-- Advanced Mode switch (only in basic mode) -->
        <div
            v-if="canSwitchMode && !advancedModeHidden"
            class="border border-gray-200 rounded-md p-3 text-sm text-gray-500"
        >
            <p class="font-medium mb-1 text-gray-600">{{ t("chartEditor.advancedModeTitle") }}</p>
            <p class="text-xs mb-3">
                {{ t("chartEditor.advancedModeHint") }}
            </p>
            <div class="flex gap-2">
                <button
                    type="button"
                    @click="handleModeSwitch"
                    class="px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700"
                >
                    {{ t("chartEditor.switchToAdvanced") }}
                </button>
                <button
                    type="button"
                    @click="advancedModeHidden = true"
                    class="px-3 py-1.5 text-gray-500 text-xs rounded hover:bg-gray-100"
                >
                    {{ t("chartEditor.useSpreadsheet") }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@iconify/vue";
import { storeToRefs } from "pinia";

const { t } = useI18n();
import {
    TinySpreadsheetEditor,
    Headers,
    CellData,
    type CellValue,
    type ValidationResult,
    type GridData,
} from "@richpods/tiny-spreadsheet-editor";
import "@richpods/tiny-spreadsheet-editor/styles";
import "@richpods/echarts-sandbox";
import { useRichPodStore } from "@/stores/useRichPodStore";
import { useValidation } from "@/composables/useValidation";
import { plainDataToECharts, type PlainDataChartType } from "@player/utils/plainDataToECharts";
import {
    isPlainDataEnclosure,
    isEChartsEnclosure,
    ChartFormat,
    type PlainDataChartMetadata,
} from "@/types/editor";

const richpodStore = useRichPodStore();
const { currentChapter } = storeToRefs(richpodStore);
const { runValidation } = useValidation();

const spreadsheetRef = ref<InstanceType<typeof TinySpreadsheetEditor> | null>(null);
const previewRef = ref<HTMLElement | null>(null);
const jsonError = ref<string | null>(null);
const jsonTextInput = ref("");

// Helper to get chart object from enclosure
function getChartObject(): Record<string, unknown> | undefined {
    const chapter = currentChapter.value;
    if (chapter?.enclosure.__typename !== "InteractiveChart") return undefined;
    return chapter.enclosure.chart as Record<string, unknown> | undefined;
}

// Determine if existing enclosure is advanced (ECharts) mode or basic (plain-data) mode
// Plain-data: chart = { data: [...], metadata: {...} }
// ECharts: chart = { series: [...], ..., metadata: {...} }
const existingChartMode = computed<"basic" | "advanced" | null>(() => {
    const chapter = currentChapter.value;
    if (chapter?.enclosure.__typename !== "InteractiveChart") return null;

    const enclosure = chapter.enclosure;

    // Check for plain-data format (chart.data exists)
    if (isPlainDataEnclosure(enclosure)) {
        return "basic";
    }
    // Check for ECharts format (chart has series/dataset)
    if (isEChartsEnclosure(enclosure)) {
        return "advanced";
    }
    return null;
});

const isAdvancedMode = ref(false);
const advancedModeHidden = ref(false);

// Can only switch mode on new chapters (not yet saved)
const isNewChapter = computed(() => {
    const chapter = currentChapter.value;
    return chapter?._isNew === true;
});

// Can switch from basic to advanced mode only on new chapters
const canSwitchMode = computed(() =>
    isNewChapter.value && !isAdvancedMode.value && existingChartMode.value !== "advanced"
);

// Initialize mode based on existing data
onMounted(() => {
    if (existingChartMode.value === "advanced") {
        isAdvancedMode.value = true;
        // Initialize JSON text from existing data (excluding metadata)
        const chart = getChartObject();
        if (chart) {
            // Remove metadata for display, user shouldn't edit it directly
            const { metadata, ...echartsConfig } = chart;
            jsonTextInput.value = JSON.stringify(echartsConfig, null, 2);
        }
    }
    updatePreview();
});

// Chart description
const chartDescription = computed({
    get: () => {
        const chapter = currentChapter.value;
        if (chapter?.enclosure.__typename !== "InteractiveChart") return "";
        return (chapter.enclosure.description as string) ?? "";
    },
    set: (value: string) => {
        richpodStore.updateCurrentChapter((chapter) => {
            if (chapter.enclosure.__typename !== "InteractiveChart") return chapter;
            return {
                ...chapter,
                enclosure: { ...chapter.enclosure, description: value },
            };
        });
    },
});

// Chart type (basic mode) - stored at chart.metadata.type
const selectedChartType = computed({
    get: () => {
        const chart = getChartObject();
        const metadata = chart?.metadata as PlainDataChartMetadata | undefined;
        return metadata?.type ?? "BAR_CHART";
    },
    set: (value: string) => {
        richpodStore.updateCurrentChapter((chapter) => {
            if (chapter.enclosure.__typename !== "InteractiveChart") return chapter;
            const chart = (chapter.enclosure.chart ?? {}) as Record<string, unknown>;
            const existingMetadata = (chart.metadata ?? { aspectRatio: "16:9" }) as PlainDataChartMetadata;
            return {
                ...chapter,
                enclosure: {
                    ...chapter.enclosure,
                    chart: {
                        ...chart,
                        metadata: { ...existingMetadata, type: value },
                    },
                },
            };
        });
    },
});

// Aspect ratio - stored at chart.metadata.aspectRatio
const aspectRatio = computed({
    get: () => {
        const chart = getChartObject();
        const metadata = chart?.metadata as { aspectRatio?: string } | undefined;
        return metadata?.aspectRatio ?? "16:9";
    },
    set: (value: string) => {
        richpodStore.updateCurrentChapter((chapter) => {
            if (chapter.enclosure.__typename !== "InteractiveChart") return chapter;
            const chart = (chapter.enclosure.chart ?? {}) as Record<string, unknown>;
            const existingMetadata = (chart.metadata ?? {}) as Record<string, unknown>;
            return {
                ...chapter,
                enclosure: {
                    ...chapter.enclosure,
                    chart: {
                        ...chart,
                        metadata: { ...existingMetadata, aspectRatio: value },
                    },
                },
            };
        });
    },
});

// Spreadsheet data (basic mode) - stored at chart.data
const spreadsheetData = computed({
    get: (): GridData => {
        const chapter = currentChapter.value;
        if (chapter?.enclosure.__typename !== "InteractiveChart") {
            return getDefaultSpreadsheetData();
        }
        if (isPlainDataEnclosure(chapter.enclosure)) {
            const chart = chapter.enclosure.chart as { data?: GridData };
            return chart?.data ?? getDefaultSpreadsheetData();
        }
        return getDefaultSpreadsheetData();
    },
    set: (value: GridData) => {
        const normalized = normalizeSpreadsheetData(value);
        richpodStore.updateCurrentChapter((chapter) => {
            if (chapter.enclosure.__typename !== "InteractiveChart") return chapter;
            const chart = (chapter.enclosure.chart ?? {}) as Record<string, unknown>;
            return {
                ...chapter,
                enclosure: {
                    ...chapter.enclosure,
                    chart: {
                        ...chart,
                        data: normalized,
                    },
                },
            };
        });
    },
});

function getDefaultSpreadsheetData(): GridData {
    return [
        ["", t("chartEditor.defaultSeries")],
        [t("chartEditor.defaultCategoryA"), 10],
        [t("chartEditor.defaultCategoryB"), 20],
        [t("chartEditor.defaultCategoryC"), 30],
    ];
}

function handleBlur() {
    runValidation();
    updatePreview();
}

function handleSpreadsheetUpdate(data: GridData) {
    spreadsheetData.value = data;
    updatePreview();
}

function handleJsonBlur() {
    jsonError.value = null;
    const text = jsonTextInput.value.trim();

    if (!text) {
        jsonError.value = t("chartEditor.jsonRequired");
        return;
    }

    try {
        const parsed = JSON.parse(text);

        // Security check for forbidden keys
        if (containsForbiddenKey(parsed)) {
            jsonError.value = t("chartEditor.jsonForbiddenKeys");
            return;
        }

        // Validate has series or dataset
        const hasSeries =
            (Array.isArray(parsed.series) && parsed.series.length > 0) ||
            (typeof parsed.series === "object" &&
                parsed.series !== null &&
                Object.keys(parsed.series).length > 0);
        const hasDataset =
            (Array.isArray(parsed.dataset) && parsed.dataset.length > 0) ||
            (typeof parsed.dataset === "object" &&
                parsed.dataset !== null &&
                Object.keys(parsed.dataset).length > 0);

        if (!hasSeries && !hasDataset) {
            jsonError.value = t("chartEditor.jsonMustHaveSeries");
            return;
        }

        // Store ECharts config with metadata merged in
        richpodStore.updateCurrentChapter((chapter) => {
            if (chapter.enclosure.__typename !== "InteractiveChart") return chapter;
            return {
                ...chapter,
                enclosure: {
                    ...chapter.enclosure,
                    chartFormat: ChartFormat.ECHARTS,
                    chart: {
                        ...parsed,
                        metadata: { aspectRatio: aspectRatio.value },
                    },
                },
            };
        });

        updatePreview();
        runValidation();
    } catch (e) {
        jsonError.value = t("chartEditor.invalidJson", { error: (e as Error).message });
    }
}

function handleJsonUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        jsonTextInput.value = e.target?.result as string;
        handleJsonBlur();
    };
    reader.readAsText(file);

    // Reset file input so the same file can be selected again
    (event.target as HTMLInputElement).value = "";
}

function handleModeSwitch() {
    if (!canSwitchMode.value) return;

    // Warn user about data in spreadsheet
    const hasData = spreadsheetData.value.length > 1;
    let message = t("chartEditor.switchModeWarning");

    if (hasData) {
        message += "\n\n" + t("chartEditor.switchModeDataWarning");
    } else {
        message += ` ${t("chartEditor.switchModeContinue")}`;
    }

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    isAdvancedMode.value = true;

    // Convert current spreadsheet to ECharts
    const option = plainDataToECharts({
        data: spreadsheetData.value,
        metadata: {
            type: selectedChartType.value as PlainDataChartType,
            aspectRatio: aspectRatio.value,
        },
    });

    jsonTextInput.value = JSON.stringify(option, null, 2);

    // Update enclosure to ECharts format (merge metadata into ECharts config)
    richpodStore.updateCurrentChapter((chapter) => {
        if (chapter.enclosure.__typename !== "InteractiveChart") return chapter;
        return {
            ...chapter,
            enclosure: {
                ...chapter.enclosure,
                chartFormat: ChartFormat.ECHARTS,
                chart: {
                    ...option,
                    metadata: { aspectRatio: aspectRatio.value },
                },
            },
        };
    });

    updatePreview();
}

// Cell validator for spreadsheet
function cellValidator(value: CellValue, row: number, col: number): ValidationResult {
    // Header row and label column can be strings
    if (row === 0 || col === 0) {
        return { valid: true };
    }
    // Data cells must be numbers
    if (typeof value === "number" && Number.isFinite(value)) {
        return { valid: true };
    }
    return { valid: false, message: t("chartEditor.mustBeNumber") };
}

function addColumn() {
    spreadsheetRef.value?.addColumn();
}

function addRow() {
    spreadsheetRef.value?.addRow();
}

function removeColumn() {
    if (spreadsheetData.value[0]?.length > 2) {
        spreadsheetRef.value?.removeColumn(spreadsheetData.value[0].length - 1);
    }
}

function removeRow() {
    if (spreadsheetData.value.length > 2) {
        spreadsheetRef.value?.removeRow(spreadsheetData.value.length - 1);
    }
}

function normalizeSpreadsheetData(data: GridData): GridData {
    return data.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
            if (rowIndex === 0 || colIndex === 0) {
                if (cell === null || cell === undefined) return "";
                return typeof cell === "string" ? cell : String(cell);
            }
            if (cell === "" || cell === null || cell === undefined) return 0;
            if (typeof cell === "number" && Number.isFinite(cell)) return cell;
            if (typeof cell === "string") {
                const num = Number(cell);
                if (Number.isFinite(num)) return num;
            }
            return cell;
        }),
    );
}

// Preview styling
const previewContainerStyle = computed(() => {
    const [w, h] = aspectRatio.value.split(":").map(Number);
    return {
        position: "relative" as const,
        width: "100%",
        maxWidth: "360px",
        aspectRatio: `${w} / ${h}`,
    };
});

const previewSandboxStyle = computed(() => ({
    position: "absolute" as const,
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
}));

function updatePreview() {
    nextTick(() => {
        if (!previewRef.value) return;

        const sandbox = previewRef.value as unknown as {
            setOption: (opt: Record<string, unknown>) => void;
            clear: () => void;
        };

        try {
            sandbox.clear();

            if (isAdvancedMode.value) {
                const chart = getChartObject();
                if (chart) {
                    // Deep clone to avoid Proxy serialization issues with postMessage
                    // Remove metadata before passing to ECharts
                    const { metadata, ...echartsConfig } = JSON.parse(JSON.stringify(chart));
                    sandbox.setOption(echartsConfig);
                }
            } else {
                const option = plainDataToECharts({
                    // Deep clone to avoid Proxy serialization issues with postMessage
                    data: JSON.parse(JSON.stringify(spreadsheetData.value)),
                    metadata: {
                        type: selectedChartType.value as PlainDataChartType,
                        aspectRatio: aspectRatio.value,
                    },
                });
                sandbox.setOption(option);
            }
        } catch (e) {
            console.error("Preview error:", e);
        }
    });
}

// Watch for data changes to update preview
watch(
    [spreadsheetData, selectedChartType, aspectRatio],
    () => {
        if (!isAdvancedMode.value) {
            updatePreview();
        }
    },
    { deep: true },
);

// Security helper
function containsForbiddenKey(obj: unknown): boolean {
    const forbidden = new Set(["prototype", "__proto__", "constructor", "function"]);

    function check(value: unknown): boolean {
        if (value === null || typeof value !== "object") return false;
        if (Array.isArray(value)) {
            return value.some(check);
        }
        for (const key of Object.keys(value)) {
            if (forbidden.has(key)) return true;
            if (check((value as Record<string, unknown>)[key])) return true;
        }
        return false;
    }

    return check(obj);
}
</script>

<style lang="scss" scoped>
// Additional styling if needed
</style>
