import { describe, it } from "node:test";
import assert from "node:assert";
import { isValidFilename } from "../src/utils/sanitization.js";

describe("isValidFilename", () => {
    describe("invalid input handling", () => {
        it("should reject null input", () => {
            const result = isValidFilename(null);
            assert.strictEqual(result, false);
        });

        it("should reject undefined input", () => {
            const result = isValidFilename(undefined);
            assert.strictEqual(result, false);
        });

        it("should reject empty string", () => {
            const result = isValidFilename("");
            assert.strictEqual(result, false);
        });

        it("should reject whitespace-only string", () => {
            const result = isValidFilename("   ");
            assert.strictEqual(result, false);
        });
    });

    describe("valid filenames", () => {
        it("should accept valid filenames", () => {
            const validNames = [
                "the quick brown fox jumped over the lazy dog.mp3",
                "résumé",
                "valid name.mp3",
                "image.jpg",
                "photo.png",
                "archive.tar.gz",
                "my-file_2024 (1).jpeg",
            ];
            validNames.forEach((name) => {
                assert.strictEqual(isValidFilename(name), true);
            });
        });

        it("should accept filenames with surrounding whitespace", () => {
            assert.strictEqual(isValidFilename("  image.jpg  "), true);
        });

        it("should handle Unicode filenames", () => {
            assert.strictEqual(isValidFilename("фото.jpg"), true);
        });

        it("should handle emoji in filenames", () => {
            assert.strictEqual(isValidFilename("vacation-🏖️.png"), true);
        });

        it("should handle Chinese filenames", () => {
            assert.strictEqual(isValidFilename("我的文件.pdf"), true);
            assert.strictEqual(isValidFilename("照片2024.jpg"), true);
            assert.strictEqual(isValidFilename("文档 (1).docx"), true);
        });

        it("should accept LPT10 and similar non-reserved names", () => {
            assert.strictEqual(isValidFilename("LPT10.txt"), true);
        });
    });

    describe("control character rejection", () => {
        it("should reject filenames with null character", () => {
            assert.strictEqual(isValidFilename("hello\u0000world"), false);
        });

        it("should reject filenames with newline characters", () => {
            assert.strictEqual(isValidFilename("hello\nworld"), false);
        });

        it("should reject filenames with control characters", () => {
            assert.strictEqual(isValidFilename("hello\x01\x02\x03world"), false);
        });

        it("should reject filenames with tab characters", () => {
            assert.strictEqual(isValidFilename("hello\tworld"), false);
        });
    });

    describe("restricted character rejection", () => {
        it("should reject filenames with restricted characters", () => {
            const invalidChars = ["?", "/", "*", "<", ">", ":", '"', "|", "\\"];
            invalidChars.forEach((char) => {
                const result = isValidFilename(`hello${char}world`);
                assert.strictEqual(result, false, `Should reject filename with ${char}`);
            });
        });
    });

    describe("leading/trailing character rejection", () => {
        it("should reject filenames with leading dots", () => {
            assert.strictEqual(isValidFilename(".hidden"), false);
            assert.strictEqual(isValidFilename("..config"), false);
        });

        it("should reject filenames with trailing dots", () => {
            assert.strictEqual(isValidFilename("file."), false);
            assert.strictEqual(isValidFilename("file.."), false);
        });

        it("should accept filenames with surrounding whitespace", () => {
            // Whitespace is trimmed first, then validated
            assert.strictEqual(isValidFilename(" file.txt"), true);
            assert.strictEqual(isValidFilename("file.txt "), true);
            assert.strictEqual(isValidFilename("  file.txt  "), true);
        });
    });

    describe("path traversal rejection", () => {
        it("should reject Unix-style path traversal attempts", () => {
            assert.strictEqual(isValidFilename("../../../../etc/passwd"), false);
            assert.strictEqual(isValidFilename("../../uploads/hack.jpg"), false);
            assert.strictEqual(isValidFilename("/var/log/malicious.jpg"), false);
        });

        it("should reject Windows-style path traversal attempts", () => {
            assert.strictEqual(isValidFilename("..\\..\\..\\windows\\system32\\config\\sam"), false);
            assert.strictEqual(isValidFilename("C:\\Users\\Admin\\Documents\\photo.webp"), false);
        });
    });

    describe("relative path rejection", () => {
        it("should reject relative path indicators", () => {
            const relativePaths = [".", "..", "./", "../", "/..", "/../"];
            relativePaths.forEach((path) => {
                assert.strictEqual(isValidFilename(path), false);
            });
        });
    });

    describe("length limitations", () => {
        it("should reject filenames exceeding 255 bytes", () => {
            const longString = "a".repeat(300);
            assert.strictEqual(isValidFilename(longString), false);
        });

        it("should accept filenames at exactly 255 bytes", () => {
            const exactString = "a".repeat(255);
            assert.strictEqual(isValidFilename(exactString), true);
        });

        it("should reject filenames with non-BMP characters exceeding 255 bytes", () => {
            // Non-BMP character that takes 4 bytes in UTF-8
            const nonBmp = "\uD800\uDC00";

            // 252 single-byte chars + 4-byte char = 256 bytes (over limit)
            const str252 = "a".repeat(252);
            assert.strictEqual(isValidFilename(str252 + nonBmp), false);

            // 253 single-byte chars + 4-byte char = 257 bytes (over limit)
            const str253 = "a".repeat(253);
            assert.strictEqual(isValidFilename(str253 + nonBmp), false);
        });

        it("should accept filenames with non-BMP characters within 255 bytes", () => {
            // Non-BMP character that takes 4 bytes in UTF-8
            const nonBmp = "\uD800\uDC00";

            // 251 single-byte chars + 4-byte char = 255 bytes (at limit)
            const str251 = "a".repeat(251);
            assert.strictEqual(isValidFilename(str251 + nonBmp), true);
        });
    });
});
