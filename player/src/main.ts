import "./assets/base.scss";
import "./assets/theme.scss";
import "maplibre-gl/dist/maplibre-gl.css";
import "@richpods/tiny-geojson-tool/styles";

import { addProtocol } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { createApp } from "vue";
import router from "./router";
import App from "./App.vue";
import i18n from "./i18n";

addProtocol("pmtiles", new Protocol().tile);

createApp(App).use(router).use(i18n).mount("#app");
