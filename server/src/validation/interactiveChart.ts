import Joi from "joi";
import { safeJson } from "./safeJson.js";
import { chapterTitleSchema, chapterDescriptionSchema } from "./validator.js";

const hasNonEmptyContainer = (value: unknown): boolean => {
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    if (value !== null && typeof value === "object") {
        return Object.keys(value).length > 0;
    }
    return false;
};

export const ChartFormat = {
    PLAIN_DATA: "PLAIN_DATA",
    ECHARTS: "ECHARTS",
} as const;

export type ChartFormatValue = (typeof ChartFormat)[keyof typeof ChartFormat];

export const PlainDataChartType = {
    BAR_CHART: "BAR_CHART",
    LINE_CHART: "LINE_CHART",
    SMOOTH_LINE_CHART: "SMOOTH_LINE_CHART",
    AREA_CHART: "AREA_CHART",
    PIE_CHART: "PIE_CHART",
    SCATTER_CHART: "SCATTER_CHART",
} as const;

export type PlainDataChartTypeValue = (typeof PlainDataChartType)[keyof typeof PlainDataChartType];

/**
 * Chart format is explicitly specified in `chartFormat` field.
 *
 * Plain-data format (chartFormat: "plain-data"):
 *   chart = { data: [...], metadata: { type, aspectRatio } }
 *
 * ECharts format (chartFormat: "echarts"):
 *   chart = { series: [...], xAxis: {...}, ..., metadata: { aspectRatio } }
 */

export type PlainDataChart = {
    data: (string | number)[][];
    metadata: {
        type: PlainDataChartTypeValue;
        aspectRatio: string;
    };
};

export type EChartsChart = Record<string, unknown> & {
    metadata: {
        aspectRatio: string;
    };
};

export type InteractiveChartEnclosure = {
    title: string;
    description?: string;
    chartFormat: ChartFormatValue;
    chart: PlainDataChart | EChartsChart;
};

const aspectRatioSchema = Joi.string()
    .pattern(/^[1-9]\d*:[1-9]\d*$/)
    .required()
    .messages({
        "string.pattern.base":
            'Aspect ratio must be in format "width:height" with positive integers (e.g., "16:9")',
        "any.required": "Aspect ratio is required",
    });

const metadataSchema = Joi.object({
    aspectRatio: aspectRatioSchema,
}).required().messages({
    "any.required": "Metadata is required",
});

const plainDataMetadataSchema = metadataSchema.keys({
    type: Joi.string()
        .valid(
            PlainDataChartType.BAR_CHART,
            PlainDataChartType.LINE_CHART,
            PlainDataChartType.SMOOTH_LINE_CHART,
            PlainDataChartType.AREA_CHART,
            PlainDataChartType.PIE_CHART,
            PlainDataChartType.SCATTER_CHART,
        )
        .required()
        .messages({
            "any.only":
                'Chart type must be one of: "BAR_CHART", "LINE_CHART", "SMOOTH_LINE_CHART", "AREA_CHART", "PIE_CHART", "SCATTER_CHART"',
            "any.required": "Chart type is required",
        }),
});

/**
 * Validates the 2D data array for plain data charts.
 * Rules:
 * - Must have at least 2 rows and 2 columns
 * - First row (headers, except [0][0]) must be strings
 * - First column (row labels, except [0][0]) must be strings
 * - All other cells must be finite numbers
 */
