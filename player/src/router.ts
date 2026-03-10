import { createRouter, createWebHistory } from "vue-router";
import RichPod from "@/components/RichPod.vue";

const routes = [
    {
        path: "/:id?",
        name: "RichPod",
        component: RichPod,
        props: true,
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

export default router;
