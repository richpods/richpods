import assert from "node:assert";
import { describe, it } from "node:test";
import { validateGeoJsonRfc7946 } from "../src/validation/geoJson.js";

const assertInvalid = (value: unknown, expectedMessage: RegExp): void => {
    const result = validateGeoJsonRfc7946(value);
    assert.strictEqual(result.isValid, false);
    assert.match(result.error ?? "", expectedMessage);
};

describe("geoJson validation", () => {
    describe("cross-type member constraints", () => {
        it("rejects Feature objects with a coordinates member", () => {
            assertInvalid(
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [13.4, 52.5],
                    },
                    properties: {},
                    coordinates: [13.4, 52.5],
                },
                /must not include a coordinates member/,
            );
        });

        it("rejects Geometry objects with a features member", () => {
            assertInvalid(
                {
                    type: "Point",
                    coordinates: [13.4, 52.5],
                    features: [],
                },
                /must not include a features member/,
            );
        });

        it("rejects FeatureCollection objects with a geometry member", () => {
            assertInvalid(
                {
                    type: "FeatureCollection",
                    geometry: {
                        type: "Point",
                        coordinates: [13.4, 52.5],
                    },
                    features: [],
                },
                /must not include a geometry member/,
            );
        });
    });

    describe("bbox validation", () => {
        it("rejects bbox that does not match contained coordinate dimensions", () => {
            assertInvalid(
                {
                    type: "Point",
                    coordinates: [13.4, 52.5, 40],
                    bbox: [12.9, 52.0, 13.9, 53.0],
                },
                /must have 6 values to match contained coordinates/,
            );
        });

        it("rejects bbox with inverted latitude bounds", () => {
            assertInvalid(
                {
                    type: "Point",
                    coordinates: [13.4, 52.5],
                    bbox: [12.9, 53.0, 13.9, 52.0],
                },
                /latitude bounds must be ordered south-to-north/,
            );
        });

        it("rejects bbox with inverted higher-dimension bounds", () => {
            assertInvalid(
                {
                    type: "Point",
                    coordinates: [13.4, 52.5, 40],
                    bbox: [12.9, 52.0, 200, 13.9, 53.0, 100],
                },
                /axis 3 bounds must be ordered from minimum to maximum/,
            );
        });

        it("allows antimeridian-crossing longitude bounds", () => {
            const result = validateGeoJsonRfc7946({
                type: "LineString",
                coordinates: [
                    [179.5, 0],
                    [-179.5, 1],
                ],
                bbox: [170, -10, -170, 10],
            });

            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.error, undefined);
        });

        it("rejects bbox with mixed contained coordinate dimensions", () => {
            assertInvalid(
                {
                    type: "GeometryCollection",
                    geometries: [
                        { type: "Point", coordinates: [13.4, 52.5] },
                        { type: "Point", coordinates: [13.4, 52.5, 40] },
                    ],
                    bbox: [12.0, 52.0, 0, 14.0, 53.0, 100],
                },
                /contains mixed coordinate dimensions/,
            );
        });
    });
});
