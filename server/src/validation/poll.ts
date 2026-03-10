import Joi from "joi";

/**
 * Validation schema for Poll enclosure
 *
 * Poll chapters reference external Coloeus polls via endpoint and pollId.
 */
export const pollEnclosureSchema = Joi.object({
    coloeus: Joi.object({
        endpoint: Joi.string()
            .uri({ scheme: ["http", "https"] })
            .required()
            .messages({
                "string.uri": "Coloeus endpoint must be a valid HTTP or HTTPS URL",
                "any.required": "Coloeus endpoint is required",
            }),
        pollId: Joi.string().trim().min(1).max(100).required().messages({
            "string.empty": "Poll ID is required",
            "string.min": "Poll ID is required",
            "string.max": "Poll ID cannot exceed 100 characters",
            "any.required": "Poll ID is required",
        }),
    })
        .required()
        .messages({
            "any.required": "Coloeus configuration is required",
        }),
});
