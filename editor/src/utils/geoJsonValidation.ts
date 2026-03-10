import i18n from "@/i18n";

type GeoJsonValidationResult = {
    isValid: boolean;
    error?: string;
};

const t = i18n.global.t;
const geoError = (key: string, params: Record<string, unknown>) =>
    t(`geoJsonValidation.${key}`, params) as string;

const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const validateBbox = (bbox: unknown, path: string): string | null => {
    if (!Array.isArray(bbox)) {
        return geoError("mustBeArray", { path });
    }
    if (bbox.length !== 4 && bbox.length !== 6) {
        return geoError("bboxMustHave4Or6Values", { path });
    }
    for (const item of bbox) {
        if (!isFiniteNumber(item)) {
            return geoError("mustContainOnlyNumbers", { path });
        }
    }
    return null;
};

const validatePosition = (value: unknown, path: string): string | null => {
    if (!Array.isArray(value)) {
        return geoError("mustBeArray", { path });
    }
    if (value.length < 2) {
        return geoError("mustHaveAtLeastTwoCoordinates", { path });
    }
    for (const item of value) {
        if (!isFiniteNumber(item)) {
            return geoError("mustContainOnlyNumbers", { path });
        }
    }
    return null;
};

const positionsEqual = (a: number[], b: number[]): boolean =>
    a.length === b.length && a.every((value, index) => value === b[index]);

const validateLineString = (value: unknown, path: string): string | null => {
    if (!Array.isArray(value)) {
        return geoError("mustBeArrayOfPositions", { path });
    }
    if (value.length < 2) {
        return geoError("mustContainAtLeastTwoPositions", { path });
    }
    for (let i = 0; i < value.length; i += 1) {
        const error = validatePosition(value[i], `${path}[${i}]`);
        if (error) return error;
    }
    return null;
};

const validateLinearRing = (value: unknown, path: string): string | null => {
    if (!Array.isArray(value)) {
        return geoError("mustBeArrayOfPositions", { path });
    }
    if (value.length < 4) {
        return geoError("mustContainAtLeastFourPositions", { path });
    }
    for (let i = 0; i < value.length; i += 1) {
        const error = validatePosition(value[i], `${path}[${i}]`);
        if (error) return error;
    }
    const first = value[0] as number[];
    const last = value[value.length - 1] as number[];
    if (!positionsEqual(first, last)) {
        return geoError("mustBeClosed", { path });
    }
    return null;
};

const validatePolygon = (value: unknown, path: string): string | null => {
    if (!Array.isArray(value)) {
        return geoError("mustBeArrayOfLinearRings", { path });
    }
    if (value.length < 1) {
        return geoError("mustContainAtLeastOneLinearRing", { path });
    }
    for (let i = 0; i < value.length; i += 1) {
        const error = validateLinearRing(value[i], `${path}[${i}]`);
        if (error) return error;
    }
    return null;
};

