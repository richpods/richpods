import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { z } from "zod/v4";
import DOMPurify from "dompurify";
import { useRichPodStore } from "@/stores/useRichPodStore";
import {
    useEditorUiStore,
    ValidationErrorTypes,
    type ValidationError,
} from "@/stores/useEditorUiStore";
import { RichPodState } from "@/graphql/generated";
import type { EditorChapter } from "@/types/editor";
import { isPlainDataEnclosure, isEChartsEnclosure, PlainDataChartType, ChartFormat } from "@/types/editor";
import { validateGeoJsonRfc7946 } from "@/utils/geoJsonValidation";

// Zod schemas for common validations
const requiredStringSchema = (fieldName: string) =>
    z
        .string({ error: `${fieldName} is required.` })
        .trim()
        .min(1, `${fieldName} is required.`);

const maxLengthSchema = (max: number, fieldName: string) =>
    z.string().max(max, `${fieldName} must be ${max} characters or less.`);

const httpUrlSchema = (fieldName: string) =>
    z.url({ protocol: /^https?$/, message: `${fieldName} must be a valid HTTP or HTTPS URL.` });

/**
 * Centralized validation composable for RichPod editor
 * Contains ALL validation logic for all enclosure types
 */
export function useValidation() {
    const { t } = useI18n();
    const richpodStore = useRichPodStore();
    const editorUiStore = useEditorUiStore();
    const { chapters, isVerified, richpod } = storeToRefs(richpodStore);

    // ========== FIELD VALIDATORS (REUSABLE) ==========

    function validateRequired(value: string | undefined | null, fieldName: string): string | null {
        const result = requiredStringSchema(fieldName).safeParse(value ?? "");
        return result.success ? null : result.error.issues[0].message;
    }

    function validateMaxLength(
        value: string | undefined | null,
        max: number,
        fieldName: string,
    ): string | null {
        if (!value) return null;
        const result = maxLengthSchema(max, fieldName).safeParse(value);
        return result.success ? null : result.error.issues[0].message;
    }

    function validateNoHtml(value: string | undefined | null, fieldName: string): string | null {
        if (!value) return null;

        const noHtmlSchema = z
            .string()
            .max(5000, `${fieldName} must be 5000 characters or less.`)
            .refine(
                (v) => DOMPurify.sanitize(v, { ALLOWED_TAGS: [] }) === v,
                `${fieldName} contains HTML.`,
            );

        const result = noHtmlSchema.safeParse(value);
        return result.success ? null : result.error.issues[0].message;
    }

    function validateUrl(value: string | undefined | null, fieldName: string): string | null {
        if (!value) return null;
        const result = httpUrlSchema(fieldName).safeParse(value);
        return result.success ? null : result.error.issues[0].message;
    }

    // ========== ENCLOSURE-SPECIFIC VALIDATORS ==========

    function validateMarkdownChapter(
        chapter: EditorChapter,
        chapterIndex: number,
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const enclosure = chapter.enclosure;

        if (enclosure.__typename !== "Markdown") return errors;

        // Title is required
        const titleError = validateRequired(enclosure.title, t("validation.fields.title"));
        if (titleError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "title",
                chapterIndex,
                message: titleError,
            });
        }

        // Text is required
        const textError = validateRequired(enclosure.text, t("validation.fields.textContent"));
        if (textError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "text",
                chapterIndex,
                message: textError,
            });
        }

        return errors;
    }

    function validateSlideshowChapter(
        chapter: EditorChapter,
        chapterIndex: number,
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const enclosure = chapter.enclosure;

        if (enclosure.__typename !== "Slideshow") return errors;

        const titleError = validateRequired(
            enclosure.title,
            t("validation.fields.slideshowTitle"),
        );
        if (titleError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "slideshow-title",
                chapterIndex,
                message: titleError,
            });
        }

        // Only validate if verified
        if (!isVerified.value) return errors;

        const slides = enclosure.slides || [];

        // Check for missing images
        const missingImages = slides.filter(
            (slide) => !slide.imageUrl || slide.imageUrl.trim() === "",
        ).length;
        if (missingImages > 0) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "slides-images",
                chapterIndex,
                message: `${missingImages} slide(s) missing images`,
            });
        }

        // Validate caption length for each slide
        slides.forEach((slide, slideIndex) => {
            const captionError = validateMaxLength(
                slide.caption,
                500,
                t("validation.fields.slideCaption", { n: slideIndex + 1 }),
            );
            if (captionError) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: `slide-${slideIndex}-caption`,
                    chapterIndex,
                    message: captionError,
                });
            }

            const altError = validateMaxLength(
                slide.imageAlt,
                500,
                t("validation.fields.slideAltText", { n: slideIndex + 1 }),
            );
            if (altError) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: `slide-${slideIndex}-alt`,
                    chapterIndex,
                    message: altError,
                });
            }

            // Validate image URL
            const urlError = validateUrl(
                slide.imageUrl,
                t("validation.fields.slideImageUrl", { n: slideIndex + 1 }),
            );
            if (urlError) {
                errors.push({
                    type: ValidationErrorTypes.INVALID_URL,
                    field: `slide-${slideIndex}-imageUrl`,
                    chapterIndex,
                    message: urlError,
                });
            }
        });

        // Max 50 slides
        if (slides.length > 50) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "slides",
                chapterIndex,
                message: t("validation.messages.maxSlidesAllowed", { max: 50 }),
            });
        }

        return errors;
    }

    function validateInteractiveChartChapter(
        chapter: EditorChapter,
        chapterIndex: number,
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const enclosure = chapter.enclosure;

        if (enclosure.__typename !== "InteractiveChart") return errors;

        // Title is required
        const titleError = validateRequired(enclosure.title, t("validation.fields.title"));
        if (titleError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "title",
                chapterIndex,
                message: titleError,
            });
        }

        // Description max length (optional field)
        const descMaxError = validateMaxLength(
            enclosure.description,
            1000,
            t("validation.fields.description"),
        );
        if (descMaxError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "description",
                chapterIndex,
                message: descMaxError,
            });
        }

        // Validate chartFormat field
        const chartFormat = enclosure.chartFormat as string | undefined;
        if (!chartFormat || (chartFormat !== ChartFormat.PLAIN_DATA && chartFormat !== ChartFormat.ECHARTS)) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "chartFormat",
                chapterIndex,
                message: t("validation.messages.chartFormatRequired"),
            });
            return errors;
        }

        // All chart data is inside enclosure.chart
        const chartObj = enclosure.chart as Record<string, unknown> | undefined;

        if (!chartObj || typeof chartObj !== "object") {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "chart",
                chapterIndex,
                message: t("validation.messages.chartConfigRequired"),
            });
            return errors;
        }

        if (isPlainDataEnclosure(enclosure)) {
            // Plain-data format validation
            const data = chartObj.data as (string | number)[][];
            const metadata = chartObj.metadata as { type?: string; aspectRatio?: string } | undefined;

            // Check minimum dimensions
            if (!data || data.length < 2) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: "chart-data",
                    chapterIndex,
                    message: t("validation.messages.chartDataMinRows"),
                });
            } else if (!data[0] || !Array.isArray(data[0]) || data[0].length < 2) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: "chart-data",
                    chapterIndex,
                    message: t("validation.messages.chartDataMinColumns"),
                });
            } else {
                const numCols = data[0].length;

                // Check all rows have consistent length
                for (let i = 0; i < data.length; i++) {
                    if (!Array.isArray(data[i]) || data[i].length !== numCols) {
                        errors.push({
                            type: ValidationErrorTypes.REQUIRED,
                            field: "chart-data",
                            chapterIndex,
                            message: t("validation.messages.chartDataConsistentColumns"),
                        });
                        break;
                    }
                }

                // Validate header row (first row, except [0][0])
                for (let col = 1; col < numCols; col++) {
                    if (typeof data[0][col] !== "string") {
                        errors.push({
                            type: ValidationErrorTypes.REQUIRED,
                            field: "chart-data",
                            chapterIndex,
                            message: t("validation.messages.chartHeaderStringsOnly"),
                        });
                        break;
                    }
                }

                // Validate first column (row labels, except [0][0])
                for (let row = 1; row < data.length; row++) {
                    if (typeof data[row]?.[0] !== "string") {
                        errors.push({
                            type: ValidationErrorTypes.REQUIRED,
                            field: "chart-data",
                            chapterIndex,
                            message: t("validation.messages.chartRowLabelsStringsOnly"),
                        });
                        break;
                    }
                }

                // Validate data cells are finite numbers
                let invalidNumberFound = false;
                for (let row = 1; row < data.length; row++) {
                    for (let col = 1; col < numCols; col++) {
                        const cell = data[row]?.[col];
                        if (typeof cell !== "number" || !Number.isFinite(cell)) {
                            invalidNumberFound = true;
                            break;
                        }
                    }
                    if (invalidNumberFound) break;
                }

                if (invalidNumberFound) {
                    errors.push({
                        type: ValidationErrorTypes.REQUIRED,
                        field: "chart-data",
                        chapterIndex,
                        message: t("validation.messages.chartDataFiniteNumbersOnly"),
                    });
                }
            }

            // Check metadata
            const validChartTypes = Object.values(PlainDataChartType);
            if (!metadata?.type || !validChartTypes.includes(metadata.type as typeof validChartTypes[number])) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: "chart-type",
                    chapterIndex,
                    message: t("validation.messages.chartTypeRequired"),
                });
            }

            if (!metadata?.aspectRatio || !/^[1-9]\d*:[1-9]\d*$/.test(metadata.aspectRatio)) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: "aspect-ratio",
                    chapterIndex,
                    message: t("validation.messages.aspectRatioRequired"),
                });
            }
        } else if (isEChartsEnclosure(enclosure)) {
            // ECharts format validation - chart object contains ECharts config + metadata
            // Must have series or dataset
            const hasSeries =
                (Array.isArray(chartObj.series) && chartObj.series.length > 0) ||
                (typeof chartObj.series === "object" &&
                    chartObj.series !== null &&
                    Object.keys(chartObj.series).length > 0);
            const hasDataset =
                (Array.isArray(chartObj.dataset) && chartObj.dataset.length > 0) ||
                (typeof chartObj.dataset === "object" &&
                    chartObj.dataset !== null &&
                    Object.keys(chartObj.dataset).length > 0);

            if (!hasSeries && !hasDataset) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: "chart",
                    chapterIndex,
                    message: t("validation.messages.chartSeriesOrDatasetRequired"),
                });
            }

            // Check metadata for aspect ratio
            const metadata = chartObj.metadata as { aspectRatio?: string } | undefined;
            if (!metadata?.aspectRatio || !/^[1-9]\d*:[1-9]\d*$/.test(metadata.aspectRatio)) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: "aspect-ratio",
                    chapterIndex,
                    message: t("validation.messages.aspectRatioRequired"),
                });
            }
        } else {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "chartFormat",
                chapterIndex,
                message: t("validation.messages.chartFormatInvalid"),
            });
        }

        return errors;
    }

    function validateGeoMapChapter(
        chapter: EditorChapter,
        chapterIndex: number,
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const enclosure = chapter.enclosure;

        if (enclosure.__typename !== "GeoMap") return errors;

        const titleError = validateRequired(enclosure.title, t("validation.fields.title"));
        if (titleError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "title",
                chapterIndex,
                message: titleError,
            });
        }

        // Description max length (optional field)
        const descMaxError = validateMaxLength(
            enclosure.description,
            1000,
            t("validation.fields.description"),
        );
        if (descMaxError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "description",
                chapterIndex,
                message: descMaxError,
            });
        }

        if (!enclosure.geoJSON || Object.keys(enclosure.geoJSON).length === 0) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "geoJSON",
                chapterIndex,
                message: t("validation.messages.geoJsonRequired"),
            });
        } else {
            const geoValidation = validateGeoJsonRfc7946(enclosure.geoJSON);
            if (!geoValidation.isValid) {
                errors.push({
                    type: ValidationErrorTypes.INVALID,
                    field: "geoJSON",
                    chapterIndex,
                    message: geoValidation.error ?? t("validation.messages.geoJsonRfc7946"),
                });
            }
        }

        return errors;
    }

    function validatePollChapter(
        chapter: EditorChapter,
        chapterIndex: number,
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const enclosure = chapter.enclosure;

        if (enclosure.__typename !== "Poll") return errors;

        const coloeus = enclosure.coloeus;
        if (
            !coloeus ||
            !coloeus.pollId ||
            coloeus.pollId.trim() === "" ||
            !coloeus.endpoint ||
            coloeus.endpoint.trim() === ""
        ) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "coloeus-pollId",
                chapterIndex,
                message: t("validation.messages.pollIdRequired"),
            });
        }

        return errors;
    }

    function validateFactboxChapter(
        chapter: EditorChapter,
        chapterIndex: number,
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const enclosure = chapter.enclosure;

        if (enclosure.__typename !== "Factbox") return errors;

        // Title is required (max 200 chars)
        const titleError = validateRequired(enclosure.title, t("validation.fields.factboxTitle"));
        if (titleError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "factbox-title",
                chapterIndex,
                message: titleError,
            });
        } else {
            const titleMaxError = validateMaxLength(
                enclosure.title,
                200,
                t("validation.fields.factboxTitle"),
            );
            if (titleMaxError) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: "factbox-title",
                    chapterIndex,
                    message: titleMaxError,
                });
            }
        }

        // Text is required (max 5000 chars)
        const textError = validateRequired(enclosure.text, t("validation.fields.factboxText"));
        if (textError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "factbox-text",
                chapterIndex,
                message: textError,
            });
        } else {
            const textMaxError = validateMaxLength(
                enclosure.text,
                5000,
                t("validation.fields.factboxText"),
            );
            if (textMaxError) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: "factbox-text",
                    chapterIndex,
                    message: textMaxError,
                });
            }
        }

        // Links validation (max 3 links)
        const links = enclosure.links || [];
        if (links.length > 3) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "factbox-links",
                chapterIndex,
                message: t("validation.messages.maxFactboxLinksAllowed", { max: 3 }),
            });
        }

        // Validate each link
        links.forEach((link, linkIndex) => {
            // Label is required (max 50 chars)
            const labelField = t("validation.fields.linkLabel", { n: linkIndex + 1 });
            const urlField = t("validation.fields.linkUrl", { n: linkIndex + 1 });
            const labelError = validateRequired(link.label, labelField);
            if (labelError) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: `factbox-link-${linkIndex}-label`,
                    chapterIndex,
                    message: labelError,
                });
            } else {
                const labelMaxError = validateMaxLength(
                    link.label,
                    50,
                    labelField,
                );
                if (labelMaxError) {
                    errors.push({
                        type: ValidationErrorTypes.REQUIRED,
                        field: `factbox-link-${linkIndex}-label`,
                        chapterIndex,
                        message: labelMaxError,
                    });
                }
            }

            // URL is required and must be valid
            const urlRequiredError = validateRequired(link.url, urlField);
            if (urlRequiredError) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: `factbox-link-${linkIndex}-url`,
                    chapterIndex,
                    message: urlRequiredError,
                });
            } else {
                const urlError = validateUrl(link.url, urlField);
                if (urlError) {
                    errors.push({
                        type: ValidationErrorTypes.INVALID_URL,
                        field: `factbox-link-${linkIndex}-url`,
                        chapterIndex,
                        message: urlError,
                    });
                }
            }
        });

        return errors;
    }

    function validateCardChapter(
        chapter: EditorChapter,
        chapterIndex: number,
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const enclosure = chapter.enclosure;

        if (enclosure.__typename !== "Card") return errors;

        const isVisible = enclosure.visibleAsChapter === true;

        // Title required only for visible cards
        if (isVisible) {
            const titleError = validateRequired(enclosure.title, t("validation.fields.title"));
            if (titleError) {
                errors.push({
                    type: ValidationErrorTypes.REQUIRED,
                    field: "title",
                    chapterIndex,
                    message: titleError,
                });
            }
        }

        // Title max length always applies
        const titleMaxError = validateMaxLength(enclosure.title, 200, t("validation.fields.title"));
        if (titleMaxError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "title",
                chapterIndex,
                message: titleMaxError,
            });
        }

        switch (enclosure.cardType) {
            case "LINK": {
                // URL must be valid if provided
                if (enclosure.url) {
                    const urlError = validateUrl(enclosure.url, t("validation.fields.url"));
                    if (urlError) {
                        errors.push({
                            type: ValidationErrorTypes.INVALID_URL,
                            field: "card-url",
                            chapterIndex,
                            message: urlError,
                        });
                    }
                }
                const urlMaxError = validateMaxLength(enclosure.url, 500, t("validation.fields.url"));
                if (urlMaxError) {
                    errors.push({
                        type: ValidationErrorTypes.REQUIRED,
                        field: "card-url",
                        chapterIndex,
                        message: urlMaxError,
                    });
                }
                break;
            }
            case "CITATION": {
                const quoteMaxError = validateMaxLength(
                    enclosure.quoteText,
                    1500,
                    t("validation.fields.quoteText"),
                );
                if (quoteMaxError) {
                    errors.push({
                        type: ValidationErrorTypes.REQUIRED,
                        field: "card-quoteText",
                        chapterIndex,
                        message: quoteMaxError,
                    });
                }
                const sourceMaxError = validateMaxLength(
                    enclosure.citationSource as string | undefined,
                    100,
                    t("validation.fields.citationSource"),
                );
                if (sourceMaxError) {
                    errors.push({
                        type: ValidationErrorTypes.REQUIRED,
                        field: "card-citationSource",
                        chapterIndex,
                        message: sourceMaxError,
                    });
                }
                if (enclosure.citationUrl) {
                    const citUrlError = validateUrl(
                        enclosure.citationUrl as string | undefined,
                        t("validation.fields.citationUrl"),
                    );
                    if (citUrlError) {
                        errors.push({
                            type: ValidationErrorTypes.INVALID_URL,
                            field: "card-citationUrl",
                            chapterIndex,
                            message: citUrlError,
                        });
                    }
                }
                // Citation link requires source
                if (enclosure.citationUrl && !enclosure.citationSource) {
                    errors.push({
                        type: ValidationErrorTypes.REQUIRED,
                        field: "card-citationSource",
                        chapterIndex,
                        message: t("validation.messages.citationSourceRequiredWithUrl"),
                    });
                }
                break;
            }
            case "IMAGE": {
                // Image URL must be valid if provided
                if (enclosure.imageUrl) {
                    const imgUrlError = validateUrl(enclosure.imageUrl, t("validation.fields.imageUrl"));
                    if (imgUrlError) {
                        errors.push({
                            type: ValidationErrorTypes.INVALID_URL,
                            field: "card-imageUrl",
                            chapterIndex,
                            message: imgUrlError,
                        });
                    }
                }
                const altMaxError = validateMaxLength(
                    enclosure.imageAlt,
                    500,
                    t("validation.fields.imageAlt"),
                );
                if (altMaxError) {
                    errors.push({
                        type: ValidationErrorTypes.REQUIRED,
                        field: "card-imageAlt",
                        chapterIndex,
                        message: altMaxError,
                    });
                }
                if (enclosure.imageLink) {
                    const imgLinkError = validateUrl(
                        enclosure.imageLink,
                        t("validation.fields.imageLink"),
                    );
                    if (imgLinkError) {
                        errors.push({
                            type: ValidationErrorTypes.INVALID_URL,
                            field: "card-imageLink",
                            chapterIndex,
                            message: imgLinkError,
                        });
                    }
                }
                break;
            }
        }

        return errors;
    }

    // ========== GLOBAL VALIDATION ==========

    /**
     * Validates all chapters in the RichPod
     * This is the main validation function that should be called on blur and chapter switch
     */
    function validateAllChapters(): ValidationError[] {
        const errors: ValidationError[] = [];
        const chaptersList = chapters.value;

        chaptersList.forEach((chapter, index) => {
            const typename = chapter.enclosure.__typename;

            switch (typename) {
                case "Markdown":
                    errors.push(...validateMarkdownChapter(chapter, index));
                    break;
                case "Slideshow":
                    errors.push(...validateSlideshowChapter(chapter, index));
                    break;
                case "InteractiveChart":
                    errors.push(...validateInteractiveChartChapter(chapter, index));
                    break;
                case "GeoMap":
                    errors.push(...validateGeoMapChapter(chapter, index));
                    break;
                case "Poll":
                    errors.push(...validatePollChapter(chapter, index));
                    break;
                case "Factbox":
                    errors.push(...validateFactboxChapter(chapter, index));
                    break;
                case "Card":
                    errors.push(...validateCardChapter(chapter, index));
                    break;
                default:
                    break;
            }
        });

        return errors;
    }

    /**
     * Validates RichPod-level fields (title, description)
     */
    function validateRichPod(): ValidationError[] {
        const errors: ValidationError[] = [];

        // Title is required
        const titleRequiredError = validateRequired(
            richpod.value.title,
            t("validation.fields.richPodTitle"),
        );
        if (titleRequiredError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "richpod-title",
                message: titleRequiredError,
            });
        }

        // Title max length (server accepts 200)
        const titleMaxError = validateMaxLength(
            richpod.value.title,
            200,
            t("validation.fields.richPodTitle"),
        );
        if (titleMaxError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "richpod-title",
                message: titleMaxError,
            });
        }

        // Title noHtml validation
        const titleHtmlError = validateNoHtml(
            richpod.value.title,
            t("validation.fields.richPodTitle"),
        );
        if (titleHtmlError) {
            errors.push({
                type: ValidationErrorTypes.NO_HTML,
                field: "richpod-title",
                message: titleHtmlError,
            });
        }

        // Description is required
        const descRequiredError = validateRequired(
            richpod.value.description,
            t("validation.fields.richPodDescription"),
        );
        if (descRequiredError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "richpod-description",
                message: descRequiredError,
            });
        }

        // Description max length (server accepts 1000)
        const descMaxError = validateMaxLength(
            richpod.value.description,
            1000,
            t("validation.fields.richPodDescription"),
        );
        if (descMaxError) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "richpod-description",
                message: descMaxError,
            });
        }

        // Description noHtml validation
        const descHtmlError = validateNoHtml(
            richpod.value.description,
            t("validation.fields.richPodDescription"),
        );
        if (descHtmlError) {
            errors.push({
                type: ValidationErrorTypes.NO_HTML,
                field: "richpod-description",
                message: descHtmlError,
            });
        }

        // Published RichPods must have at least one chapter
        if (richpod.value.state === RichPodState.Published && chapters.value.length === 0) {
            errors.push({
                type: ValidationErrorTypes.REQUIRED,
                field: "richpod-chapters",
                message: t("validation.messages.publishRequiresChapters"),
            });
        }

        return errors;
    }

    /**
     * Runs complete validation and updates the error store
     * Call this on blur events and when switching chapters
     */
    function runValidation() {
        const chapterErrors = validateAllChapters();
        const richpodErrors = validateRichPod();
        const allErrors = [...chapterErrors, ...richpodErrors];

        editorUiStore.setValidationErrors(allErrors);
    }

    return {
        validateAllChapters,
        validateRichPod,
        runValidation,
    };
}
