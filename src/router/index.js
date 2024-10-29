import { createRouter, createWebHistory } from "vue-router";
import BuildingListView from "@/views/BuildingListView.vue";
import ClassroomTableView from "@/views/ClassroomTableView.vue";
//import BuildingList from "@/components/BuildingList.vue";
//import ClassroomTable from "@/components/ClassroomTable.vue";

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
  history: createWebHistory(),
  routes,
});

export default router;
