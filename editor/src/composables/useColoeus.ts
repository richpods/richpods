import { configureColoeus, type AdminPoll } from "@richpods/coloeus";
import { auth } from "@/lib/firebase";
import i18n from "@/i18n";

const COLOEUS_ENDPOINT = import.meta.env.VITE_COLOEUS_ENDPOINT as string;
const t = i18n.global.t;

export type PollListResponse = {
    polls: AdminPoll[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
};

/**
 * Configure Coloeus API with the configured endpoint and Firebase authentication
 */
export function configureColoeusWithAuth(): void {
    if (!COLOEUS_ENDPOINT) {
        console.error(t("pollEditor.endpointNotConfigured"));
        return;
    }

    configureColoeus({
        apiUrl: COLOEUS_ENDPOINT,
        getAuthToken: async () => {
            const user = auth.currentUser;
            if (!user) return null;
            return user.getIdToken();
        },
    });
}

/**
 * Get the configured Coloeus endpoint
 */
export function getColoeusEndpoint(): string {
    return COLOEUS_ENDPOINT;
}

/**
 * Fetch the user's polls from Coloeus
 */
export async function fetchUserPolls(page = 1, limit = 50): Promise<PollListResponse> {
    if (!COLOEUS_ENDPOINT) {
        throw new Error(t("pollEditor.endpointNotConfigured"));
    }

    const user = auth.currentUser;
    if (!user) {
        throw new Error(t("pollEditor.authRequiredFetch"));
    }

    const token = await user.getIdToken();

    const response = await fetch(
        `${COLOEUS_ENDPOINT}/admin/polls?page=${page}&limit=${limit}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        },
    );

    if (!response.ok) {
        const error = await response
            .json()
            .catch(() => ({ error: t("pollEditor.unknownError") }));
        throw new Error(
            error.error || t("pollEditor.fetchFailedWithStatus", { status: response.status }),
        );
    }

    return response.json();
}

/**
 * Delete a poll from Coloeus
 */
export async function deleteColoeussPoll(pollId: string): Promise<void> {
    if (!COLOEUS_ENDPOINT) {
        throw new Error(t("pollEditor.endpointNotConfigured"));
    }

    const user = auth.currentUser;
    if (!user) {
        throw new Error(t("pollEditor.authRequiredDelete"));
    }

    const token = await user.getIdToken();

    const response = await fetch(`${COLOEUS_ENDPOINT}/admin/polls/${pollId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const error = await response
            .json()
            .catch(() => ({ error: t("pollEditor.unknownError") }));
        throw new Error(
            error.error || t("pollEditor.deleteFailedWithStatus", { status: response.status }),
        );
    }
}
