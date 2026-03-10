<template>
    <RipoHero>
        <h1>{{ $t("team.title") }}</h1>
        <p>
            {{ $t("team.subtitle") }}
        </p>
    </RipoHero>
    <RipoBigPicture
        :url="config.public.baseURL + '/photos/richpods-team-philipp-sonja.webp'"
        :alt="$t('team.photoAlt')"
        :sources="[
            {
                srcset: config.public.baseURL + '/photos/richpods-team-philipp-sonja-w1400.webp',
                media: '(max-width: 700px)',
                type: 'image/webp',
            },
            {
                srcset: config.public.baseURL + '/photos/richpods-team-philipp-sonja.webp',
                media: '(min-width: 700px)',
                type: 'image/webp',
            }
        ]"
        :aspect-ratio="(120/56)"
    />
    <div class="team">
        <div class="team-member">
            <h2>{{ $t("team.philippName") }}</h2>
            <p>{{ $t("team.philippBio") }}</p>
            <p>
                <RipoButton as="link" href="https://github.com/botic/" target="_blank" size="small">GitHub</RipoButton>
                <RipoButton as="link" href="https://www.linkedin.com/in/philipp-naderer-puiu-b87a0a135" target="_blank" size="small">LinkedIn</RipoButton>
            </p>
        </div>
        <div class="team-member">
            <h2>{{ $t("team.sonjaName") }}</h2>
            <p>{{ $t("team.sonjaBio") }}</p>
            <p>
                <RipoButton as="link" href="https://www.nordpost.at/" target="_blank" size="small">Nord.Post</RipoButton>
                <RipoButton as="link" href="https://www.linkedin.com/in/sonja-harter-131502217/" target="_blank" size="small">LinkedIn</RipoButton>
            </p>
        </div>
        <div class="team-member">
            <h2>{{ $t("team.lisaName") }}</h2>
            <p>{{ $t("team.lisaBio") }}</p>
            <p>
                <RipoButton as="link" href="https://www.vietzelisa.org/" target="_blank" size="small">livie grafikbüro.</RipoButton>
            </p>
        </div>
    </div>
</template>
<script setup lang="ts">
import RipoBigPicture from "~/components/RipoBigPicture.vue";

definePageMeta({
    i18n: {
        paths: {
            de: "/team",
            en: "/team",
        },
    },
});

const config = useRuntimeConfig();
const { t } = useI18n();
useHead({
   title: t("team.title")
});
</script>
<style scoped lang="scss">
.team {
    @include grid();

    h1 {
        grid-column: span 12;
    }

    h2 {
        font-size: var(--step-2);
    }

    .team-member {
        grid-column: span 4;
    }

    a + a {
        margin-left: var(--space-2xs);
    }
}
</style>
