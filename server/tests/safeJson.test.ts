import { describe, it } from "node:test";
import assert from "node:assert";
import { safeJson } from "../src/validation/safeJson.js";

describe("safeJson", () => {
    const schema = safeJson("enclosure");

    describe("valid JSON objects", () => {
        it("should accept empty objects", () => {
            const result = schema.validate({});
            assert.strictEqual(result.error, undefined);
        });

        it("should accept objects with safe property names", () => {
            const result = schema.validate({
                title: "Hello",
                description: "World",
                count: 42,
                enabled: true,
            });
            assert.strictEqual(result.error, undefined);
        });

        it("should accept nested objects with safe property names", () => {
            const result = schema.validate({
                data: {
                    items: [{ name: "item1" }, { name: "item2" }],
                    metadata: {
                        author: "John",
                        version: "1.0",
                    },
                },
            });
            assert.strictEqual(result.error, undefined);
        });

        it("should accept arrays of primitives", () => {
            const result = schema.validate({
                numbers: [1, 2, 3],
                strings: ["a", "b", "c"],
            });
            assert.strictEqual(result.error, undefined);
        });

        it("should accept null values", () => {
            const result = schema.validate({
                value: null,
                nested: { inner: null },
            });
            assert.strictEqual(result.error, undefined);
        });
    });

    describe("forbidden key: __proto__", () => {
        // Note: Using JSON.parse because { __proto__: {} } in JS sets the prototype
        // rather than creating a property named __proto__. JSON.parse creates the actual property.
        it("should reject __proto__ at root level", () => {
            const result = schema.validate(JSON.parse('{"__proto__":{}}'));
            assert.notStrictEqual(result.error, undefined);
            assert.match(result.error!.message, /__proto__/);
        });

        it("should reject __proto__ in nested object", () => {
            const result = schema.validate(JSON.parse('{"data":{"__proto__":{"polluted":true}}}'));
            assert.notStrictEqual(result.error, undefined);
            assert.match(result.error!.message, /data\.__proto__/);
        });

        it("should reject __proto__ deeply nested", () => {
            const result = schema.validate(
                JSON.parse('{"level1":{"level2":{"level3":{"__proto__":{}}}}}')
            );
            assert.notStrictEqual(result.error, undefined);
        });
    });

    describe("forbidden key: prototype", () => {
        it("should reject prototype at root level", () => {
            const result = schema.validate({ prototype: {} });
            assert.notStrictEqual(result.error, undefined);
            assert.match(result.error!.message, /prototype/);
        });

        it("should reject prototype in nested object", () => {
            const result = schema.validate({
                config: {
                    prototype: { method: "evil" },
                },
            });
            assert.notStrictEqual(result.error, undefined);
        });
    });

    describe("forbidden key: constructor", () => {
        it("should reject constructor at root level", () => {
            const result = schema.validate({ constructor: {} });
            assert.notStrictEqual(result.error, undefined);
            assert.match(result.error!.message, /constructor/);
        });

        it("should reject constructor in nested object", () => {
            const result = schema.validate({
                obj: {
                    constructor: { prototype: {} },
                },
            });
            assert.notStrictEqual(result.error, undefined);
        });
    });

    describe("forbidden key: function", () => {
        it("should reject function at root level", () => {
            const result = schema.validate({ function: "() => {}" });
            assert.notStrictEqual(result.error, undefined);
            assert.match(result.error!.message, /function/);
        });

        it("should reject function in nested object", () => {
            const result = schema.validate({
                handler: {
                    function: "malicious code",
                },
            });
            assert.notStrictEqual(result.error, undefined);
        });
    });

    describe("forbidden keys in arrays", () => {
        it("should reject forbidden keys inside array elements", () => {
            const result = schema.validate(
                JSON.parse('{"items":[{"name":"safe"},{"__proto__":{}},{"name":"also safe"}]}')
            );
            assert.notStrictEqual(result.error, undefined);
            assert.match(result.error!.message, /\[1\]\.__proto__/);
        });

        it("should reject forbidden keys in deeply nested arrays", () => {
            const result = schema.validate({
                matrix: [[{ constructor: {} }]],
            });
            assert.notStrictEqual(result.error, undefined);
        });

        it("should accept arrays without forbidden keys", () => {
            const result = schema.validate({
                items: [{ id: 1 }, { id: 2 }, { id: 3 }],
            });
            assert.strictEqual(result.error, undefined);
        });
    });

    describe("error messages", () => {
        it("should include the label in error message", () => {
            const customSchema = safeJson("custom label");
            const result = customSchema.validate(JSON.parse('{"__proto__":{}}'));
            assert.notStrictEqual(result.error, undefined);
            assert.match(result.error!.message, /custom label/);
        });

        it("should include the path to forbidden key", () => {
            const result = schema.validate(
                JSON.parse('{"deep":{"nested":{"__proto__":{}}}}')
            );
            assert.notStrictEqual(result.error, undefined);
            assert.match(result.error!.message, /deep\.nested\.__proto__/);
        });
    });

    describe("edge cases", () => {
        it("should handle mixed nested structures", () => {
            const result = schema.validate({
                array: [
                    {
                        nested: {
                            items: [{ constructor: "bad" }],
                        },
                    },
                ],
            });
            assert.notStrictEqual(result.error, undefined);
        });

        it("should accept properties containing forbidden words as substrings", () => {
            const result = schema.validate({
                constructorName: "MyClass",
                prototypeId: "123",
                functionName: "doSomething",
                __proto__type: "valid",
            });
            assert.strictEqual(result.error, undefined);
        });

        it("should reject exact matches only", () => {
            const validResult = schema.validate({ myprototype: "ok" });
            assert.strictEqual(validResult.error, undefined);

            const invalidResult = schema.validate({ prototype: "bad" });
            assert.notStrictEqual(invalidResult.error, undefined);
        });
    });
});
