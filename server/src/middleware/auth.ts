import { Request } from "express";
import { getUserFromToken } from "../services/auth.service.js";
import { User } from "../graphql.js";
import type { UserRoleValue } from "../types/firestore.js";
import { isPrivilegedRole } from "@richpods/shared/utils/roles";

export type AuthContext = {
    user?: User | null;
    userId?: string | null;
    email?: string | null;
    role?: UserRoleValue | null;
    token?: string | null;
};

export async function createAuthContext(req: Request): Promise<AuthContext> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {};
    }

    const token = authHeader.substring(7);

    try {
        const result = await getUserFromToken(token);
        return {
            user: result?.user ?? null,
            userId: result?.user?.id ?? null,
            email: result?.email ?? null,
            role: result?.role ?? null,
            token,
        };
    } catch (error) {
        return {
            token,
        };
    }
}

export function requireAuth(context: AuthContext): string {
    if (!context.userId || !context.user) {
        throw new Error("Authentication required");
    }
    return context.userId;
}

export function requirePrivilegedAuth(context: AuthContext): string {
    const userId = requireAuth(context);
    if (!isPrivilegedRole(context.role)) {
        throw new Error("Hosted RichPods are only available to privileged users");
    }
    return userId;
}
