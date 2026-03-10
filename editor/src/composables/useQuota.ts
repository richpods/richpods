import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { graphqlSdk } from "@/lib/graphql";

type QuotaInfo = {
    usedBytes: number;
    totalBytes: number;
    remainingBytes: number;
    percentUsed: number;
};

const quotaInfo = ref<QuotaInfo | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

export function useQuota() {
    const { t } = useI18n();

    async function fetchQuota() {
        loading.value = true;
        error.value = null;

        try {
            const response = await graphqlSdk.GetCurrentUser();
            const user = response.currentUser;

            if (!user) {
                error.value = t("quota.userNotFound");
                quotaInfo.value = null;
                return;
            }

            const usedBytes = user.usedQuotaBytes ?? 0;
            const totalBytes = user.totalQuotaBytes ?? 0;
            const remainingBytes = Math.max(0, totalBytes - usedBytes);
            const percentUsed = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

            quotaInfo.value = {
                usedBytes,
                totalBytes,
                remainingBytes,
                percentUsed,
            };
        } catch (err: any) {
            error.value = err.message || t("quota.fetchFailed");
            quotaInfo.value = null;
        } finally {
            loading.value = false;
        }
    }

    function canUpload(fileSize: number): boolean {
        if (!quotaInfo.value) return false;
        return quotaInfo.value.remainingBytes >= fileSize;
    }

    function formatBytes(bytes: number): string {
        if (bytes === 0) return t("quota.zeroBytes");
        const k = 1024;
        const sizes = [
            t("quota.units.bytes"),
            t("quota.units.kilobytes"),
            t("quota.units.megabytes"),
            t("quota.units.gigabytes"),
        ];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
    }

    const formattedUsed = computed(() =>
        quotaInfo.value ? formatBytes(quotaInfo.value.usedBytes) : t("quota.zeroBytes"),
    );

    const formattedTotal = computed(() =>
        quotaInfo.value ? formatBytes(quotaInfo.value.totalBytes) : t("quota.zeroBytes"),
    );

    const formattedRemaining = computed(() =>
        quotaInfo.value ? formatBytes(quotaInfo.value.remainingBytes) : t("quota.zeroBytes"),
    );

    return {
        quotaInfo,
        loading,
        error,
        fetchQuota,
        canUpload,
        formatBytes,
        formattedUsed,
        formattedTotal,
        formattedRemaining,
    };
}
