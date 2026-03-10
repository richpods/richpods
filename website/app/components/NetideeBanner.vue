<template>
    <div class="netidee">
        <a href="https://www.netidee.at/richpodsorg" target="_blank" rel="noopener">
            <img
                src="@richpods/shared/assets/images/netidee-projekte-w1000.webp"
                alt="Netidee"
            >
            <br>
            {{ $t("netidee.supportedBy") }}
        </a>
    </div>
</template>
<script setup lang="ts">
</script>
<style lang="scss" scoped>
.netidee {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: var(--space-l) 0 var(--space-m);

    a {
        width: 50vw;
        max-width: 380px;
        text-align: center;
        color: inherit;
        font-size: var(--step--1);

        @include mq($from: lg) {
            width: 25vw;
        }

        img {
            width: 100%;
        }
    }
}
</style>