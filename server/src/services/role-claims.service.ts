import { adminAuth } from "../config/firebase-admin.js";
import type { UserRoleValue } from "../types/firestore.js";

export async function setFirebaseUserRoleClaim(
    firebaseUid: string,
    role: UserRoleValue | null,
): Promise<void> {
    const userRecord = await adminAuth.getUser(firebaseUid);
    const nextClaims: Record<string, unknown> = {
        ...(userRecord.customClaims ?? {}),
    };

    if (role === null) {
        delete nextClaims.role;
    } else {
        nextClaims.role = role;
    }

    await adminAuth.setCustomUserClaims(firebaseUid, nextClaims);
}
