export type PlainDataChartType =
    | "BAR_CHART"
    | "LINE_CHART"
    | "SMOOTH_LINE_CHART"
    | "AREA_CHART"
    | "PIE_CHART"
    | "SCATTER_CHART";

export type PlainDataInput = {
    data: (string | number)[][];
    metadata: {
        type: PlainDataChartType;
        aspectRatio: string;
    };
};

export type EChartsOption = Record<string, unknown>;

/**
 * Converts plain-data format to ECharts configuration.
 *
 * Data format:
 * - [0][0]: ignored (corner cell)
 * - [0][1..n]: column headers (series names)
 * - [1..m][0]: row labels (category axis values)
 * - [1..m][1..n]: numeric data values
 */
export function plainDataToECharts(input: PlainDataInput): EChartsOption {
    const { data, metadata } = input;
    const { type } = metadata;

    // Extract headers (series names) from first row, skip [0][0]
    const seriesNames = data[0].slice(1) as string[];

    // Extract categories from first column, skip [0][0]
    const categories = data.slice(1).map((row) => row[0] as string);

    // Extract data values - each series is a column
    const seriesData: number[][] = [];
    for (let col = 1; col < data[0].length; col++) {
        const series: number[] = [];
        for (let row = 1; row < data.length; row++) {
            series.push(data[row][col] as number);
        }
        seriesData.push(series);
    }

    // Build ECharts option based on chart type
    switch (type) {
        case "PIE_CHART":
            return buildPieChart(categories, seriesNames, seriesData);
        case "BAR_CHART":
            return buildBarChart(categories, seriesNames, seriesData);
        case "LINE_CHART":
            return buildLineChart(categories, seriesNames, seriesData, false, false);
        case "SMOOTH_LINE_CHART":
            return buildLineChart(categories, seriesNames, seriesData, true, false);
        case "AREA_CHART":
            return buildLineChart(categories, seriesNames, seriesData, true, true);
        case "SCATTER_CHART":
            return buildScatterChart(categories, seriesNames, seriesData);
        default:
            return buildBarChart(categories, seriesNames, seriesData);
    }
}

function buildPieChart(
    categories: string[],
    seriesNames: string[],
    seriesData: number[][],
): EChartsOption {
    // For pie chart, use first series only
    const pieData = categories.map((name, idx) => ({
        name,
        value: seriesData[0]?.[idx] ?? 0,
    }));

    return {
        tooltip: { trigger: "item" },
        legend: { orient: "vertical", left: "left" },
        series: [
            {
                name: seriesNames[0] ?? "Data",
                type: "pie",
                radius: "50%",
                data: pieData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: "rgba(0, 0, 0, 0.5)",
                    },
                },
            },
        ],
    };
}

function buildBarChart(
    categories: string[],
    seriesNames: string[],
    seriesData: number[][],
): EChartsOption {
    return {
        tooltip: { trigger: "axis" },
        legend: { data: seriesNames },
        xAxis: {
            type: "category",
            data: categories,
        },
        yAxis: { type: "value" },
        series: seriesNames.map((name, idx) => ({
            name,
            type: "bar",
            data: seriesData[idx] ?? [],
        })),
    };
}

function buildLineChart(
    categories: string[],
    seriesNames: string[],
    seriesData: number[][],
    smooth: boolean,
    area: boolean,
): EChartsOption {
    return {
        tooltip: { trigger: "axis" },
        legend: { data: seriesNames },
        xAxis: {
            type: "category",
            data: categories,
        },
        yAxis: { type: "value" },
        series: seriesNames.map((name, idx) => ({
            name,
            type: "line",
            smooth,
            ...(area ? { areaStyle: {} } : {}),
            data: seriesData[idx] ?? [],
        })),
    };
}

function buildScatterChart(
    categories: string[],
    seriesNames: string[],
    seriesData: number[][],
): EChartsOption {
    // For scatter, treat categories as x-values (convert indices)
    // Each series shows data points with category index as x
    return {
        tooltip: { trigger: "item" },
        legend: { data: seriesNames },
        xAxis: {
            type: "category",
            data: categories,
        },
        yAxis: { type: "value" },
        series: seriesNames.map((name, idx) => ({
            name,
            type: "scatter",
            data: seriesData[idx] ?? [],
        })),
    };
}