const validateGeometry = (value: unknown, path: string): string | null => {
    if (!isObject(value)) {
        return geoError("mustBeObject", { path });
    }
    if ("crs" in value) {
        return geoError("mustNotIncludeCrs", { path });
    }
    if ("bbox" in value) {
        const bboxError = validateBbox(value.bbox, `${path}.bbox`);
        if (bboxError) return bboxError;
    }
    const type = value.type;
    if (typeof type !== "string") {
        return geoError("typeIsRequired", { path });
    }
    if (type === "GeometryCollection") {
        if (!Array.isArray(value.geometries)) {
            return geoError("geometriesMustBeArray", { path });
        }
        for (let i = 0; i < value.geometries.length; i += 1) {
            const error = validateGeometry(value.geometries[i], `${path}.geometries[${i}]`);
            if (error) return error;
        }
        return null;
    }

    if (!("coordinates" in value)) {
        return geoError("coordinatesRequired", { path });
    }

    const coordinates = value.coordinates;
    switch (type) {
        case "Point":
            return validatePosition(coordinates, `${path}.coordinates`);
        case "MultiPoint":
            if (!Array.isArray(coordinates)) {
                return geoError("coordinatesMustBeArrayOfPositions", { path });
            }
            if (coordinates.length < 1) {
                return geoError("coordinatesMustContainAtLeastOnePosition", { path });
            }
            for (let i = 0; i < coordinates.length; i += 1) {
                const error = validatePosition(coordinates[i], `${path}.coordinates[${i}]`);
                if (error) return error;
            }
            return null;
        case "LineString":
            return validateLineString(coordinates, `${path}.coordinates`);
        case "MultiLineString":
            if (!Array.isArray(coordinates)) {
                return geoError("coordinatesMustBeArrayOfLineStrings", { path });
            }
            if (coordinates.length < 1) {
                return geoError("coordinatesMustContainAtLeastOneLineString", { path });
            }
            for (let i = 0; i < coordinates.length; i += 1) {
                const error = validateLineString(coordinates[i], `${path}.coordinates[${i}]`);
                if (error) return error;
            }
            return null;
        case "Polygon":
            return validatePolygon(coordinates, `${path}.coordinates`);
        case "MultiPolygon":
            if (!Array.isArray(coordinates)) {
                return geoError("coordinatesMustBeArrayOfPolygons", { path });
            }
            if (coordinates.length < 1) {
                return geoError("coordinatesMustContainAtLeastOnePolygon", { path });
            }
            for (let i = 0; i < coordinates.length; i += 1) {
                const error = validatePolygon(coordinates[i], `${path}.coordinates[${i}]`);
                if (error) return error;
            }
            return null;
        default:
            return geoError("typeMustBeValidGeometryType", { path });
    }
};

const validateFeature = (value: unknown, path: string): string | null => {
    if (!isObject(value)) {
        return geoError("mustBeObject", { path });
    }
    if (value.type !== "Feature") {
        return geoError("typeMustBeFeature", { path });
    }
    if ("crs" in value) {
        return geoError("mustNotIncludeCrs", { path });
    }
    if ("bbox" in value) {
        const bboxError = validateBbox(value.bbox, `${path}.bbox`);
        if (bboxError) return bboxError;
    }
    if ("id" in value) {
        const id = value.id;
        if (typeof id !== "string" && typeof id !== "number") {
            return geoError("idMustBeStringOrNumber", { path });
        }
    }
    if (!("geometry" in value)) {
        return geoError("geometryRequired", { path });
    }
    if (value.geometry !== null) {
        const geometryError = validateGeometry(value.geometry, `${path}.geometry`);
        if (geometryError) return geometryError;
    }
    if (!("properties" in value)) {
        return geoError("propertiesRequired", { path });
    }
    const properties = value.properties;
    if (properties !== null && !isObject(properties)) {
        return geoError("propertiesMustBeObjectOrNull", { path });
    }
    return null;
};

const validateFeatureCollection = (value: unknown, path: string): string | null => {
    if (!isObject(value)) {
        return geoError("mustBeObject", { path });
    }
    if (value.type !== "FeatureCollection") {
        return geoError("typeMustBeFeatureCollection", { path });
    }
    if ("crs" in value) {
        return geoError("mustNotIncludeCrs", { path });
    }
    if ("bbox" in value) {
        const bboxError = validateBbox(value.bbox, `${path}.bbox`);
        if (bboxError) return bboxError;
    }
    if (!Array.isArray(value.features)) {
        return geoError("featuresMustBeArray", { path });
    }
    for (let i = 0; i < value.features.length; i += 1) {
        const error = validateFeature(value.features[i], `${path}.features[${i}]`);
        if (error) return error;
    }
    return null;
};

export const validateGeoJsonRfc7946 = (value: unknown): GeoJsonValidationResult => {
    if (!isObject(value)) {
        return { isValid: false, error: geoError("geoJsonMustBeObject", {}) };
    }

    if ("crs" in value) {
        return { isValid: false, error: geoError("geoJsonMustNotIncludeCrs", {}) };
    }

    const type = value.type;
    if (typeof type !== "string") {
        return { isValid: false, error: geoError("geoJsonTypeRequired", {}) };
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