const plainDataArraySchema = Joi.array()
    .items(Joi.array())
    .min(2)
    .custom((value: unknown[][], helpers) => {
        if (!Array.isArray(value) || value.length < 2) {
            return helpers.error("array.min");
        }

        const numCols = value[0].length;
        if (numCols < 2) {
            return helpers.error("data.minColumns");
        }

        // Check all rows have consistent length
        for (let i = 0; i < value.length; i++) {
            if (!Array.isArray(value[i]) || value[i].length !== numCols) {
                return helpers.error("data.inconsistentColumns", { row: i });
            }
        }

        // Validate header row (first row, except [0][0])
        for (let col = 1; col < numCols; col++) {
            if (typeof value[0][col] !== "string") {
                return helpers.error("data.headerNotString", { col });
            }
        }

        // Validate first column (row labels, except [0][0]) and data cells
        for (let row = 1; row < value.length; row++) {
            // First column must be strings
            if (typeof value[row][0] !== "string") {
                return helpers.error("data.labelNotString", { row });
            }

            // Data cells must be finite numbers
            for (let col = 1; col < numCols; col++) {
                const cell = value[row][col];
                if (typeof cell !== "number" || !Number.isFinite(cell)) {
                    return helpers.error("data.cellNotNumber", { row, col });
                }
            }
        }

        return value;
    })
    .messages({
        "array.min": "Data must have at least 2 rows",
        "data.minColumns": "Data must have at least 2 columns",
        "data.inconsistentColumns": "All rows must have the same number of columns (row {{#row}})",
        "data.headerNotString": "Header at column {{#col}} must be a string",
        "data.labelNotString": "Row label at row {{#row}} must be a string",
        "data.cellNotNumber": "Data cell at row {{#row}}, column {{#col}} must be a finite number",
    });

const titleSchema = chapterTitleSchema;

const descriptionSchema = chapterDescriptionSchema;

const chartFormatSchema = Joi.string()
    .valid(ChartFormat.PLAIN_DATA, ChartFormat.ECHARTS)
    .required()
    .messages({
        "any.only": 'Chart format must be either "plain-data" or "echarts"',
        "any.required": "Chart format is required",
    });

/**
 * Plain-data chart schema: chart = { data: [...], metadata: { type, aspectRatio } }
 */
const plainDataChartObjectSchema = safeJson("chart").keys({
    data: plainDataArraySchema.required().messages({
        "any.required": "Data array is required",
    }),
    metadata: plainDataMetadataSchema,
});

/**
 * ECharts chart schema: chart = { series/dataset, ..., metadata: { aspectRatio } }
 * The ECharts config is validated for:
 * - Safe JSON (no prototype pollution)
 * - Has non-empty series or dataset
 * - Has metadata with aspectRatio
 */
const echartsChartObjectSchema = safeJson("chart")
    .custom((value: Record<string, unknown>, helpers) => {
        // Must have series or dataset
        const hasData =
            hasNonEmptyContainer(value.series) || hasNonEmptyContainer(value.dataset);
        if (!hasData) {
            return helpers.error("chart.noData");
        }

        // Must have metadata with aspectRatio
        const metadata = value.metadata as Record<string, unknown> | undefined;
        if (!metadata || typeof metadata !== "object") {
            return helpers.error("chart.noMetadata");
        }

        const aspectRatio = metadata.aspectRatio;
        if (typeof aspectRatio !== "string" || !/^[1-9]\d*:[1-9]\d*$/.test(aspectRatio)) {
            return helpers.error("chart.invalidAspectRatio");
        }

        return value;
    })
    .required()
    .messages({
        "any.required": "Chart object is required",
        "chart.noData": "Chart must have a non-empty series or dataset",
        "chart.noMetadata": "Chart must have metadata object",
        "chart.invalidAspectRatio": 'Aspect ratio must be in format "width:height" with positive integers (e.g., "16:9")',
    });

/**
 * Interactive chart enclosure schema.
 * Uses chartFormat field to determine validation rules for chart field.
 */
export const interactiveChartEnclosureSchema = Joi.object({
    title: titleSchema,
    description: descriptionSchema,
    chartFormat: chartFormatSchema,
    chart: Joi.when("chartFormat", {
        is: ChartFormat.PLAIN_DATA,
        then: plainDataChartObjectSchema,
        otherwise: echartsChartObjectSchema,
    }).required().messages({
        "any.required": "Chart field is required",
    }),
});
