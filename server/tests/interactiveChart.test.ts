import { describe, it } from "node:test";
import assert from "node:assert";
import {
    interactiveChartEnclosureSchema,
    PlainDataChartType,
    ChartFormat,
} from "../src/validation/interactiveChart.js";

type LegacyPlainDataInput = {
    title?: unknown;
    description?: unknown;
    data?: unknown;
    metadata?: unknown;
};

type LegacyEChartsInput = {
    title?: unknown;
    description?: unknown;
    chart?: unknown;
    metadata?: unknown;
};

const plainDataChartSchema = {
    validate(value: LegacyPlainDataInput) {
        const chartPayload: Record<string, unknown> = {};
        if (value.data !== undefined) {
            chartPayload.data = value.data;
        }
        if (value.metadata !== undefined) {
            chartPayload.metadata = value.metadata;
        }

        const payload: Record<string, unknown> = {
            chartFormat: ChartFormat.PLAIN_DATA,
            chart: chartPayload,
        };

        if (value.title !== undefined) {
            payload.title = value.title;
        }
        if (value.description !== undefined) {
            payload.description = value.description;
        }

        return interactiveChartEnclosureSchema.validate(payload);
    },
};

const echartsEnclosureSchema = {
    validate(value: LegacyEChartsInput) {
        const payload: Record<string, unknown> = {
            chartFormat: ChartFormat.ECHARTS,
        };

        if (value.title !== undefined) {
            payload.title = value.title;
        }
        if (value.description !== undefined) {
            payload.description = value.description;
        }

        if (value.chart !== undefined) {
            if (value.chart !== null && typeof value.chart === "object" && !Array.isArray(value.chart)) {
                const chartPayload: Record<string, unknown> = {
                    ...(value.chart as Record<string, unknown>),
                };
                if (value.metadata !== undefined) {
                    chartPayload.metadata = value.metadata;
                }
                payload.chart = chartPayload;
            } else {
                payload.chart = value.chart;
            }
        }

        return interactiveChartEnclosureSchema.validate(payload);
    },
};

