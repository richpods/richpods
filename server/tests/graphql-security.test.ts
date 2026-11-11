import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { buildSchema, parse, validate, type ValidationRule } from "graphql";
import {
    AUTHENTICATION_REQUIRED_MESSAGE,
    createNoAliasesRule,
    createPublicFieldsOnlyRule,
    PUBLIC_ROOT_FIELDS,
    requireAuthForPrivateRootFields,
} from "../src/middleware/graphql-security.js";

const schema = buildSchema(fs.readFileSync(new URL("../schema.graphql", import.meta.url), "utf8"));

function errorsFor(document: string, rules: ValidationRule[]): string[] {
    return validate(schema, parse(document), rules).map((error) => error.message);
}

function aliasFanOut(count: number): string {
    const fields = Array.from(
        { length: count },
        (_, i) =>
            `a${i}: podcastMetadata(feedUrl: "https://feed.example/${i}") { podcast { title } }`,
    );
    return `{ ${fields.join(" ")} }`;
}

describe("createNoAliasesRule", () => {
    const rules = [createNoAliasesRule()];

    it("accepts the documents the clients send", () => {
        assert.deepStrictEqual(errorsFor(`{ richPod(id: "r1") { id title } }`, rules), []);
        assert.deepStrictEqual(
            errorsFor(
                `query Recent($first: Int) { recentPublishedRichPods(first: $first) { items { id } } }`,
                rules,
            ),
            [],
        );
    });

    it("rejects an aliased root field", () => {
        const errors = errorsFor(`{ first: richPod(id: "r1") { id } }`, rules);
        assert.strictEqual(errors.length, 1);
        assert.match(errors[0], /aliases are not allowed/);
        assert.match(errors[0], /first: richPod/);
    });

    it("rejects aliases nested inside selections", () => {
        const errors = errorsFor(`{ richPod(id: "r1") { name: title } }`, rules);
        assert.strictEqual(errors.length, 1);
        assert.match(errors[0], /name: title/);
    });

    it("rejects the alias fan-out from the security report once per alias", () => {
        const errors = errorsFor(aliasFanOut(50), rules);
        assert.strictEqual(errors.length, 50);
    });
});

describe("createPublicFieldsOnlyRule", () => {
    const rules = [createPublicFieldsOnlyRule(PUBLIC_ROOT_FIELDS)];

    it("accepts the player and website queries", () => {
        const documents = [
            `{ richPod(id: "r1") { id title chapters { begin } editor { publicName } } }`,
            `{ recentPublishedRichPods(first: 10) { items { id } nextCursor } }`,
            `{ publicHostedPodcast(id: "p1") { id title } publicHostedPodcastEpisodes(podcastId: "p1") { items { id } } }`,
        ];
        for (const document of documents) {
            assert.deepStrictEqual(errorsFor(document, rules), []);
        }
    });

    it("accepts the mutations that establish a session", () => {
        assert.deepStrictEqual(
            errorsFor(
                `mutation { signIn(input: { email: "a@b.c", password: "secret" }) { token } }`,
                rules,
            ),
            [],
        );
        assert.deepStrictEqual(
            errorsFor(`mutation { signInWithGoogle(idToken: "t") { token } }`, rules),
            [],
        );
    });

    it("rejects private queries", () => {
        for (const document of [
            `{ userRichPods { items { id } } }`,
            `{ podcastMetadata(feedUrl: "https://feed.example/0") { podcast { title } } }`,
            `{ extractFeedUrl(url: "https://example.org") }`,
            `{ podcastEpisodeSearch(query: "news") { feedUrl } }`,
            `{ instanceInfo { version } }`,
            `{ currentUser { id } }`,
            `{ user(id: "u1") { id } }`,
        ]) {
            const errors = errorsFor(document, rules);
            assert.strictEqual(errors.length, 1, document);
            assert.match(errors[0], new RegExp(`^${AUTHENTICATION_REQUIRED_MESSAGE} for field`));
        }
    });

    it("rejects private mutations", () => {
        const errors = errorsFor(`mutation { deleteRichPod(id: "r1") }`, rules);
        assert.deepStrictEqual(errors, [
            `${AUTHENTICATION_REQUIRED_MESSAGE} for field "deleteRichPod"`,
        ]);
    });

    it("rejects a document that mixes public and private root fields", () => {
        const errors = errorsFor(
            `{ richPod(id: "r1") { id } userVerifications { items { id } } }`,
            rules,
        );
        assert.deepStrictEqual(errors, [
            `${AUTHENTICATION_REQUIRED_MESSAGE} for field "userVerifications"`,
        ]);
    });

    it("sees through fragments spread at the root", () => {
        const document = `
            query { ...Private }
            fragment Private on Query { userRichPods { items { id } } }
        `;
        assert.deepStrictEqual(errorsFor(document, rules), [
            `${AUTHENTICATION_REQUIRED_MESSAGE} for field "userRichPods"`,
        ]);
        const inline = `{ ... on Query { richPodLock(id: "r1") { sessionId } } }`;
        assert.deepStrictEqual(errorsFor(inline, rules), [
            `${AUTHENTICATION_REQUIRED_MESSAGE} for field "richPodLock"`,
        ]);
    });

    it("rejects every private operation of a multi-operation document", () => {
        const document = `
            query A { richPod(id: "r1") { id } }
            query B { userRichPods { items { id } } }
            mutation C { clearAllOwnRichPodLocks }
        `;
        assert.strictEqual(errorsFor(document, rules).length, 2);
    });

    it("ignores introspection meta fields", () => {
        assert.deepStrictEqual(errorsFor(`{ __typename }`, rules), []);
    });
});

describe("requireAuthForPrivateRootFields", () => {
    const rootValue = {
        richPod: () => "public",
        userRichPods: () => "private",
        JSON: { name: "JSON" },
    };

    it("leaves the root value untouched for authenticated callers", () => {
        assert.strictEqual(
            requireAuthForPrivateRootFields(rootValue, true, PUBLIC_ROOT_FIELDS),
            rootValue,
        );
    });

    it("keeps public resolvers and non-function entries for anonymous callers", () => {
        const guarded = requireAuthForPrivateRootFields(rootValue, false, PUBLIC_ROOT_FIELDS);
        assert.strictEqual((guarded.richPod as () => string)(), "public");
        assert.strictEqual(guarded.JSON, rootValue.JSON);
    });

    it("refuses private resolvers for anonymous callers", () => {
        const guarded = requireAuthForPrivateRootFields(rootValue, false, PUBLIC_ROOT_FIELDS);
        assert.throws(() => (guarded.userRichPods as () => string)(), {
            message: AUTHENTICATION_REQUIRED_MESSAGE,
        });
    });
});

describe("PUBLIC_ROOT_FIELDS", () => {
    it("only names fields that exist in the schema", () => {
        const queryFields = Object.keys(schema.getQueryType()?.getFields() ?? {});
        const mutationFields = Object.keys(schema.getMutationType()?.getFields() ?? {});
        for (const field of PUBLIC_ROOT_FIELDS) {
            assert.ok(
                queryFields.includes(field) || mutationFields.includes(field),
                `${field} is not a root field`,
            );
        }
    });
});
