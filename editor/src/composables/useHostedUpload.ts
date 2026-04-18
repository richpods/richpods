import { ref } from "vue";
import { auth } from "@/lib/firebase";

type UploadResult = {
    episode: { id: string };
    richPodId?: string;
};

type UploadParams = {
    podcastId: string;
    audioFile: File;
    coverFile?: File | null;
};

type UploadPolicy = {
    url: string;
    fields: Record<string, string>;
};

type CreateEpisodeResponse = {
    episodeId: string;
    gcsAudioName: string;
    uploadPolicy: UploadPolicy;
};

type ValidationResponse = {
    status: "pending" | "valid" | "invalid";
    error?: string | null;
    audioDurationSeconds?: number | null;
    audioBitrate?: number | null;
    audioSampleRate?: number | null;
    audioChannels?: number | null;
};

type CreateRichPodResponse = {
    richPodId: string;
};

const POLL_INITIAL_INTERVAL_MS = 5_000;
const POLL_INCREMENT_MS = 5_000;
const POLL_MAX_INTERVAL_MS = 30_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000;

function getApiBaseUrl(): string {
    const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT as string;
    return new URL(graphqlEndpoint).origin;
}

export function useHostedUpload() {
    const uploading = ref(false);
    const validating = ref(false);
    const uploadProgress = ref(0);
    const uploadError = ref("");

    async function getAuthToken(): Promise<string> {
        const user = auth.currentUser;
        if (!user) throw new Error("Authentication required");
        return user.getIdToken();
    }

    async function createEpisode(
        token: string,
        baseUrl: string,
        params: UploadParams,
    ): Promise<CreateEpisodeResponse> {
        const response = await fetch(
            `${baseUrl}/api/v1/hosted/podcast/${params.podcastId}/episode/create`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    audioByteSize: params.audioFile.size,
                }),
            },
        );

        if (!response.ok) {
            const body = await response.json().catch(() => ({ error: "Failed to create episode" }));
            throw new Error(body.error || "Failed to create episode");
        }

        return response.json() as Promise<CreateEpisodeResponse>;
    }

    async function uploadEpisodeCover(
        token: string,
        baseUrl: string,
        episodeId: string,
        coverFile: File,
    ): Promise<void> {
        const formData = new FormData();
        formData.append("cover", coverFile);

        const response = await fetch(`${baseUrl}/api/v1/hosted/episode/${episodeId}/cover`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({ error: "Failed to upload cover" }));
            throw new Error(body.error || "Failed to upload cover");
        }
    }

    function uploadToGcs(policy: UploadPolicy, audioFile: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    // Map GCS upload progress to 5-90% of the overall progress
                    const gcsProgress = event.loaded / event.total;
                    uploadProgress.value = Math.round(5 + gcsProgress * 85);
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`GCS upload failed with status ${xhr.status}`));
                }
            });

            xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
            xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

            const formData = new FormData();
            for (const [key, value] of Object.entries(policy.fields)) {
                formData.append(key, value);
            }
            formData.append("file", audioFile);

            xhr.open("POST", policy.url);
            xhr.send(formData);
        });
    }

    async function pollValidation(
        token: string,
        baseUrl: string,
        episodeId: string,
    ): Promise<ValidationResponse> {
        const startTime = Date.now();
        let interval = POLL_INITIAL_INTERVAL_MS;

        while (Date.now() - startTime < POLL_TIMEOUT_MS) {
            await new Promise((resolve) => setTimeout(resolve, interval));

            const response = await fetch(
                `${baseUrl}/api/v1/hosted/episode/${episodeId}/validation`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            if (!response.ok) {
                throw new Error("Failed to check validation status");
            }

            const result = (await response.json()) as ValidationResponse;

            if (result.status !== "pending") {
                return result;
            }

            // Increase interval up to the maximum
            interval = Math.min(interval + POLL_INCREMENT_MS, POLL_MAX_INTERVAL_MS);
        }

        throw new Error("Validation timed out. Please check back later.");
    }

    async function createRichPodForEpisode(
        token: string,
        baseUrl: string,
        episodeId: string,
    ): Promise<CreateRichPodResponse> {
        const response = await fetch(`${baseUrl}/api/v1/hosted/episode/${episodeId}/richpod`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({ error: "Failed to create RichPod" }));
            throw new Error(body.error || "Failed to create RichPod");
        }

        return response.json() as Promise<CreateRichPodResponse>;
    }

    async function uploadEpisode(params: UploadParams): Promise<UploadResult> {
        uploading.value = true;
        validating.value = false;
        uploadProgress.value = 0;
        uploadError.value = "";

        try {
            const token = await getAuthToken();
            const baseUrl = getApiBaseUrl();

            // Step 1: Create episode (PENDING) and get signed upload policy
            const { episodeId, uploadPolicy } = await createEpisode(token, baseUrl, params);
            uploadProgress.value = 2;

            // Step 2: Upload cover image first (if provided)
            if (params.coverFile) {
                await uploadEpisodeCover(token, baseUrl, episodeId, params.coverFile);
            }
            uploadProgress.value = 5;

            // Step 3: Upload MP3 directly to GCS via signed POST policy
            await uploadToGcs(uploadPolicy, params.audioFile);
            uploadProgress.value = 90;

            // Step 4: Poll for async validation result
            uploading.value = false;
            validating.value = true;

            const validation = await pollValidation(token, baseUrl, episodeId);

            if (validation.status === "invalid") {
                throw new Error(validation.error || "Audio file validation failed");
            }

            // Step 5: Auto-create a RichPod for the validated episode
            const { richPodId } = await createRichPodForEpisode(token, baseUrl, episodeId);

            uploadProgress.value = 100;
            return { episode: { id: episodeId }, richPodId };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Upload failed";
            uploadError.value = message;
            throw err;
        } finally {
            uploading.value = false;
            validating.value = false;
        }
    }

    return {
        uploading,
        validating,
        uploadProgress,
        uploadError,
        uploadEpisode,
    };
}
