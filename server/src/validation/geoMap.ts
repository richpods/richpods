import Joi from "joi";
import { geoJsonSchema } from "./geoJson.js";
import { chapterTitleSchema, chapterDescriptionSchema } from "./validator.js";

export const geoMapEnclosureSchema = Joi.object({
    title: chapterTitleSchema,
    description: chapterDescriptionSchema,
    geoJSON: geoJsonSchema,
});
