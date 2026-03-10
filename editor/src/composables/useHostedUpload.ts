import { ref } from "vue";
import { auth } from "@/lib/firebase";

type UploadResult = {
    episode: { id: string };
    richPodId: string;
};

type UploadParams = {
    podcastId: string;
    audioFile: File;
    title: string;
    description: string;
    coverFile?: File | null;
};

function getApiBaseUrl(): string {
    const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT as string;
    return new URL(graphqlEndpoint).origin;
}

export function useHostedUpload() {
    const uploading = ref(false);
    const uploadProgress = ref(0);
    const uploadError = ref("");

    async function uploadEpisode(params: UploadParams): Promise<UploadResult> {
        uploading.value = true;
        uploadProgress.value = 0;
        uploadError.value = "";

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Authentication required");
            const token = await user.getIdToken();
            const baseUrl = getApiBaseUrl();

            const formData = new FormData();
            formData.append("audio", params.audioFile);
            formData.append("title", params.title || "Untitled Episode");
            formData.append("description", params.description || "");

            if (params.coverFile) {
                formData.append("cover", params.coverFile);
            }

            const xhr = new XMLHttpRequest();

            const result = await new Promise<UploadResult>((resolve, reject) => {
                xhr.upload.addEventListener("progress", (event) => {
                    if (event.lengthComputable) {
                        uploadProgress.value = Math.round((event.loaded / event.total) * 100);
                    }
                });

                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        try {
                            const body = JSON.parse(xhr.responseText).error || "Upload failed";
                            reject(new Error(body));
                        } catch {
                            reject(new Error("Upload failed"));
                        }
                    }
                });

                xhr.addEventListener("error", () => reject(new Error("Network error")));
                xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

                xhr.open(
                    "POST",
                    `${baseUrl}/api/v1/hosted/podcast/${params.podcastId}/episode`,
                );
                xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                xhr.send(formData);
            });

            return result;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Upload failed";
            uploadError.value = message;
            throw err;
        } finally {
            uploading.value = false;
        }
    }

    return {
        uploading,
        uploadProgress,
        uploadError,
        uploadEpisode,
    };
}
