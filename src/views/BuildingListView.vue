<!-- src/views/BuildingListView.vue -->
<template>
    <div>
        <h1>Выбрите корпус</h1>
        <BuildingList @building-selected="goToClassroomTable" />
    </div>
</template>

<script>
import BuildingList from '@/components/BuildingList.vue';

export default {
    name: 'BuildingListView',
    components: { BuildingList },
    methods: {
        goToClassroomTable(buildingId) {
            console.log('переход к аудиториям корпуса:', buildingId);
            this.$router.push({ name: 'ClassroomTable', params: { id: buildingId } });
        }
    }
};
</script>
