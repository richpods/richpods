import {
    GraphQLError,
    Kind,
    type ASTVisitor,
    type DocumentNode,
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
