import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { auth } from "@/lib/firebase";

type UploadResponse = {
    id: string;
    richPodId: string;
    type: string;
    mimeType: string;
    byteSize: number;
    width: number;
    height: number;
    downloadUrl: string;
};

type UploadError = {
    error: string;
    details?: unknown;
};

export function useUpload() {
    const { t } = useI18n();

    const uploading = ref(false);
    const progress = ref(0);
    const error = ref<string | null>(null);

    async function uploadImage(file: File, richPodId: string): Promise<string | null> {
        uploading.value = true;
        progress.value = 0;
        error.value = null;

        try {
            const user = auth.currentUser;
            if (!user) {
                error.value = t("upload.authenticationRequired");
                return null;
            }

            const token = await user.getIdToken();

            const formData = new FormData();
            formData.append("file", file);
            formData.append("richPodId", richPodId);

            // Derive API endpoint from GraphQL endpoint
            const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || "http://localhost:4000/graphql";
            const apiUrl = graphqlEndpoint.replace(/\/graphql$/, "");
            const uploadUrl = `${apiUrl}/api/v1/upload`;

            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData: UploadError = await response.json();
                error.value = errorData.error || t("upload.uploadFailed");
                return null;
            }

            const data: UploadResponse = await response.json();
            progress.value = 100;

            // Convert relative URL to absolute URL using the API endpoint
            // Let the browser handle the redirect to GCS
            const downloadUrl = data.downloadUrl.startsWith("http")
                ? data.downloadUrl
                : `${apiUrl}${data.downloadUrl}`;

            return downloadUrl;
        } catch (err: any) {
            error.value = err.message || t("upload.uploadFailed");
            return null;
        } finally {
            uploading.value = false;
        }
    }

    function reset() {
        uploading.value = false;
        progress.value = 0;
        error.value = null;
    }

    return {
        uploading,
        progress,
        error,
        uploadImage,
        reset,
    };
}
