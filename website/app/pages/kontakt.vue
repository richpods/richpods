<template>
    <div class="contact">
        <h1>{{ $t("contact.title") }}</h1>
        <div>
            <p>
                Philipp Naderer-Puiu<br>
                {{ $t("contact.address") }}<br>
                <client-only>{{ user }}&#64;{{ domain }}</client-only>
            </p>
            <p>
                <i18n-t keypath="contact.photos" tag="span" scope="global">
                    <template #photographer><a href="https://luizapuiu.com/">Luiza Puiu</a></template>
                </i18n-t>
            </p>
        </div>
        <h2>{{ $t("contact.privacyTitle") }}</h2>
        <div>
            <p>{{ $t("contact.privacyIntro") }}</p>
            <p>
                <i18n-t keypath="contact.privacyHosting" tag="span" scope="global">
                    <template #link><a href="https://cloud.google.com/terms/data-processing-addendum?hl=de" rel="nofollow">{{ $t("contact.privacyHostingLink") }}</a></template>
                </i18n-t>
            </p>
            <p>{{ $t("contact.privacyNoTracking") }}</p>
            <h3>{{ $t("contact.embeddedTitle") }}</h3>
            <p>{{ $t("contact.embeddedContent") }}</p>
            <h3>{{ $t("contact.inquiriesTitle") }}</h3>
            <p>{{ $t("contact.inquiriesText") }}</p>
            <p>
                <client-only>
                    <RipoButton as="link" size="small" :href="`mailto:${user}@${domain}`">{{ user }}&#64;{{ domain }}</RipoButton>
                </client-only>
            </p>
        </div>
    </div>
</template>
<script setup lang="ts">
import RipoButton from "~/components/RipoButton.vue";

definePageMeta({
    i18n: {
        paths: {
            de: "/kontakt",
            en: "/contact",
        },
    },
});

const user = "contact";
const domain = "richpods.org";
const { t } = useI18n();

useHead({
    title: t("contact.title")
});
</script>
<style scoped lang="scss">
.contact {
    @include grid();

    h1, h2, div {
        grid-column: span 12;
    }

    h2 {
        font-size: var(--step-3);
    }

    h3 {
        font-size: var(--step-1);
    }
}
</style>
