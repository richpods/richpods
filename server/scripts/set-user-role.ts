#!/usr/bin/env node

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeRole } from "@richpods/shared/utils/roles";
import { setFirebaseUserRoleClaim } from "../src/services/role-claims.service.js";
import type { UserRoleValue } from "../src/types/firestore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

function printUsage(): void {
    console.error(
        "Usage: pnpm --filter @richpods/server exec tsx scripts/set-user-role.ts <firebaseUid> <super_admin|editor|none>",
    );
}

function parseRole(input: string): UserRoleValue | null {
    if (input === "none") {
        return null;
    }

    return normalizeRole(input);
}

async function main(): Promise<void> {
    const firebaseUid = process.argv[2]?.trim();
    const roleInput = process.argv[3]?.trim();

    if (!firebaseUid || !roleInput) {
        printUsage();
        process.exit(1);
    }

    const role = parseRole(roleInput);
    if (role === null && roleInput !== "none") {
        printUsage();
        process.exit(1);
    }

    await setFirebaseUserRoleClaim(firebaseUid, role);
    console.log(`Updated role claim for firebaseUid=${firebaseUid} role=${role ?? "none"}.`);
}

main().catch((error: unknown) => {
    console.error("Failed to set user role claim:", error);
    process.exit(1);
});
