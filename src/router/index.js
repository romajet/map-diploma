// src/router/index.js
import { createRouter, createWebHashHistory } from "vue-router";
import BuildingListView from "@/views/BuildingListView.vue";
import ClassroomTableView from "@/views/ClassroomTableView.vue";

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
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
