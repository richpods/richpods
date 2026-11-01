import { isPrivilegedRole } from "@richpods/shared/utils/roles";
import type { RichPodDocument, UserRoleValue } from "../types/firestore.js";

export const HOSTED_ACCESS_ERROR = "Hosted RichPods are only available to privileged users";

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