describe("interactiveChart validation", () => {
    describe("PlainDataChartType", () => {
        it("should accept all six chart types", () => {
            const chartTypes = [
                "BAR_CHART",
                "LINE_CHART",
                "SMOOTH_LINE_CHART",
                "AREA_CHART",
                "PIE_CHART",
                "SCATTER_CHART",
            ];

            for (const chartType of chartTypes) {
                const result = plainDataChartSchema.validate({
                    title: "Test Chart",
                    data: [
                        ["", "A"],
                        ["Row", 10],
                    ],
                    metadata: {
                        type: chartType,
                        aspectRatio: "16:9",
                    },
                });
                assert.strictEqual(
                    result.error,
                    undefined,
                    `Should accept chart type: ${chartType}`,
                );
            }
        });
    });

    describe("plainDataChartSchema", () => {
        describe("valid plain data charts", () => {
            it("should accept a valid bar chart with minimal data", () => {
                const result = plainDataChartSchema.validate({
                    title: "Sales Data",
                    data: [
                        ["", "Q1", "Q2"],
                        ["Product A", 100, 200],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.strictEqual(result.error, undefined);
            });

            it("should accept a valid chart with description", () => {
                const result = plainDataChartSchema.validate({
                    title: "Revenue Chart",
                    description: "Quarterly revenue breakdown by region",
                    data: [
                        ["", "Q1", "Q2", "Q3"],
                        ["North", 100, 150, 200],
                        ["South", 80, 120, 180],
                    ],
                    metadata: {
                        type: PlainDataChartType.LINE_CHART,
                        aspectRatio: "4:3",
                    },
                });
                assert.strictEqual(result.error, undefined);
            });

            it("should accept all valid chart types", () => {
                const chartTypes = [
                    PlainDataChartType.BAR_CHART,
                    PlainDataChartType.LINE_CHART,
                    PlainDataChartType.SMOOTH_LINE_CHART,
                    PlainDataChartType.AREA_CHART,
                    PlainDataChartType.PIE_CHART,
                    PlainDataChartType.SCATTER_CHART,
                ];

                for (const chartType of chartTypes) {
                    const result = plainDataChartSchema.validate({
                        title: "Test Chart",
                        data: [
                            ["", "A"],
                            ["Row", 10],
                        ],
                        metadata: {
                            type: chartType,
                            aspectRatio: "1:1",
                        },
                    });
                    assert.strictEqual(
                        result.error,
                        undefined,
                        `Failed for chart type: ${chartType}`,
                    );
                }
            });

            it("should accept various valid aspect ratios", () => {
                const aspectRatios = ["16:9", "4:3", "1:1", "21:9", "100:1"];

                for (const aspectRatio of aspectRatios) {
                    const result = plainDataChartSchema.validate({
                        title: "Test",
                        data: [
                            ["", "A"],
                            ["B", 1],
                        ],
                        metadata: {
                            type: PlainDataChartType.BAR_CHART,
                            aspectRatio,
                        },
                    });
                    assert.strictEqual(
                        result.error,
                        undefined,
                        `Failed for aspect ratio: ${aspectRatio}`,
                    );
                }
            });

            it("should accept [0][0] cell as any type", () => {
                const testCases = [
                    ["", "Header"],
                    [null, "Header"],
                    ["Label", "Header"],
                    [0, "Header"],
                ];

                for (const firstRow of testCases) {
                    const result = plainDataChartSchema.validate({
                        title: "Test",
                        data: [firstRow, ["Row", 10]],
                        metadata: {
                            type: PlainDataChartType.BAR_CHART,
                            aspectRatio: "16:9",
                        },
                    });
                    assert.strictEqual(
                        result.error,
                        undefined,
                        `Failed for [0][0] value: ${firstRow[0]}`,
                    );
                }
            });
        });

        describe("invalid headers", () => {
            it("should reject non-string headers", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", 123, "Valid"],
                        ["Row", 10, 20],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Header.*column.*must be a string/);
            });

            it("should reject null headers", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", null, "Valid"],
                        ["Row", 10, 20],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });
        });

        describe("invalid row labels", () => {
            it("should reject non-string row labels", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", "Q1"],
                        [123, 10],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Row label.*must be a string/);
            });

            it("should reject null row labels", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", "Q1"],
                        [null, 10],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });
        });

        describe("invalid data cells", () => {
            it("should reject string data cells", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", "Q1"],
                        ["Row", "not a number"],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Data cell.*must be a finite number/);
            });

            it("should reject null data cells", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", "Q1"],
                        ["Row", null],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });

            it("should reject Infinity in data cells", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", "Q1"],
                        ["Row", Infinity],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });

            it("should reject NaN in data cells", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", "Q1"],
                        ["Row", NaN],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });
        });

        describe("invalid data structure", () => {
            it("should reject data with less than 2 rows", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [["", "Q1"]],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });

            it("should reject data with less than 2 columns", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [[""], ["Row"]],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /at least 2 columns/);
            });

            it("should reject inconsistent row lengths", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", "Q1", "Q2"],
                        ["Row", 10],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /same number of columns/);
            });

            it("should reject empty data array", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });
        });

        describe("invalid metadata", () => {
            it("should reject invalid chart type", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", "Q1"],
                        ["Row", 10],
                    ],
                    metadata: {
                        type: "Invalid Type",
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Chart type must be one of/);
            });

            it("should reject invalid aspect ratio format", () => {
                const invalidRatios = [
                    "16x9",
                    "16-9",
                    "16/9",
                    "abc:def",
                    ":9",
                    "16:",
                    "0:9",
                    "16:0",
                ];

                for (const aspectRatio of invalidRatios) {
                    const result = plainDataChartSchema.validate({
                        title: "Test",
                        data: [
                            ["", "Q1"],
                            ["Row", 10],
                        ],
                        metadata: {
                            type: PlainDataChartType.BAR_CHART,
                            aspectRatio,
                        },
                    });
                    assert.notStrictEqual(
                        result.error,
                        undefined,
                        `Should have rejected aspect ratio: ${aspectRatio}`,
                    );
                }
            });

            it("should reject missing metadata", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    data: [
                        ["", "Q1"],
                        ["Row", 10],
                    ],
                });
                assert.notStrictEqual(result.error, undefined);
            });
        });

        describe("title and description validation", () => {
            it("should reject missing title", () => {
                const result = plainDataChartSchema.validate({
                    data: [
                        ["", "Q1"],
                        ["Row", 10],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Title is required/);
            });

            it("should reject title exceeding 200 characters", () => {
                const result = plainDataChartSchema.validate({
                    title: "a".repeat(201),
                    data: [
                        ["", "Q1"],
                        ["Row", 10],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Title cannot exceed 200 characters/);
            });

            it("should reject description exceeding 1000 characters", () => {
                const result = plainDataChartSchema.validate({
                    title: "Test",
                    description: "a".repeat(1001),
                    data: [
                        ["", "Q1"],
                        ["Row", 10],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Description cannot exceed 1000 characters/);
            });
        });
    });

    describe("echartsEnclosureSchema", () => {
        describe("valid ECharts enclosures", () => {
            it("should accept a valid ECharts enclosure", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "ECharts Example",
                    chart: {
                        xAxis: { type: "category", data: ["Mon", "Tue", "Wed"] },
                        yAxis: { type: "value" },
                        series: [{ data: [120, 200, 150], type: "bar" }],
                    },
                    metadata: {
                        aspectRatio: "16:9",
                    },
                });
                assert.strictEqual(result.error, undefined);
            });

            it("should accept ECharts with description", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "Complex Chart",
                    description: "A complex ECharts visualization",
                    chart: {
                        series: [{ type: "line", data: [1, 2, 3] }],
                    },
                    metadata: {
                        aspectRatio: "4:3",
                    },
                });
                assert.strictEqual(result.error, undefined);
            });

            it("should accept chart with dataset object", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "Dataset Chart",
                    chart: {
                        dataset: {
                            source: [
                                ["product", "2015", "2016"],
                                ["Milk", 56, 89],
                            ],
                        },
                    },
                    metadata: {
                        aspectRatio: "1:1",
                    },
                });
                assert.strictEqual(result.error, undefined);
            });

            it("should accept chart with dataset array", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "Dataset Array Chart",
                    chart: {
                        dataset: [{ source: [[1, 2], [3, 4]] }],
                    },
                    metadata: {
                        aspectRatio: "1:1",
                    },
                });
                assert.strictEqual(result.error, undefined);
            });
        });

        describe("invalid ECharts enclosures", () => {
            it("should reject empty chart object", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "Empty Chart",
                    chart: {},
                    metadata: {
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Chart must have a non-empty series or dataset/);
            });

            it("should reject chart with empty series array", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "Empty Series",
                    chart: { series: [] },
                    metadata: {
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Chart must have a non-empty series or dataset/);
            });

            it("should reject chart with empty dataset object", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "Empty Dataset",
                    chart: { dataset: {} },
                    metadata: {
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Chart must have a non-empty series or dataset/);
            });

            it("should reject missing chart object", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "No Chart",
                    metadata: {
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });

            it("should reject missing title", () => {
                const result = echartsEnclosureSchema.validate({
                    chart: { series: [{ type: "bar" }] },
                    metadata: {
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /Title is required/);
            });

            it("should reject missing metadata", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "No Metadata",
                    chart: { series: [{ type: "bar" }] },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /metadata/i);
            });

            it("should reject prototype pollution attempts", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "Malicious Chart",
                    chart: JSON.parse('{"series":[{}],"__proto__":{"polluted":true}}'),
                    metadata: {
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
                assert.match(result.error!.message, /__proto__/);
            });

            it("should reject constructor key in chart", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "Malicious Chart",
                    chart: { series: [{}], constructor: {} },
                    metadata: {
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });

            it("should reject prototype key in nested chart", () => {
                const result = echartsEnclosureSchema.validate({
                    title: "Malicious Chart",
                    chart: {
                        series: [
                            {
                                prototype: { method: "bad" },
                            },
                        ],
                    },
                    metadata: {
                        aspectRatio: "16:9",
                    },
                });
                assert.notStrictEqual(result.error, undefined);
            });
        });
    });

    describe("interactiveChartEnclosureSchema (discriminated union)", () => {
        it("should accept valid plain data chart", () => {
            const result = interactiveChartEnclosureSchema.validate({
                title: "Plain Data",
                chartFormat: ChartFormat.PLAIN_DATA,
                chart: {
                    data: [
                        ["", "A"],
                        ["B", 1],
                    ],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                },
            });
            assert.strictEqual(result.error, undefined);
        });

        it("should accept valid ECharts enclosure", () => {
            const result = interactiveChartEnclosureSchema.validate({
                title: "ECharts",
                chartFormat: ChartFormat.ECHARTS,
                chart: {
                    series: [{ type: "bar" }],
                    metadata: {
                        aspectRatio: "16:9",
                    },
                },
            });
            assert.strictEqual(result.error, undefined);
        });

        it("should reject plain-data format when chart has ECharts keys", () => {
            const result = interactiveChartEnclosureSchema.validate({
                title: "Invalid Mixed Shape",
                chartFormat: ChartFormat.PLAIN_DATA,
                chart: {
                    data: [
                        ["", "A"],
                        ["B", 1],
                    ],
                    series: [{ type: "bar" }],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                },
            });
            assert.notStrictEqual(result.error, undefined);
        });

        it("should reject object with neither data nor chart", () => {
            const result = interactiveChartEnclosureSchema.validate({
                title: "Invalid",
                chartFormat: ChartFormat.PLAIN_DATA,
                chart: {},
            });
            assert.notStrictEqual(result.error, undefined);
        });

        it("should reject invalid plain data structure", () => {
            const result = interactiveChartEnclosureSchema.validate({
                title: "Invalid Plain Data",
                chartFormat: ChartFormat.PLAIN_DATA,
                chart: {
                    data: [["only one row"]],
                    metadata: {
                        type: PlainDataChartType.BAR_CHART,
                        aspectRatio: "16:9",
                    },
                },
            });
            assert.notStrictEqual(result.error, undefined);
        });

        it("should reject invalid ECharts structure", () => {
            const result = interactiveChartEnclosureSchema.validate({
                title: "Invalid ECharts",
                chartFormat: ChartFormat.ECHARTS,
                chart: {
                    series: [],
                    metadata: {
                        aspectRatio: "16:9",
                    },
                },
            });
            assert.notStrictEqual(result.error, undefined);
        });
    });

});
