import { ref } from "vue";
import { isPrivilegedRole } from "@richpods/shared/utils/roles";

const currentUserRole = ref<string | null>(null);

export function useCurrentUserRole() {
    function setRole(role: string | null) {
        currentUserRole.value = role ?? null;
    }

    function clearRole() {
        currentUserRole.value = null;
    }

    function hasPrivilegedRole(): boolean {
        return isPrivilegedRole(currentUserRole.value);
    }

    return {
        currentUserRole,
        setRole,
        clearRole,
        hasPrivilegedRole,
    };
}
