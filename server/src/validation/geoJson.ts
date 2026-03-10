import Joi from "joi";
import { safeJson } from "./safeJson.js";

type GeoJsonValidationResult = {
    isValid: boolean;
    error?: string;
};

type CoordinateDimensionsResult = {
    dimensions: Set<number>;
    error: string | null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const validatePosition = (value: unknown, path: string): string | null => {
    if (!Array.isArray(value)) {
        return `${path} must be an array.`;
    }
    if (value.length < 2) {
        return `${path} must have at least two coordinates.`;
    }
    for (const item of value) {
        if (!isFiniteNumber(item)) {
            return `${path} must contain only numbers.`;
        }
    }
    return null;
};

const collectCoordinateDimensions = (
    value: unknown,
    positionDepth: number,
    path: string,
    dimensions: Set<number>,
): string | null => {
    if (positionDepth === 0) {
        const error = validatePosition(value, path);
        if (error) return error;
        dimensions.add((value as unknown[]).length);
        return null;
    }

    if (!Array.isArray(value)) {
        return `${path} must be an array.`;
    }

    for (let i = 0; i < value.length; i += 1) {
        const error = collectCoordinateDimensions(value[i], positionDepth - 1, `${path}[${i}]`, dimensions);
        if (error) return error;
    }

    return null;
};

const mergeDimensions = (target: Set<number>, source: Set<number>): void => {
    for (const dimension of source) {
        target.add(dimension);
    }
};

const collectGeometryDimensions = (value: unknown, path: string): CoordinateDimensionsResult => {
    const dimensions = new Set<number>();

    if (!isObject(value)) {
        return { dimensions, error: `${path} must be an object.` };
    }

    const type = value.type;
    if (typeof type !== "string") {
        return { dimensions, error: `${path}.type is required.` };
    }

    if (type === "GeometryCollection") {
        if (!Array.isArray(value.geometries)) {
            return { dimensions, error: `${path}.geometries must be an array.` };
        }
        for (let i = 0; i < value.geometries.length; i += 1) {
            const childDimensions = collectGeometryDimensions(value.geometries[i], `${path}.geometries[${i}]`);
            if (childDimensions.error) {
                return { dimensions, error: childDimensions.error };
            }
            mergeDimensions(dimensions, childDimensions.dimensions);
        }
        return { dimensions, error: null };
    }

    if (!("coordinates" in value)) {
        return { dimensions, error: `${path}.coordinates is required.` };
    }

    let positionDepth: number;
    switch (type) {
        case "Point":
            positionDepth = 0;
            break;
        case "MultiPoint":
        case "LineString":
            positionDepth = 1;
            break;
        case "MultiLineString":
        case "Polygon":
            positionDepth = 2;
            break;
        case "MultiPolygon":
            positionDepth = 3;
            break;
        default:
            return {
                dimensions,
                error: `${path}.type must be a valid GeoJSON geometry type.`,
            };
    }

    const error = collectCoordinateDimensions(
        value.coordinates,
        positionDepth,
        `${path}.coordinates`,
        dimensions,
    );
    if (error) {
        return { dimensions, error };
    }

    return { dimensions, error: null };
};

const collectFeatureDimensions = (value: unknown, path: string): CoordinateDimensionsResult => {
    const dimensions = new Set<number>();

    if (!isObject(value)) {
        return { dimensions, error: `${path} must be an object.` };
    }

    if (value.type !== "Feature") {
        return { dimensions, error: `${path}.type must be "Feature".` };
    }

    if (!("geometry" in value)) {
        return { dimensions, error: `${path}.geometry is required.` };
    }

    if (value.geometry === null) {
        return { dimensions, error: null };
    }

    const geometryDimensions = collectGeometryDimensions(value.geometry, `${path}.geometry`);
    if (geometryDimensions.error) {
        return { dimensions, error: geometryDimensions.error };
    }

    mergeDimensions(dimensions, geometryDimensions.dimensions);
    return { dimensions, error: null };
};

const collectFeatureCollectionDimensions = (value: unknown, path: string): CoordinateDimensionsResult => {
    const dimensions = new Set<number>();

    if (!isObject(value)) {
        return { dimensions, error: `${path} must be an object.` };
    }

    if (value.type !== "FeatureCollection") {
        return { dimensions, error: `${path}.type must be "FeatureCollection".` };
    }

    if (!Array.isArray(value.features)) {
        return { dimensions, error: `${path}.features must be an array.` };
    }

    for (let i = 0; i < value.features.length; i += 1) {
        const featureDimensions = collectFeatureDimensions(value.features[i], `${path}.features[${i}]`);
        if (featureDimensions.error) {
            return { dimensions, error: featureDimensions.error };
        }
        mergeDimensions(dimensions, featureDimensions.dimensions);
    }

    return { dimensions, error: null };
};

const resolveSingleCoordinateDimension = (
    dimensions: Set<number>,
    path: string,
): { dimension: number | null; error: string | null } => {
    if (dimensions.size === 0) {
        return { dimension: null, error: null };
    }

    if (dimensions.size > 1) {
        const dimensionList = [...dimensions].sort((a, b) => a - b).join(", ");
        return {
            dimension: null,
            error: `${path} contains mixed coordinate dimensions (${dimensionList}).`,
        };
    }

    const [dimension] = [...dimensions];
    return { dimension, error: null };
};

const validateBbox = (bbox: unknown, path: string, dimensions?: Set<number>): string | null => {
    if (!Array.isArray(bbox)) {
        return `${path} must be an array.`;
    }
    if (bbox.length < 4 || bbox.length % 2 !== 0) {
        return `${path} must have an even number of numeric values (at least 4).`;
    }

    for (const item of bbox) {
        if (!isFiniteNumber(item)) {
            return `${path} must contain only numbers.`;
        }
    }

    const numericBbox = bbox as number[];
    if (dimensions) {
        const expectedDimension = resolveSingleCoordinateDimension(dimensions, path);
        if (expectedDimension.error) {
            return expectedDimension.error;
        }
        if (
            expectedDimension.dimension !== null &&
            numericBbox.length !== expectedDimension.dimension * 2
        ) {
            return `${path} must have ${expectedDimension.dimension * 2} values to match contained coordinates.`;
        }
    }

    const dimensionCount = numericBbox.length / 2;
    const south = numericBbox[1];
    const north = numericBbox[dimensionCount + 1];
    if (south > north) {
        return `${path} latitude bounds must be ordered south-to-north.`;
    }

    for (let axis = 2; axis < dimensionCount; axis += 1) {
        if (numericBbox[axis] > numericBbox[axis + dimensionCount]) {
            return `${path} axis ${axis + 1} bounds must be ordered from minimum to maximum.`;
        }
    }

    return null;
};

const positionsEqual = (a: number[], b: number[]): boolean =>
    a.length === b.length && a.every((value, index) => value === b[index]);

const validateLineString = (value: unknown, path: string): string | null => {
    if (!Array.isArray(value)) {
        return `${path} must be an array of positions.`;
    }
    if (value.length < 2) {
        return `${path} must contain at least two positions.`;
    }
    for (let i = 0; i < value.length; i += 1) {
        const error = validatePosition(value[i], `${path}[${i}]`);
        if (error) return error;
    }
    return null;
};

const validateLinearRing = (value: unknown, path: string): string | null => {
    if (!Array.isArray(value)) {
        return `${path} must be an array of positions.`;
    }
    if (value.length < 4) {
        return `${path} must contain at least four positions.`;
    }
    for (let i = 0; i < value.length; i += 1) {
        const error = validatePosition(value[i], `${path}[${i}]`);
        if (error) return error;
    }
    const first = value[0] as number[];
    const last = value[value.length - 1] as number[];
    if (!positionsEqual(first, last)) {
        return `${path} must be closed (first and last positions must match).`;
    }
    return null;
};

const validatePolygon = (value: unknown, path: string): string | null => {
    if (!Array.isArray(value)) {
        return `${path} must be an array of linear rings.`;
    }
    if (value.length < 1) {
        return `${path} must contain at least one linear ring.`;
    }
    for (let i = 0; i < value.length; i += 1) {
        const error = validateLinearRing(value[i], `${path}[${i}]`);
        if (error) return error;
    }
    return null;
};

const validateGeometry = (value: unknown, path: string): string | null => {
    if (!isObject(value)) {
        return `${path} must be an object.`;
    }
    if ("crs" in value) {
        return `${path} must not include a CRS member.`;
    }
    const type = value.type;
    if (typeof type !== "string") {
        return `${path}.type is required.`;
    }

    if ("features" in value) {
        return `${path} must not include a features member.`;
    }
    if ("properties" in value) {
        return `${path} must not include a properties member.`;
    }

    if (type === "GeometryCollection") {
        if ("coordinates" in value) {
            return `${path} must not include a coordinates member when type is "GeometryCollection".`;
        }
        if (!Array.isArray(value.geometries)) {
            return `${path}.geometries must be an array.`;
        }
        for (let i = 0; i < value.geometries.length; i += 1) {
            const error = validateGeometry(value.geometries[i], `${path}.geometries[${i}]`);
            if (error) return error;
        }

        if ("bbox" in value) {
            const dimensions = collectGeometryDimensions(value, path);
            if (dimensions.error) return dimensions.error;
            const bboxError = validateBbox(value.bbox, `${path}.bbox`, dimensions.dimensions);
            if (bboxError) return bboxError;
        }

        return null;
    }

    if ("geometries" in value) {
        return `${path} must not include a geometries member unless type is "GeometryCollection".`;
    }

    if (!("coordinates" in value)) {
        return `${path}.coordinates is required.`;
    }

    const coordinates = value.coordinates;
    let coordinatesError: string | null = null;
    switch (type) {
        case "Point":
            coordinatesError = validatePosition(coordinates, `${path}.coordinates`);
            break;
        case "MultiPoint":
            if (!Array.isArray(coordinates)) {
                return `${path}.coordinates must be an array of positions.`;
            }
            if (coordinates.length < 1) {
                return `${path}.coordinates must contain at least one position.`;
            }
            for (let i = 0; i < coordinates.length; i += 1) {
                const error = validatePosition(coordinates[i], `${path}.coordinates[${i}]`);
                if (error) return error;
            }
            break;
        case "LineString":
            coordinatesError = validateLineString(coordinates, `${path}.coordinates`);
            break;
        case "MultiLineString":
            if (!Array.isArray(coordinates)) {
                return `${path}.coordinates must be an array of LineStrings.`;
            }
            if (coordinates.length < 1) {
                return `${path}.coordinates must contain at least one LineString.`;
            }
            for (let i = 0; i < coordinates.length; i += 1) {
                const error = validateLineString(coordinates[i], `${path}.coordinates[${i}]`);
                if (error) return error;
            }
            break;
        case "Polygon":
            coordinatesError = validatePolygon(coordinates, `${path}.coordinates`);
            break;
        case "MultiPolygon":
            if (!Array.isArray(coordinates)) {
                return `${path}.coordinates must be an array of polygons.`;
            }
            if (coordinates.length < 1) {
                return `${path}.coordinates must contain at least one polygon.`;
            }
            for (let i = 0; i < coordinates.length; i += 1) {
                const error = validatePolygon(coordinates[i], `${path}.coordinates[${i}]`);
                if (error) return error;
            }
            break;
        default:
            return `${path}.type must be a valid GeoJSON geometry type.`;
    }

    if (coordinatesError) {
        return coordinatesError;
    }

    if ("bbox" in value) {
        const dimensions = collectGeometryDimensions(value, path);
        if (dimensions.error) return dimensions.error;
        const bboxError = validateBbox(value.bbox, `${path}.bbox`, dimensions.dimensions);
        if (bboxError) return bboxError;
    }

    return null;
};

const validateFeature = (value: unknown, path: string): string | null => {
    if (!isObject(value)) {
        return `${path} must be an object.`;
    }
    if (value.type !== "Feature") {
        return `${path}.type must be "Feature".`;
    }
    if ("crs" in value) {
        return `${path} must not include a CRS member.`;
    }

    if ("coordinates" in value) {
        return `${path} must not include a coordinates member.`;
    }
    if ("geometries" in value) {
        return `${path} must not include a geometries member.`;
    }
    if ("features" in value) {
        return `${path} must not include a features member.`;
    }

    if ("id" in value) {
        const id = value.id;
        if (typeof id !== "string" && typeof id !== "number") {
            return `${path}.id must be a string or number.`;
        }
    }
    if (!("geometry" in value)) {
        return `${path}.geometry is required.`;
    }
    if (value.geometry !== null) {
        const geometryError = validateGeometry(value.geometry, `${path}.geometry`);
        if (geometryError) return geometryError;
    }
    if (!("properties" in value)) {
        return `${path}.properties is required.`;
    }
    const properties = value.properties;
    if (properties !== null && !isObject(properties)) {
        return `${path}.properties must be an object or null.`;
    }

    if ("bbox" in value) {
        const dimensions = collectFeatureDimensions(value, path);
        if (dimensions.error) return dimensions.error;
        const bboxError = validateBbox(value.bbox, `${path}.bbox`, dimensions.dimensions);
        if (bboxError) return bboxError;
    }

    return null;
};

const validateFeatureCollection = (value: unknown, path: string): string | null => {
    if (!isObject(value)) {
        return `${path} must be an object.`;
    }
    if (value.type !== "FeatureCollection") {
        return `${path}.type must be "FeatureCollection".`;
    }
    if ("crs" in value) {
        return `${path} must not include a CRS member.`;
    }

    if ("geometry" in value) {
        return `${path} must not include a geometry member.`;
    }
    if ("properties" in value) {
        return `${path} must not include a properties member.`;
    }
    if ("coordinates" in value) {
        return `${path} must not include a coordinates member.`;
    }
    if ("geometries" in value) {
        return `${path} must not include a geometries member.`;
    }

    if (!Array.isArray(value.features)) {
        return `${path}.features must be an array.`;
    }
    for (let i = 0; i < value.features.length; i += 1) {
        const error = validateFeature(value.features[i], `${path}.features[${i}]`);
        if (error) return error;
    }

    if ("bbox" in value) {
        const dimensions = collectFeatureCollectionDimensions(value, path);
        if (dimensions.error) return dimensions.error;
        const bboxError = validateBbox(value.bbox, `${path}.bbox`, dimensions.dimensions);
        if (bboxError) return bboxError;
    }

    return null;
};

export const validateGeoJsonRfc7946 = (value: unknown): GeoJsonValidationResult => {
    if (!isObject(value)) {
        return { isValid: false, error: "GeoJSON must be a JSON object." };
    }

    if ("crs" in value) {
        return { isValid: false, error: "GeoJSON must not include a CRS member." };
    }

    const type = value.type;
    if (typeof type !== "string") {
        return { isValid: false, error: "GeoJSON type is required." };
    }

    let error: string | null = null;
    if (type === "FeatureCollection") {
        error = validateFeatureCollection(value, "GeoJSON");
    } else if (type === "Feature") {
        error = validateFeature(value, "GeoJSON");
    } else {
        error = validateGeometry(value, "GeoJSON");
    }

    if (error) {
        return { isValid: false, error };
    }

    return { isValid: true };
};

export const geoJsonSchema = safeJson("geoJSON")
    .custom((value, helpers) => {
        const result = validateGeoJsonRfc7946(value);
        if (!result.isValid) {
            return helpers.message({ custom: result.error ?? "Invalid GeoJSON." });
        }
        return value;
    })
    .required()
    .messages({
        "any.required": "GeoJSON is required",
        "object.base": "GeoJSON must be a JSON object",
    });
