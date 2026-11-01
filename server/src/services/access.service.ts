import { isPrivilegedRole } from "@richpods/shared/utils/roles";
import type { DocumentReference } from "@google-cloud/firestore";
import type { RichPodDocument, UserRoleValue } from "../types/firestore.js";

export const OWNERSHIP_ERROR = "Unauthorized: You can only access your own resources";
export const HOSTED_ACCESS_ERROR = "Hosted RichPods are only available to privileged users";

type OwnedDocument = { editor: Pick<DocumentReference, "id"> };

/**
 * `context` describes the attempted action for the server log only. The
 * thrown message is deliberately generic so clients learn nothing about the
 * resource.
 */
export function assertOwnership(doc: OwnedDocument, userId: string, context: string): void {
    if (doc.editor.id !== userId) {
        console.warn(`Unauthorized ${context}: user ${userId} is not the owner (${doc.editor.id})`);
        throw new Error(OWNERSHIP_ERROR);
    }
}

/**
 * Hosted RichPods are a privileged feature. The role is a claim on the ID
 * token and can be revoked later, so every mutation on a hosted RichPod must
 * re-check it instead of trusting that the owner was privileged at creation.
 */
export function assertHostedAccess(
    richPod: Pick<RichPodDocument, "isHosted">,
    userRole: UserRoleValue | null | undefined,
): void {
    if (richPod.isHosted && !isPrivilegedRole(userRole)) {
        throw new Error(HOSTED_ACCESS_ERROR);
    }
}

export function assertEditorAccess(
    richPod: Pick<RichPodDocument, "isHosted" | "editor">,
    userId: string,
    userRole: UserRoleValue | null | undefined,
    context: string,
): void {
    assertOwnership(richPod, userId, context);
    assertHostedAccess(richPod, userRole);
}
