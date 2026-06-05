import { useI18n } from "vue-i18n";

export function useFormattedDate() {
    const { locale } = useI18n();

    function formatDate(dateString: string): string {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString(locale.value, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    return { formatDate };
}
