<template>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        aria-hidden="true"
        class="mime-type-icon"
    >
        <!-- image -->
        <g v-if="category === MimeCategory.IMAGE">
            <rect
                width="416"
                height="352"
                x="48"
                y="80"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="48"
                ry="48"
            />
            <circle
                cx="336"
                cy="176"
                r="32"
                fill="none"
                stroke="currentColor"
                stroke-miterlimit="10"
                stroke-width="32"
            />
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
                d="m304 335.79l-90.66-90.49a32 32 0 0 0-43.87-1.3L48 352m176 80l123.34-123.34a32 32 0 0 1 43.11-2L464 368"
            />
        </g>
        <!-- video -->
        <g v-else-if="category === MimeCategory.VIDEO">
            <rect
                width="416"
                height="320"
                x="48"
                y="96"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="80"
                height="80"
                x="384"
                y="336"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="80"
                height="80"
                x="384"
                y="256"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="80"
                height="80"
                x="384"
                y="176"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="80"
                height="80"
                x="384"
                y="96"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="80"
                height="80"
                x="48"
                y="336"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="80"
                height="80"
                x="48"
                y="256"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="80"
                height="80"
                x="48"
                y="176"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="80"
                height="80"
                x="48"
                y="96"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="256"
                height="160"
                x="128"
                y="96"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <rect
                width="256"
                height="160"
                x="128"
                y="256"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
        </g>
        <!-- audio -->
        <g v-else-if="category === MimeCategory.AUDIO">
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
                d="M192 218v-6c0-14.84 10-27 24.24-30.59l174.59-46.68A20 20 0 0 1 416 154v22"
            />
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
                d="M416 295.94v80c0 13.91-8.93 25.59-22 30l-22 8c-25.9 8.72-52-10.42-52-38h0a33.37 33.37 0 0 1 23-32l51-18.15c13.07-4.4 22-15.94 22-29.85V58a10 10 0 0 0-12.6-9.61L204 102a16.48 16.48 0 0 0-12 16v226c0 13.91-8.93 25.6-22 30l-52 18c-13.88 4.68-22 17.22-22 32h0c0 27.58 26.52 46.55 52 38l22-8c13.07-4.4 22-16.08 22-30v-80"
            />
        </g>
        <!-- pdf + document -->
        <g v-else-if="category === MimeCategory.PDF || category === MimeCategory.DOCUMENT">
            <path
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"
            />
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
                d="M256 56v120a32 32 0 0 0 32 32h120m-232 80h160m-160 80h160"
            />
        </g>
        <!-- archive -->
        <g v-else-if="category === MimeCategory.ARCHIVE">
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
                d="M80 152v256a40.12 40.12 0 0 0 40 40h272a40.12 40.12 0 0 0 40-40V152"
            />
            <rect
                width="416"
                height="80"
                x="48"
                y="64"
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                rx="28"
                ry="28"
            />
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
                d="m320 304l-64 64l-64-64m64 41.89V224"
            />
        </g>
        <!-- html -->
        <g v-else-if="category === MimeCategory.HTML">
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="36"
                d="M208 352h-64a96 96 0 0 1 0-192h64m96 0h64a96 96 0 0 1 0 192h-64m-140.71-96h187.42"
            />
        </g>
        <!-- other / unknown -->
        <g v-else>
            <path
                fill="none"
                stroke="currentColor"
                stroke-linejoin="round"
                stroke-width="32"
                d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"
            />
            <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="32"
                d="M256 56v120a32 32 0 0 0 32 32h120"
            />
        </g>
    </svg>
</template>

<script setup lang="ts">
import { MimeCategory, type MimeCategoryValue } from "@richpods/shared/media/mime";

defineProps<{
    category: MimeCategoryValue;
}>();
</script>

<style lang="scss" scoped>
.mime-type-icon {
    width: 100%;
    height: 100%;
    display: block;
}
</style>
