<!-- src/views/BuildingListView.vue -->
<template>
    <div>
        <h1>Выбрите корпус</h1>
        <BuildingList @building-selected="goToClassroomTable" />
        <button @click="goToMapView" class="map-button">тест карты</button>
    </div>
</template>

<script>
import BuildingList from '@/components/BuildingList.vue';

export default {
    name: 'BuildingListView',
    components: { BuildingList },
    methods: {
        goToClassroomTable(buildingId) {
            this.$router.push({ name: 'ClassroomTable', params: { id: buildingId } });
        },
        goToMapView() {
            this.$router.push({ name: 'floorMap' });
        }
    }
};
</script>

<style scoped>
.map-button {
    margin-top: 20px;
    padding: 10px 20px;
    background-color: blue;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.map-button:hover {
    background-color: darkblue;
}
</style>
