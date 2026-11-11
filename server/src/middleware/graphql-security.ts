import {
    GraphQLError,
    Kind,
    type ASTVisitor,
    type DocumentNode,
    type FieldNode,
    type FragmentDefinitionNode,
    type SelectionSetNode,
    type ValidationContext,
    type ValidationRule,
} from "graphql";

/**
 * Validation rule that rejects operations nested deeper than `maxDepth`.
 * Fragment spreads are resolved against the document, so depth cannot be
 * hidden inside fragments.
 */
export function createMaxDepthRule(maxDepth: number): ValidationRule {
    return (context: ValidationContext): ASTVisitor => ({
        Document(document: DocumentNode) {
            const fragments = new Map<string, FragmentDefinitionNode>();
            for (const definition of document.definitions) {
                if (definition.kind === Kind.FRAGMENT_DEFINITION) {
                    fragments.set(definition.name.value, definition);
                }
            }

            const measureDepth = (
                selectionSet: SelectionSetNode | undefined,
                depth: number,
                visitedFragments: ReadonlySet<string>,
            ): number => {
                if (!selectionSet) {
                    return depth;
                }
                let deepest = depth;
                for (const selection of selectionSet.selections) {
                    if (selection.kind === Kind.FIELD) {
                        if (selection.name.value.startsWith("__")) {
                            continue;
                        }
                        deepest = Math.max(
                            deepest,
                            measureDepth(selection.selectionSet, depth + 1, visitedFragments),
                        );
                    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
                        deepest = Math.max(
                            deepest,
                            measureDepth(selection.selectionSet, depth, visitedFragments),
                        );
                    } else if (!visitedFragments.has(selection.name.value)) {
                        const fragment = fragments.get(selection.name.value);
                        if (fragment) {
                            deepest = Math.max(
                                deepest,
                                measureDepth(
                                    fragment.selectionSet,
                                    depth,
                                    new Set([...visitedFragments, selection.name.value]),
                                ),
                            );
                        }
                    }
                }
                return deepest;
            };

            for (const definition of document.definitions) {
                if (definition.kind === Kind.OPERATION_DEFINITION) {
                    const depth = measureDepth(definition.selectionSet, 0, new Set());
                    if (depth > maxDepth) {
                        context.reportError(
                            new GraphQLError(
                                `Query depth ${depth} exceeds the maximum allowed depth of ${maxDepth}`,
                                { nodes: definition },
                            ),
                        );
                    }
                }
            }
        },
    });
}

/**
 * Errors thrown deliberately for clients are plain `new Error(...)` instances.
 * Anything carrying a `code` property comes from an underlying system
 * (Firestore/gRPC, HTTP clients, Node syscalls) and may leak internals.
 */
function isSystemError(error: Error): boolean {
    return "code" in error;
}

export function maskSystemErrors(error: Readonly<GraphQLError | Error>): GraphQLError | Error {
    if (!(error instanceof GraphQLError)) {
        return error;
    }
    const original = error.originalError;
    if (!original || !isSystemError(original)) {
        return error;
    }
    console.error("GraphQL internal error masked in response:", original);
    return new GraphQLError("Internal server error", {
        nodes: error.nodes,
        path: error.path,
        positions: error.positions,
    });
}

/**
 * Root fields that may be executed without a signed-in user: what the website
 * and the player need, plus the mutations that establish a session.
 */
export const PUBLIC_ROOT_FIELDS: ReadonlySet<string> = new Set([
    "richPod",
    "recentPublishedRichPods",
    "publicHostedPodcast",
    "publicHostedPodcastEpisodes",
    "signUp",
    "signIn",
    "signInWithGoogle",
]);

export const AUTHENTICATION_REQUIRED_MESSAGE = "Authentication required";

/**
 * No client of this API uses aliases. Rejecting them removes the cheapest way
 * to repeat the same root field many times within a single operation.
 */
export function createNoAliasesRule(): ValidationRule {
    return (context: ValidationContext): ASTVisitor => ({
        Field(node: FieldNode) {
            if (node.alias) {
                context.reportError(
                    new GraphQLError(
                        `Field aliases are not allowed ("${node.alias.value}: ${node.name.value}")`,
                        { nodes: node },
                    ),
                );
            }
        },
    });
}

function collectFragmentDefinitions(document: DocumentNode): Map<string, FragmentDefinitionNode> {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of document.definitions) {
        if (definition.kind === Kind.FRAGMENT_DEFINITION) {
            fragments.set(definition.name.value, definition);
        }
    }
    return fragments;
}

function collectRootFields(
    selectionSet: SelectionSetNode,
    fragments: ReadonlyMap<string, FragmentDefinitionNode>,
    visitedFragments: ReadonlySet<string> = new Set(),
): FieldNode[] {
    return selectionSet.selections.flatMap((selection): FieldNode[] => {
        if (selection.kind === Kind.FIELD) {
            return [selection];
        }
        if (selection.kind === Kind.INLINE_FRAGMENT) {
            return collectRootFields(selection.selectionSet, fragments, visitedFragments);
        }
        const fragment = fragments.get(selection.name.value);
        if (!fragment || visitedFragments.has(selection.name.value)) {
            return [];
        }
        return collectRootFields(
            fragment.selectionSet,
            fragments,
            new Set([...visitedFragments, selection.name.value]),
        );
    });
}

/**
 * Validation rule for unauthenticated requests: every root field of every
 * operation must be in `publicFields`, otherwise the whole document is
 * rejected before anything is executed.
 */
export function createPublicFieldsOnlyRule(publicFields: ReadonlySet<string>): ValidationRule {
    return (context: ValidationContext): ASTVisitor => ({
        Document(document: DocumentNode) {
            const fragments = collectFragmentDefinitions(document);
            for (const definition of document.definitions) {
                if (definition.kind !== Kind.OPERATION_DEFINITION) {
                    continue;
                }
                for (const field of collectRootFields(definition.selectionSet, fragments)) {
                    const name = field.name.value;
                    if (name.startsWith("__") || publicFields.has(name)) {
                        continue;
                    }
                    context.reportError(
                        new GraphQLError(`${AUTHENTICATION_REQUIRED_MESSAGE} for field "${name}"`, {
                            nodes: field,
                        }),
                    );
                }
            }
        },
    });
}

type RootValue = Record<string, unknown>;

/**
 * Second line of defence behind `createPublicFieldsOnlyRule`: root resolvers
 * outside `publicFields` refuse to run for unauthenticated callers even if the
 * validation step is ever bypassed or misconfigured.
 */
export function requireAuthForPrivateRootFields(
    rootValue: RootValue,
    isAuthenticated: boolean,
    publicFields: ReadonlySet<string>,
): RootValue {
    if (isAuthenticated) {
        return rootValue;
    }
    return Object.fromEntries(
        Object.entries(rootValue).map(([name, resolver]) => {
            if (typeof resolver !== "function" || publicFields.has(name)) {
                return [name, resolver];
            }
            return [
                name,
                () => {
                    throw new Error(AUTHENTICATION_REQUIRED_MESSAGE);
                },
            ];
        }),
    );
}
