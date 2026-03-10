<template>
    <div class="interactive-chart-enclosure">
        <enclosure-header :enclosure="enclosure" />
        <div class="chart-container" :style="containerStyle">
            <echarts-sandbox ref="chartRef" :style="sandboxStyle" @ready="onSandboxReady" />
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from "vue";
import "@richpods/echarts-sandbox";
import type { InteractiveChart } from "@/graphql/generated.ts";
import { plainDataToECharts, type PlainDataChartType } from "../../utils/plainDataToECharts";
import EnclosureHeader from "./EnclosureHeader.vue";

const props = defineProps<{
    enclosure: InteractiveChart;
}>();

const chartRef = ref<HTMLElement | null>(null);
const sandboxReady = ref(false);

// Parse aspect ratio from metadata, default to 16:9
const aspectRatioCss = computed(() => {
    const chart = props.enclosure.chart as Record<string, unknown>;
    const metadata = chart?.metadata as { aspectRatio?: string } | undefined;
    const ratio = metadata?.aspectRatio ?? "16:9";
    const parts = ratio.split(":");
    const w = Number(parts[0]) || 16;
    const h = Number(parts[1]) || 9;
    return `${w} / ${h}`;
});

const containerStyle = computed(() => ({
    width: "100%",
    aspectRatio: aspectRatioCss.value,
    maxHeight:
        "calc(100dvh - var(--richpod-header-height, 65px) - var(--richpod-controls-height, 100px) - 80px)",
}));

const sandboxStyle = computed(() => ({
    width: "100%",
    height: "100%",
}));

// Get ECharts option from enclosure
function getEChartsOption(): Record<string, unknown> {
    const chart = props.enclosure.chart as Record<string, unknown>;

    if (!chart) {
        console.warn("No chart data in enclosure");
        return {};
    }

    // Use explicit chartFormat field to determine format
    if (props.enclosure.chartFormat === "PLAIN_DATA") {
        // Convert plain-data to ECharts
        // Plain-data: chart = { data: [...], metadata: { type, aspectRatio } }
        const metadata = chart.metadata as {
            type: PlainDataChartType;
            aspectRatio: string;
        };
        return plainDataToECharts({
            data: chart.data as (string | number)[][],
            metadata,
        });
    } else {
        // ECharts format: chart = { series: [...], xAxis: {...}, ..., metadata: {...} }
        // Remove metadata before passing to ECharts
        const { metadata, ...echartsConfig } = chart;
        return echartsConfig;
    }
}

function updateChart() {
    if (!chartRef.value || !sandboxReady.value) return;

    const sandbox = chartRef.value as unknown as {
        setOption: (opt: Record<string, unknown>) => void;
        clear: () => void;
    };

    try {
        const option = getEChartsOption();
        // Deep clone to avoid Proxy serialization issues with postMessage
        const plainOption = JSON.parse(JSON.stringify(option));
        sandbox.clear();
        sandbox.setOption(plainOption);
    } catch (e) {
        console.error("Failed to render chart:", e);
    }
}

function onSandboxReady() {
    sandboxReady.value = true;
    updateChart();
}

onMounted(() => {
    // Try to update after a short delay if ready event doesn't fire
    nextTick(() => {
        setTimeout(() => {
            if (!sandboxReady.value) {
                sandboxReady.value = true;
                updateChart();
            }
        }, 500);
    });
});

// Watch for enclosure changes
watch(
    () => props.enclosure.chart,
    () => {
        updateChart();
    },
    { deep: true },
);
</script>
<style lang="scss" scoped>
.chart-container {
    overflow: hidden;
}
</style>
