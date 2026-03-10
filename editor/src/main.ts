import { createApp } from "vue";
import { createPinia } from "pinia";
// Import player theme tokens so shared components look identical
import "@player/assets/theme.scss";
import "./style.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@richpods/tiny-geojson-tool/styles";

import { addProtocol } from "maplibre-gl";
import { Protocol } from "pmtiles";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";

addProtocol("pmtiles", new Protocol().tile);

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(i18n);
app.mount("#app");
