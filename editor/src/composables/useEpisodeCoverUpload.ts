import { ref } from "vue";
import { auth } from "@/lib/firebase";

function getApiBaseUrl(): string {
    const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT as string;
    return new URL(graphqlEndpoint).origin;
}

export function useEpisodeCoverUpload() {
    const uploading = ref(false);
    const uploadError = ref("");

    async function uploadCover(episodeId: string, file: File): Promise<string> {
        uploading.value = true;
        uploadError.value = "";

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Authentication required");
            const token = await user.getIdToken();
            const baseUrl = getApiBaseUrl();

            const formData = new FormData();
            formData.append("cover", file);

            const response = await fetch(`${baseUrl}/api/v1/hosted/episode/${episodeId}/cover`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const body = await response
                    .json()
                    .catch(() => ({ error: "Failed to upload cover" }));
                throw new Error(body.error || "Failed to upload cover");
            }

            const result = (await response.json()) as { episodeCoverUrl: string };
            return result.episodeCoverUrl;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to upload cover";
            uploadError.value = message;
            throw err;
        } finally {
            uploading.value = false;
        }
    }

    return {
        uploading,
        uploadError,
        uploadCover,
    };
}
