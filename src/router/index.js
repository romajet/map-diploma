import { createRouter, createWebHistory } from 'vue-router';
import BuildingList from '@/components/BuildingList.vue';
import ClassroomTable from '@/components/ClassroomTable.vue';

const routes = [
    {
        path: '/',
        name: 'BuildingList',
        component: BuildingList
    },
    {
        path: '/building/:id',
        name: 'ClassroomTable',
        component: ClassroomTable,
        props: true
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
