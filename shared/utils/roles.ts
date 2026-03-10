/**
 * Shared role definitions and utilities used by both server and editor.
 */

export const UserRole = {
    SUPER_ADMIN: "super_admin",
    EDITOR: "editor",
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];

export const PRIVILEGED_ROLES: readonly UserRoleValue[] = [UserRole.SUPER_ADMIN, UserRole.EDITOR];

const ALL_ROLES = Object.values(UserRole) as UserRoleValue[];
const ALL_ROLE_SET: ReadonlySet<string> = new Set(ALL_ROLES);
const PRIVILEGED_ROLE_SET: ReadonlySet<string> = new Set(PRIVILEGED_ROLES);

function isKnownRole(role: unknown): role is UserRoleValue {
    return typeof role === "string" && ALL_ROLE_SET.has(role);
}

export function normalizeRole(rawRole: unknown): UserRoleValue | null {
    return isKnownRole(rawRole) ? rawRole : null;
}

export function isPrivilegedRole(role: string | null | undefined): boolean {
    return typeof role === "string" && PRIVILEGED_ROLE_SET.has(role);
}
