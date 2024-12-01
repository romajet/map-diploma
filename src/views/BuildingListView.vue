<!-- src/views/BuildingListView.vue -->
<template>
    <div>
        <!-- <h1>Таблицы</h1>
        <BuildingList @building-selected="goToClassroomTable" />
        <h1>Карта</h1> -->
        <!-- <button @click="goToMapView" class="map-button">тест карты</button> -->
        <h1>Карта</h1>
        <BuildingList @building-selected="goToMapView" />
        <h1>Таблицы</h1>
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
            this.$router.push({ name: 'ClassroomTable', params: { id: buildingId } });
        },
        // goToMapView() {
        //     this.$router.push({ name: 'floorMap' });
        // }
        goToMapView(buildingId) {
            this.$router.push({name: "floorMap", query: { korpus: buildingId, floor: 1 }});
        }
    }
};
</script>

<style scoped>
.map-button {
    width: 200px;
    height: 80px;
    padding: 20px;
    background-color: blue;
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s;
}

.map-button:hover {
    background-color: darkblue;
}
</style>
