import Joi from "joi";

export const noHtml = (label = "value") =>
    Joi.string()
        .max(5000)
        // Fast path: block angle brackets and common tag patterns
        .pattern(/<(?:.|\n)*?>/, { name: "htmlTag", invert: true })
        // Block typical encoded attempts like &lt;script&gt;
        .pattern(/&(?:lt|gt|#60|#62);/i, { name: "encodedAngle", invert: true })
        // Block JS/data schemes and dangerous patterns
        .custom((value, helpers) => {
            const v = value.toLowerCase();

            // Check for dangerous schemes
            if (/(?:javascript:|vbscript:|data:text\/html)/.test(v)) {
                return helpers.error("string.dangerousScheme");
            }

            // Check for event handlers
            if (/on(?:error|click|load|mouse|focus|blur|change|submit)\s*=/i.test(v)) {
                return helpers.error("string.eventHandler");
            }

            // Check for dangerous functions
            if (/eval\s*\(/.test(v)) {
                return helpers.error("string.dangerousFunction");
            }

            // Check for script tags (case insensitive, encoded variants)
            if (/<script/i.test(v)) {
                return helpers.error("string.scriptTag");
            }

            // Check for iframe, object, embed tags
            if (/<(?:iframe|object|embed)/i.test(v)) {
                return helpers.error("string.dangerousTag");
            }

            return value;
        })
        .messages({
            "string.pattern.name": `"${label}" cannot contain HTML`,
            "string.dangerousScheme": `"${label}" contains dangerous URL scheme`,
            "string.eventHandler": `"${label}" contains event handler`,
            "string.dangerousFunction": `"${label}" contains dangerous function`,
            "string.scriptTag": `"${label}" contains script tag`,
            "string.dangerousTag": `"${label}" contains dangerous tag`,
            "string.htmlDetected": `"${label}" contains potentially dangerous content`,
        });
