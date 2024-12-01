// src/router/index.js
import { createRouter, createWebHashHistory } from "vue-router";
import BuildingListView from "@/views/BuildingListView.vue";
import ClassroomTableView from "@/views/ClassroomTableView.vue";
import FloorMapView from "@/views/FloorMapView.vue";

const routes = [
  {
    path: "/",
    name: "BuildingList",
    component: BuildingListView,
  },
  {
    path: "/building/:id",
    name: "ClassroomTable",
    component: ClassroomTableView,
    props: true,
  },
  {
    path: "/map",
    name: "floorMap",
    component: FloorMapView,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
